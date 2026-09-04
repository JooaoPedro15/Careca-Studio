import argparse
import json
import sys
from pathlib import Path
from typing import Any

import ffmpeg_utils
import srt_utils
import translate_service

MODE_LANGS = {
    "zh": ["zh"],
    "zh-en": ["zh", "en"],
    "zh-original": ["zh", "original"],
}

# Proporcao da altura do video usada como tamanho de fonte, por preset de formato.
FONT_SCALE = {
    "shorts": 0.052,
    "long": 0.040,
}

# Distancia da borda inferior do video (proporcao da altura), por preset.
BASE_MARGIN_SCALE = {
    "shorts": 0.06,
    "long": 0.05,
}

# Multiplicador de fonte usado como folga extra pro bloco de cima nao sobrepor o de baixo
# quando o bloco de baixo quebra em 2+ linhas (comum no preset "long" com maxWords=0).
TOP_MARGIN_EXTRA_LINE_FACTOR = 1.6


def emit(event: str, status: str, stage: str, message: str, **extra: Any) -> None:
    payload = {"event": event, "status": status, "stage": stage, "message": message, **extra}
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def resolve_mode_langs(mode: str) -> list[str]:
    langs = MODE_LANGS.get(mode)
    if not langs:
        raise ValueError(f"Modo de queima desconhecido: {mode}")
    return langs


def translated_srt_candidate_path(original_srt_path: str, lang: str) -> str:
    return str(Path(original_srt_path).with_suffix(f".{lang}.srt"))


def ensure_srt_for_lang(
    lang: str,
    original_srt_path: str,
    source_language: str,
    translator: "translate_service.Translator | None",
) -> str:
    if lang == "original":
        return original_srt_path

    candidate_path = translated_srt_candidate_path(original_srt_path, lang)
    if Path(candidate_path).exists():
        return candidate_path

    entries = srt_utils.parse_srt(original_srt_path)
    texts = [entry[2] for entry in entries]
    translated_texts = translator.translate_segments(texts, source_lang=source_language, target_lang=lang)

    translated_entries = [
        (start, end, translated_text)
        for (start, end, _original_text), translated_text in zip(entries, translated_texts)
    ]
    srt_utils.write_srt(translated_entries, candidate_path)

    return candidate_path


def _build_force_style(fontsize: int, margin_v: int) -> str:
    return (
        f"FontName=Arial,FontSize={fontsize},Bold=1,PrimaryColour=&H00FFFFFF,"
        f"OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV={margin_v}"
    )


def build_ffmpeg_burn_command(
    ffmpeg_path: str,
    video_path: str,
    srt_paths_top_to_bottom: list[str],
    video_height: int,
    format_profile: str,
    output_path: str,
) -> list[str]:
    fontsize = round(video_height * FONT_SCALE[format_profile])
    base_margin = round(video_height * BASE_MARGIN_SCALE[format_profile])
    top_margin_extra = round(fontsize * TOP_MARGIN_EXTRA_LINE_FACTOR)

    filters = []
    for index, srt_path in enumerate(srt_paths_top_to_bottom):
        is_top = index == 0 and len(srt_paths_top_to_bottom) > 1
        margin_v = base_margin + top_margin_extra if is_top else base_margin

        escaped_path = ffmpeg_utils.escape_path_for_subtitles_filter(srt_path)
        force_style = ffmpeg_utils.escape_force_style_value(_build_force_style(fontsize, margin_v))
        filters.append(f"subtitles='{escaped_path}':force_style='{force_style}'")

    return [
        ffmpeg_path,
        "-y",
        "-i",
        video_path,
        "-vf",
        ",".join(filters),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "19",
        "-c:a",
        "copy",
        output_path,
    ]


def run_hardsub(
    video_path: str,
    original_srt_path: str,
    source_language: str,
    mode: str,
    format_profile: str,
    output_path: str | None,
    device: str = "cuda",
    compute_type: str = "default",
) -> str:
    emit("status", "preparing", "starting", "Preparando queima de legenda...", progress=5)

    for path, label in [(video_path, "video"), (original_srt_path, "srt original")]:
        ffmpeg_utils.assert_safe_path_length(path, label)

    ffmpeg_path = ffmpeg_utils.resolve_ffmpeg_path()
    video_info = ffmpeg_utils.probe_video(video_path)

    langs = resolve_mode_langs(mode)
    needs_translation = any(
        lang != "original" and not Path(translated_srt_candidate_path(original_srt_path, lang)).exists()
        for lang in langs
    )
    translator = translate_service.Translator(device=device, compute_type=compute_type) if needs_translation else None

    srt_paths: list[str] = []
    for lang in langs:
        if lang != "original":
            emit("status", "processing", "translating", f"Verificando legenda em {lang}...", progress=20)
        srt_path = ensure_srt_for_lang(lang, original_srt_path, source_language, translator)
        # O caminho do srt entra dentro do filtro subtitles=..., o ponto mais sensivel
        # ao limite de path do Windows — usa copia em pasta curta como fallback em vez
        # de so falhar, quando o caminho original for longo demais.
        srt_path = ffmpeg_utils.ensure_short_srt_path(srt_path)
        srt_paths.append(srt_path)

    output = output_path or str(Path(video_path).with_suffix("")) + f".hardsub.{mode}{Path(video_path).suffix}"
    ffmpeg_utils.assert_safe_path_length(output, "video de saida")

    command = build_ffmpeg_burn_command(ffmpeg_path, video_path, srt_paths, video_info.height, format_profile, output)

    emit("status", "processing", "burning", "Queimando legenda no video...", progress=40)

    def on_progress(percent: int) -> None:
        scaled = 40 + int(percent * 0.6)
        emit("status", "processing", "burning", f"Queimando legenda... {percent}%", progress=min(99, scaled))

    ffmpeg_utils.run_ffmpeg_with_progress(command, video_info.duration_sec, on_progress)

    emit("done", "completed", "done", "Video com legenda queimada gerado.", progress=100, outputPath=output)

    return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="SubtitleForge hardsub service")
    parser.add_argument("--video", required=True)
    parser.add_argument("--original-srt", required=True)
    parser.add_argument("--source-language", required=True)
    parser.add_argument("--mode", required=True, choices=sorted(MODE_LANGS.keys()))
    parser.add_argument("--format", required=True, choices=sorted(FONT_SCALE.keys()))
    parser.add_argument("--output", default=None)
    parser.add_argument("--cpu", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    device = "cpu" if args.cpu else "cuda"
    compute_type = "int8" if args.cpu else "default"

    try:
        run_hardsub(
            video_path=args.video,
            original_srt_path=args.original_srt,
            source_language=args.source_language,
            mode=args.mode,
            format_profile=args.format,
            output_path=args.output,
            device=device,
            compute_type=compute_type,
        )
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr, flush=True)
        emit("error", "error", "runtime", "Falha ao queimar legenda no video.", error=str(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
