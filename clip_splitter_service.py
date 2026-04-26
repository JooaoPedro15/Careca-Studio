import argparse
import contextlib
import hashlib
import importlib.util
import io
import json
import math
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


# Emite eventos JSON padronizados no stdout para o processo principal do Electron.
def emit(event: str, status: str, stage: str, message: str, **extra: Any) -> None:
    payload = {
        "event": event,
        "status": status,
        "stage": stage,
        "message": message,
        **extra,
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)


# Resolve onde esta o projeto externo que contem FFmpeg, Whisper e a engine base.
def resolve_clip_splitter_root(explicit_root: str | None) -> Path:
    candidates = [
        explicit_root,
        str(Path.cwd() / "../Clip-Splitter"),
        "D:\\Projetos\\Clip-Splitter",
        "D:\\Projetos\\clip-splitter",
    ]

    for candidate in candidates:
        if not candidate:
            continue
        root = Path(candidate).resolve()
        if (root / "clip_splitter.py").exists():
            return root

    raise FileNotFoundError("Projeto Clip-Splitter nao encontrado.")


# Carrega dinamicamente o modulo principal do projeto Clip-Splitter.
def load_clip_splitter_module(root: Path):
    module_path = root / "clip_splitter.py"
    spec = importlib.util.spec_from_file_location("careca_clip_splitter_ext", module_path)
    if not spec or not spec.loader:
        raise RuntimeError("Nao foi possivel carregar clip_splitter.py")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


EPSILON = 0.05
SILENCE_START_RE = re.compile(r"silence_start:\s*(-?\d+(?:\.\d+)?)")
SILENCE_END_RE = re.compile(r"silence_end:\s*(-?\d+(?:\.\d+)?)")
FEEDBACK_LABEL_PRIORITY = {"viral": 3, "good": 2, "weak": 1}


# Mantem as duracoes em um intervalo seguro antes de planejar os cortes.
def normalize_duration_settings(
    target_duration_sec: float,
    min_duration_sec: float,
    max_duration_sec: float,
) -> tuple[float, float, float]:
    min_duration = max(5.0, float(min_duration_sec))
    max_duration = max(min_duration + 1.0, float(max_duration_sec))
    target_duration = min(max(float(target_duration_sec), min_duration), max_duration)
    return target_duration, min_duration, max_duration


# Limpa e ordena partes vindas de analises externas antes de exportar.
def sanitize_parts(parts: list[dict], total_duration: float) -> list[dict]:
    sanitized: list[dict] = []

    for part in parts:
        try:
            start = max(0.0, float(part.get("inicio", 0.0)))
            end = min(total_duration, float(part.get("fim", total_duration)))
        except (TypeError, ValueError):
            continue

        if end - start < 0.2:
            continue

        sanitized.append(
            {
                "inicio": round(start, 3),
                "fim": round(end, 3),
                "motivo": str(part.get("motivo", "")).strip() or "Parte exportada.",
            }
        )

    sanitized.sort(key=lambda item: item["inicio"])
    return sanitized


# Remove pontos muito proximos, fora dos limites ou redundantes.
def dedupe_cut_points(points: list[float], total_duration: float) -> list[float]:
    normalized: list[float] = []

    for point in sorted(points):
        point = round(max(0.0, min(total_duration, float(point))), 3)
        if point <= EPSILON or point >= total_duration - EPSILON:
            continue
        if normalized and abs(normalized[-1] - point) < 0.25:
            continue
        normalized.append(point)

    return normalized


def extract_preferred_cut_points(parts: list[dict], total_duration: float) -> list[float]:
    return dedupe_cut_points([float(part["fim"]) for part in parts], total_duration)


def collect_segment_cut_points(
    segments: list[dict],
    total_duration: float,
    silence_min_duration_sec: float,
) -> list[float]:
    # Extrai pausas entre segmentos de fala como candidatos naturais de corte.
    points: list[float] = []

    for index, segment in enumerate(segments):
        try:
            segment_end = float(segment["end"])
        except (KeyError, TypeError, ValueError):
            continue

        try:
            next_start = (
                float(segments[index + 1]["start"])
                if index + 1 < len(segments)
                else total_duration
            )
        except (KeyError, TypeError, ValueError):
            next_start = total_duration

        pause_duration = max(0.0, next_start - segment_end)
        if pause_duration >= silence_min_duration_sec:
            points.append(segment_end + pause_duration / 2)

    return dedupe_cut_points(points, total_duration)


# Usa FFmpeg + silencedetect para encontrar pausas reais no audio original.
def detect_audio_silence_cut_points(
    module: Any,
    audio_path: str,
    total_duration: float,
    silence_threshold_db: float,
    silence_min_duration_sec: float,
) -> list[float]:
    command = [
        module.FFMPEG,
        "-hide_banner",
        "-nostats",
        "-i",
        audio_path,
        "-af",
        f"silencedetect=n={silence_threshold_db}dB:d={silence_min_duration_sec}",
        "-f",
        "null",
        "-",
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except Exception:
        return []

    combined_output = "\n".join(filter(None, [result.stdout, result.stderr]))
    if not combined_output:
        return []

    points: list[float] = []
    current_silence_start: float | None = None

    for line in combined_output.splitlines():
        start_match = SILENCE_START_RE.search(line)
        if start_match:
            current_silence_start = float(start_match.group(1))
            continue

        end_match = SILENCE_END_RE.search(line)
        if not end_match:
            continue

        silence_end = float(end_match.group(1))
        if current_silence_start is not None and silence_end >= current_silence_start:
            points.append((current_silence_start + silence_end) / 2)
        else:
            points.append(silence_end)
        current_silence_start = None

    return dedupe_cut_points(points, total_duration)


# Escolhe o melhor corte dentro da janela atual priorizando IA, pausas naturais e limites.
def choose_cut_point(
    current_start: float,
    total_duration: float,
    target_duration_sec: float,
    min_duration_sec: float,
    max_duration_sec: float,
    candidate_cut_points: list[float],
    preferred_cut_points: list[float],
) -> tuple[float, str]:
    remaining = total_duration - current_start
    if remaining <= max_duration_sec:
        return total_duration, "Ultima parte."

    min_end = current_start + min_duration_sec
    max_end = current_start + max_duration_sec
    split_friendly_max_end = min(max_end, total_duration - min_duration_sec)

    if split_friendly_max_end < min_end:
        return total_duration, "Ultima parte ajustada para nao sobrar um trecho curto."

    target_end = min(max(current_start + target_duration_sec, min_end), split_friendly_max_end)

    preferred_candidates = [
        point for point in preferred_cut_points if min_end <= point <= split_friendly_max_end
    ]
    if preferred_candidates:
        chosen = min(preferred_candidates, key=lambda point: abs(point - target_end))
        return chosen, "Corte guiado pela IA com validacao local."

    natural_candidates = [
        point for point in candidate_cut_points if min_end <= point <= split_friendly_max_end
    ]
    if natural_candidates:
        chosen = min(natural_candidates, key=lambda point: abs(point - target_end))
        return chosen, "Corte em pausa natural da fala."

    return target_end, "Janela ajustada automaticamente para respeitar minimo e maximo."


# Monta uma sequencia continua de partes cobrindo o video inteiro sem deixar buracos.
def build_contiguous_parts(
    total_duration: float,
    target_duration_sec: float,
    min_duration_sec: float,
    max_duration_sec: float,
    candidate_cut_points: list[float] | None = None,
    preferred_cut_points: list[float] | None = None,
) -> list[dict]:
    if total_duration <= 0.2:
        return []

    candidate_cut_points = candidate_cut_points or []
    preferred_cut_points = preferred_cut_points or []
    parts: list[dict] = []
    cursor = 0.0
    part_number = 1

    while cursor < total_duration - EPSILON:
        end, reason = choose_cut_point(
            cursor,
            total_duration,
            target_duration_sec,
            min_duration_sec,
            max_duration_sec,
            candidate_cut_points,
            preferred_cut_points,
        )

        if end <= cursor + EPSILON:
            end = min(total_duration, cursor + max(min_duration_sec, target_duration_sec))
            reason = "Janela ajustada automaticamente para evitar corte vazio."

        parts.append(
            {
                "parte": part_number,
                "inicio": round(cursor, 3),
                "fim": round(end, 3),
                "motivo": reason,
            }
        )
        cursor = end
        part_number += 1

    return parts


# Modo fixo reaproveita o motor continuo sem candidatos especiais de silencio.
def build_fixed_parts(
    total_duration: float,
    target_duration_sec: float,
    min_duration_sec: float,
    max_duration_sec: float,
) -> list[dict]:
    return build_contiguous_parts(
        total_duration,
        target_duration_sec,
        min_duration_sec,
        max_duration_sec,
    )


# Modo por silencio tenta alinhar cortes nas pausas naturais da fala.
def build_silence_parts(
    segments: list[dict],
    total_duration: float,
    target_duration_sec: float,
    min_duration_sec: float,
    max_duration_sec: float,
    silence_min_duration_sec: float,
    silence_cut_points: list[float],
) -> list[dict]:
    return build_contiguous_parts(
        total_duration,
        target_duration_sec,
        min_duration_sec,
        max_duration_sec,
        candidate_cut_points=silence_cut_points
        or collect_segment_cut_points(segments, total_duration, silence_min_duration_sec),
    )


# Helpers para resumir texto e gerar ids estaveis dos clipes.
def truncate_text(text: str, limit: int) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: max(0, limit - 3)].rstrip() + "..."


def make_clip_id(source_path: str, start_sec: float, end_sec: float) -> str:
    stable_key = f"{Path(source_path).resolve()}|{round(start_sec, 3)}|{round(end_sec, 3)}"
    return hashlib.sha1(stable_key.encode("utf-8")).hexdigest()[:16]


def build_transcript_snippet(segments: list[dict], start_sec: float, end_sec: float, limit: int = 320) -> str:
    collected: list[str] = []

    for segment in segments:
        try:
            segment_start = float(segment.get("start", 0.0))
            segment_end = float(segment.get("end", 0.0))
        except (TypeError, ValueError):
            continue

        if segment_end <= start_sec or segment_start >= end_sec:
            continue

        text = str(segment.get("text", "")).strip()
        if not text:
            continue

        collected.append(text)
        if len(" ".join(collected)) >= limit:
            break

    snippet = truncate_text(" ".join(collected), limit)
    return snippet or "Sem trecho de fala identificado."


# Carrega o historico de feedback salvo pelo usuario e indexa por clipId.
def load_feedback_examples(feedback_file: str | None) -> tuple[list[dict], dict[str, dict]]:
    if not feedback_file:
        return [], {}

    feedback_path = Path(feedback_file)
    if not feedback_path.exists():
        return [], {}

    try:
        payload = json.loads(feedback_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return [], {}

    entries = payload.get("clips", []) if isinstance(payload, dict) else []
    if not isinstance(entries, list):
        return [], {}

    normalized: list[dict] = []
    by_id: dict[str, dict] = {}

    for raw_entry in entries:
        if not isinstance(raw_entry, dict):
            continue

        label = str(raw_entry.get("label", "")).strip().lower()
        clip_id = str(raw_entry.get("clipId", "")).strip()
        if label not in FEEDBACK_LABEL_PRIORITY or not clip_id:
            continue

        try:
            start_sec = float(raw_entry.get("startSec", 0.0))
            end_sec = float(raw_entry.get("endSec", 0.0))
            duration_sec = float(raw_entry.get("durationSec", max(0.0, end_sec - start_sec)))
        except (TypeError, ValueError):
            continue

        entry = {
            "clipId": clip_id,
            "label": label,
            "sourcePath": str(raw_entry.get("sourcePath", "")).strip(),
            "sourceName": str(raw_entry.get("sourceName", "")).strip(),
            "filePath": str(raw_entry.get("filePath", "")).strip(),
            "fileName": str(raw_entry.get("fileName", "")).strip(),
            "startSec": round(start_sec, 3),
            "endSec": round(end_sec, 3),
            "durationSec": round(duration_sec, 3),
            "reason": str(raw_entry.get("reason", "")).strip(),
            "transcriptSnippet": truncate_text(str(raw_entry.get("transcriptSnippet", "")).strip(), 320),
            "updatedAt": int(raw_entry.get("updatedAt", 0) or 0),
        }

        normalized.append(entry)
        by_id[clip_id] = entry

    normalized.sort(
        key=lambda item: (
            FEEDBACK_LABEL_PRIORITY.get(str(item["label"]), 0),
            int(item.get("updatedAt", 0)),
        ),
        reverse=True,
    )
    return normalized, by_id


# Seleciona os exemplos mais relevantes para ajudar a IA a escolher novos cortes.
def select_feedback_examples(feedback_entries: list[dict], target_duration_sec: float) -> list[dict]:
    def sort_key(item: dict) -> tuple[int, float, int]:
        return (
            FEEDBACK_LABEL_PRIORITY.get(str(item["label"]), 0),
            -abs(float(item.get("durationSec", target_duration_sec)) - target_duration_sec),
            int(item.get("updatedAt", 0)),
        )

    positives = sorted(
        [item for item in feedback_entries if item.get("label") in {"viral", "good"}],
        key=sort_key,
        reverse=True,
    )[:4]
    negatives = sorted(
        [item for item in feedback_entries if item.get("label") == "weak"],
        key=sort_key,
        reverse=True,
    )[:2]
    return positives + negatives


def format_feedback_examples(feedback_examples: list[dict]) -> str:
    if not feedback_examples:
        return "Nenhum exemplo salvo."

    lines: list[str] = []
    for example in feedback_examples:
        label = str(example.get("label", "")).upper()
        duration_sec = float(example.get("durationSec", 0.0))
        reason = truncate_text(str(example.get("reason", "")).strip(), 140) or "Sem motivo salvo."
        snippet = truncate_text(str(example.get("transcriptSnippet", "")).strip(), 220) or "Sem trecho salvo."
        lines.append(
            f"- [{label}] {duration_sec:.0f}s | motivo: {reason} | trecho: {snippet}"
        )

    return "\n".join(lines)


def summarize_cut_candidates(points: list[float], limit: int = 28) -> str:
    if not points:
        return "Nenhum candidato natural detectado."

    if len(points) <= limit:
        selected = points
    else:
        step = max(1, math.floor(len(points) / limit))
        selected = [points[index] for index in range(0, len(points), step)][:limit]

    return "\n".join(f"- {point:.1f}s" for point in selected)


def build_timeline_digest(segments: list[dict], total_duration: float, max_windows: int = 12) -> str:
    if not segments:
        return "Sem segmentos de fala disponiveis."

    window_count = max(1, min(max_windows, math.ceil(total_duration / 300)))
    window_size = max(30.0, total_duration / window_count)
    lines: list[str] = []

    for window_index in range(window_count):
        start_sec = window_index * window_size
        end_sec = min(total_duration, start_sec + window_size)
        collected: list[str] = []

        for segment in segments:
            try:
                segment_start = float(segment.get("start", 0.0))
                segment_end = float(segment.get("end", 0.0))
            except (TypeError, ValueError):
                continue

            if segment_end <= start_sec or segment_start >= end_sec:
                continue

            text = str(segment.get("text", "")).strip()
            if not text:
                continue

            collected.append(text)
            if len(" ".join(collected)) >= 220:
                break

        if not collected:
            continue

        lines.append(
            f"- {int(start_sec)}s-{int(end_sec)}s: {truncate_text(' '.join(collected), 220)}"
        )

    return "\n".join(lines) if lines else "Sem resumo temporal disponivel."


# Chama o Gemini e exige JSON puro para transformar a resposta em pontos de corte.
def request_gemini_json(module: Any, prompt: str) -> dict:
    api_key = str(getattr(module, "GEMINI_API_KEY", "") or "").strip()
    models = list(getattr(module, "GEMINI_MODELS", []) or [])
    if not api_key or not models:
        raise RuntimeError("Gemini indisponivel ou sem modelos configurados.")

    summarize_error = getattr(module, "_resumir_erro_gemini", None)
    requests_api = getattr(module, "requests", None)
    if requests_api is None:
        raise RuntimeError("Biblioteca requests indisponivel no Clip-Splitter.")

    last_error = "Gemini nao retornou resposta valida."

    for model_name in models:
        try:
            response = requests_api.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=(15, 90),
            )
        except Exception as error:
            last_error = f"erro de conexao: {error}"
            break

        if response.status_code != 200:
            if callable(summarize_error):
                last_error = str(summarize_error(response))
            else:
                last_error = f"HTTP {response.status_code}"
            continue

        try:
            response_payload = response.json()
            text = response_payload["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError, ValueError, TypeError):
            last_error = "resposta inesperada do Gemini"
            continue

        text = text.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            last_error = "Gemini retornou JSON invalido"

    raise RuntimeError(last_error)


# Usa memoria local + contexto temporal para pedir cortes preferenciais a IA.
def analyze_cut_points_with_feedback(
    module: Any,
    segments: list[dict],
    total_duration: float,
    target_duration_sec: float,
    min_duration_sec: float,
    max_duration_sec: float,
    silence_cut_points: list[float],
    feedback_examples: list[dict],
) -> list[float]:
    if not feedback_examples:
        return []

    selected_examples = select_feedback_examples(feedback_examples, target_duration_sec)
    if not selected_examples:
        return []

    desired_points = max(2, min(18, math.ceil(total_duration / max(target_duration_sec, 1.0))))
    timeline_digest = build_timeline_digest(segments, total_duration)
    feedback_digest = format_feedback_examples(selected_examples)
    candidate_points_digest = summarize_cut_candidates(silence_cut_points)

    print(
        f"3/4 Definindo cortes com Gemini + memoria local ({len(selected_examples)} exemplo(s) aproveitado(s))..."
    )

    prompt = f"""Voce e um editor especializado em reels, shorts e TikTok.

TAREFA:
Escolha PONTOS DE CORTE preferenciais para um video longo. O software local depois vai montar as partes finais.

OBJETIVO DE PERFORMANCE:
- priorizar ganchos fortes
- terminar logo apos reacao, revelacao, tensao, pergunta ou payoff parcial
- evitar trechos mornos, introducoes longas e finais sem curiosidade
- distribuir bons pontos ao longo do video inteiro, nao apenas no comeco

REGRAS FIXAS:
- cada clip final ficara entre {min_duration_sec:.0f}s e {max_duration_sec:.0f}s
- a duracao alvo e {target_duration_sec:.0f}s
- prefira pausas naturais da fala
- nao escolha ponto no meio de uma frase importante
- use os exemplos VIRAL/BOM como padrao do que imitar
- use os exemplos WEAK como padrao do que evitar

MEMORIA LOCAL DE PERFORMANCE:
{feedback_digest}

CANDIDATOS NATURAIS DE CORTE:
{candidate_points_digest}

MAPA TEMPORAL DO VIDEO:
{timeline_digest}

Retorne APENAS JSON valido, sem markdown, no formato:
{{
  "cut_points": [
    {{
      "time": 245.5,
      "motivo": "explica por que este ponto tem gancho e respeita o ritmo"
    }}
  ]
}}

Escolha no maximo {desired_points} pontos de corte.
"""

    response_payload = request_gemini_json(module, prompt)
    raw_cut_points = response_payload.get("cut_points", []) if isinstance(response_payload, dict) else []
    if not isinstance(raw_cut_points, list):
        raise RuntimeError("Gemini nao retornou cut_points validos.")

    cut_points: list[float] = []
    for cut_point in raw_cut_points:
        if not isinstance(cut_point, dict):
            continue
        try:
            cut_points.append(float(cut_point.get("time")))
        except (TypeError, ValueError):
            continue

    normalized = dedupe_cut_points(cut_points, total_duration)
    if not normalized:
        raise RuntimeError("Gemini nao retornou pontos de corte aproveitaveis.")

    print(f"   ✓ {len(normalized)} pontos de corte definidos com memoria local")
    return normalized


# Construi a lista final de clipes para a UI, incluindo feedback salvo anteriormente.
def build_clip_exports(
    source_path: str,
    output_dir: Path,
    base_name: str,
    parts: list[dict],
    segments: list[dict],
    feedback_by_id: dict[str, dict],
) -> list[dict]:
    clips: list[dict] = []

    for part in parts:
        number = str(part["parte"]).zfill(2)
        start_sec = float(part["inicio"])
        end_sec = float(part["fim"])
        file_name = f"{base_name}_parte{number}.mp4"
        file_path = str(output_dir / file_name)
        clip_id = make_clip_id(source_path, start_sec, end_sec)
        saved_feedback = feedback_by_id.get(clip_id, {})

        clips.append(
            {
                "clipId": clip_id,
                "index": int(part["parte"]),
                "filePath": file_path,
                "fileName": file_name,
                "startSec": round(start_sec, 3),
                "endSec": round(end_sec, 3),
                "durationSec": round(end_sec - start_sec, 3),
                "reason": str(part.get("motivo", "")).strip() or "Parte exportada.",
                "transcriptSnippet": build_transcript_snippet(segments, start_sec, end_sec),
                "feedbackLabel": saved_feedback.get("label"),
                "feedbackUpdatedAt": saved_feedback.get("updatedAt"),
            }
        )

    return clips


# Exporta cada parte usando copy de audio/video para acelerar a geracao dos arquivos.
def export_parts(module: Any, video_path: str, output_dir: Path, base_name: str, parts: list[dict]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    for part in parts:
        number = str(part["parte"]).zfill(2)
        start = float(part["inicio"])
        end = float(part["fim"])
        duration = max(0.05, end - start)
        output_file = output_dir / f"{base_name}_parte{number}.mp4"

        module.executar_ffmpeg_com_progresso(
            [
                module.FFMPEG,
                "-y",
                "-ss",
                str(start),
                "-i",
                video_path,
                "-t",
                str(duration),
                # Preserva o stream de video e todas as faixas de audio do original.
                "-map",
                "0:v?",
                "-map",
                "0:a?",
                "-c:v",
                "copy",
                "-c:a",
                "copy",
                str(output_file),
            ],
            f"Exportando parte {number}",
        )


# Captura stdout de funcoes do modulo externo sem perder os logs para analise.
def run_and_capture_stdout(fn: Any, *args: Any, **kwargs: Any) -> tuple[Any, str]:
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        result = fn(*args, **kwargs)
    output = buffer.getvalue()
    return result, output


# Ajusta o runtime do Whisper para CPU ou GPU antes da transcricao.
def configure_whisper_runtime(module: Any, force_cpu: bool) -> tuple[str, str]:
    device = "cpu" if force_cpu else str(getattr(module, "WHISPER_DEVICE", "cuda"))
    compute_type = "int8" if force_cpu else str(getattr(module, "WHISPER_COMPUTE", "float16"))
    module.WHISPER_DEVICE = device
    module.WHISPER_COMPUTE = compute_type
    return device, compute_type


# Interface CLI usada pelo processo principal do Electron para iniciar o runner.
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Careca Studio Clip Splitter service")
    parser.add_argument("input", help="Caminho do video")
    parser.add_argument("-o", "--output", default=None)
    parser.add_argument("--project-root", default=None)
    parser.add_argument("--mode", choices=["fixed", "silence"], default="silence")
    parser.add_argument("--target-duration", type=float, default=35.0)
    parser.add_argument("--min-duration", type=float, default=20.0)
    parser.add_argument("--max-duration", type=float, default=50.0)
    parser.add_argument("--silence-threshold-db", type=float, default=-35.0)
    parser.add_argument("--silence-min-duration", type=float, default=0.45)
    parser.add_argument("--feedback-file", default=None)
    parser.add_argument("--cpu", action="store_true")
    parser.add_argument("--no-ai", action="store_true")
    return parser.parse_args()


# Orquestra todo o pipeline: probe, audio, transcricao, planejamento e exportacao.
def main() -> int:
    args = parse_args()
    started_at = time.time()
    input_file = Path(args.input)

    if not input_file.exists():
        emit("error", "error", "input", "Arquivo nao encontrado.", error=f"Arquivo nao encontrado: {args.input}")
        return 1

    try:
        project_root = resolve_clip_splitter_root(args.project_root)
        emit("status", "preparing", "bootstrap", "Carregando engine do Clip-Splitter...", progress=5)
        module = load_clip_splitter_module(project_root)
        whisper_device, whisper_compute = configure_whisper_runtime(module, args.cpu)
    except Exception as error:
        emit("error", "error", "bootstrap", "Falha ao carregar engine do Clip-Splitter.", error=str(error))
        return 1

    output_dir = Path(args.output) if args.output else input_file.parent / f"{input_file.stem}_partes"
    temp_dir = input_file.parent

    try:
        target_duration_sec, min_duration_sec, max_duration_sec = normalize_duration_settings(
            args.target_duration,
            args.min_duration,
            args.max_duration,
        )
        silence_min_duration_sec = max(0.1, float(args.silence_min_duration))
        silence_threshold_db = float(args.silence_threshold_db)

        module.MIN_PART_DURATION = max(5, int(math.floor(min_duration_sec)))
        module.MAX_PART_DURATION = max(module.MIN_PART_DURATION + 1, int(math.ceil(max_duration_sec)))
        ai_requested = not args.no_ai
        ai_used = False if args.no_ai else None
        fallback_reason: str | None = None

        emit(
            "status",
            "preparing",
            "probing",
            "Lendo duracao do video...",
            progress=10,
            outputDir=str(output_dir),
            aiRequested=ai_requested,
            aiUsed=ai_used,
            fallbackReason=fallback_reason,
            transcriptionDevice=whisper_device,
            transcriptionComputeType=whisper_compute,
        )
        total_duration = float(module.get_duracao(str(input_file)))

        emit(
            "status",
            "preparing",
            "extracting-audio",
            "Extraindo audio temporario...",
            progress=18,
            outputDir=str(output_dir),
            sourceDurationSec=total_duration,
            aiRequested=ai_requested,
            aiUsed=ai_used,
            fallbackReason=fallback_reason,
            transcriptionDevice=whisper_device,
            transcriptionComputeType=whisper_compute,
        )
        audio_path = module.extrair_audio(str(input_file), str(temp_dir))

        emit(
            "status",
            "processing",
            "transcribing",
            "Transcrevendo audio com Whisper em CPU..." if whisper_device == "cpu" else "Transcrevendo audio com Whisper...",
            progress=34,
            outputDir=str(output_dir),
            sourceDurationSec=total_duration,
            aiRequested=ai_requested,
            aiUsed=ai_used,
            fallbackReason=fallback_reason,
            transcriptionDevice=whisper_device,
            transcriptionComputeType=whisper_compute,
        )
        segments = module.transcrever(audio_path)
        feedback_examples, feedback_by_id = load_feedback_examples(args.feedback_file)
        silence_cut_points = dedupe_cut_points(
            detect_audio_silence_cut_points(
                module,
                audio_path,
                total_duration,
                silence_threshold_db,
                silence_min_duration_sec,
            )
            + collect_segment_cut_points(segments, total_duration, silence_min_duration_sec),
            total_duration,
        )

        emit(
            "status",
            "processing",
            "planning",
            "Definindo melhores cortes...",
            progress=56,
            outputDir=str(output_dir),
            sourceDurationSec=total_duration,
            aiRequested=ai_requested,
            aiUsed=ai_used,
            fallbackReason=fallback_reason,
        )

        if args.mode == "fixed":
            # No modo fixo a IA nao escolhe contexto; o corte segue apenas a janela configurada.
            if ai_requested:
                ai_used = False
                fallback_reason = "Modo fixo exporta por janela constante e nao usa IA de contexto."
            parts = build_fixed_parts(
                total_duration,
                target_duration_sec,
                min_duration_sec,
                max_duration_sec,
            )
        elif args.no_ai:
            # Sem IA, usa somente heuristicas locais baseadas em silencio e segmentos.
            fallback_reason = "IA desativada manualmente nas configuracoes."
            parts = build_silence_parts(
                segments,
                total_duration,
                target_duration_sec,
                min_duration_sec,
                max_duration_sec,
                silence_min_duration_sec,
                silence_cut_points,
            )
        else:
            # Com IA ativa, tenta primeiro usar exemplos locais e depois cai para a analise externa padrao.
            ai_cut_points: list[float] = []
            used_feedback_memory = False

            if feedback_examples:
                try:
                    ai_cut_points = analyze_cut_points_with_feedback(
                        module,
                        segments,
                        total_duration,
                        target_duration_sec,
                        min_duration_sec,
                        max_duration_sec,
                        silence_cut_points,
                        feedback_examples,
                    )
                    if ai_cut_points:
                        ai_used = True
                        used_feedback_memory = True
                except Exception as feedback_error:
                    print(f"   Aviso: memoria local nao conseguiu orientar os cortes ({feedback_error})", flush=True)

            if not ai_cut_points:
                # Se nao houver memoria local suficiente, usa a analise original do projeto externo.
                raw_parts, analysis_logs = run_and_capture_stdout(module.analisar_cortes, segments, total_duration)
                normalized_logs = analysis_logs.lower()

                if "usando corte por silencio" in normalized_logs or "gemini indisponivel" in normalized_logs:
                    ai_used = False
                    if "gemini indisponivel" in normalized_logs:
                        fallback_reason = "Gemini indisponivel ou sem chave configurada."
                    elif "aviso:" in normalized_logs:
                        fallback_reason = "Gemini falhou e o motor caiu para corte local."
                    else:
                        fallback_reason = "Motor caiu para corte local por indisponibilidade da IA."
                elif "partes definidas" in normalized_logs:
                    ai_used = True

                for line in analysis_logs.splitlines():
                    cleaned = line.strip()
                    if cleaned:
                        print(cleaned, flush=True)

                sanitized_ai_parts = sanitize_parts(raw_parts, total_duration)
                if ai_used is None and sanitized_ai_parts:
                    ai_used = True
                if ai_used:
                    ai_cut_points = extract_preferred_cut_points(sanitized_ai_parts, total_duration)

            if used_feedback_memory and not fallback_reason:
                fallback_reason = None

            parts = build_contiguous_parts(
                total_duration,
                target_duration_sec,
                min_duration_sec,
                max_duration_sec,
                candidate_cut_points=silence_cut_points,
                preferred_cut_points=ai_cut_points,
            )

        if not parts:
            raise RuntimeError("Nenhuma parte valida foi gerada pela analise.")

        clip_exports = build_clip_exports(
            str(input_file),
            output_dir,
            input_file.stem,
            parts,
            segments,
            feedback_by_id,
        )

        emit(
            "status",
            "processing",
            "planning-done",
            f"{len(parts)} partes planejadas para exportacao.",
            progress=70,
            outputDir=str(output_dir),
            sourceDurationSec=total_duration,
            totalClips=len(parts),
            aiRequested=ai_requested,
            aiUsed=ai_used,
            fallbackReason=fallback_reason,
            transcriptionDevice=whisper_device,
            transcriptionComputeType=whisper_compute,
        )

        for index, part in enumerate(parts, start=1):
            emit(
                "status",
                "processing",
                "exporting",
                f"Exportando parte {index}/{len(parts)}...",
                progress=min(96, 72 + math.floor((index - 1) / len(parts) * 22)),
                outputDir=str(output_dir),
                sourceDurationSec=total_duration,
                totalClips=len(parts),
                clipsCreated=index - 1,
                aiRequested=ai_requested,
                aiUsed=ai_used,
                fallbackReason=fallback_reason,
                transcriptionDevice=whisper_device,
                transcriptionComputeType=whisper_compute,
            )

            export_parts(module, str(input_file), output_dir, input_file.stem, [part])

            emit(
                "status",
                "processing",
                "exporting",
                f"Parte {index}/{len(parts)} concluida.",
                progress=min(96, 72 + math.floor(index / len(parts) * 22)),
                outputDir=str(output_dir),
                sourceDurationSec=total_duration,
                totalClips=len(parts),
                clipsCreated=index,
                aiRequested=ai_requested,
                aiUsed=ai_used,
                fallbackReason=fallback_reason,
                transcriptionDevice=whisper_device,
                transcriptionComputeType=whisper_compute,
            )

        try:
            Path(audio_path).unlink(missing_ok=True)
        except Exception:
            pass

        emit(
            "done",
            "completed",
            "done",
            f"{len(parts)} partes exportadas com sucesso.",
            progress=100,
            outputDir=str(output_dir),
            sourceDurationSec=total_duration,
            totalClips=len(parts),
            clipsCreated=len(parts),
            durationSec=round(time.time() - started_at, 1),
            aiRequested=ai_requested,
            aiUsed=ai_used,
            fallbackReason=fallback_reason,
            clips=clip_exports,
            transcriptionDevice=whisper_device,
            transcriptionComputeType=whisper_compute,
        )
        return 0
    except Exception as error:
        emit(
            "error",
            "error",
            "processing",
            "Falha ao processar o clip splitter.",
            error=str(error),
            outputDir=str(output_dir),
            aiRequested=not args.no_ai,
            transcriptionDevice=whisper_device,
            transcriptionComputeType=whisper_compute,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
