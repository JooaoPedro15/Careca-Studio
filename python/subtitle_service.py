import argparse
import json
import math
import re
import sys
import time
import unicodedata
from pathlib import Path
from typing import Any

try:
    from faster_whisper import WhisperModel
except ImportError as error:
    payload = {
        "event": "error",
        "status": "error",
        "stage": "bootstrap",
        "message": "faster-whisper nao instalado.",
        "error": str(error),
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)
    sys.exit(1)


DEFAULT_MODEL = "large-v3"
DEFAULT_LANGUAGE = "pt"
DEFAULT_BEAM_SIZE = 5
DEFAULT_MAX_LINE_WIDTH = 42


# Emite eventos JSON no stdout para o Electron acompanhar o progresso em tempo real.
def emit(event: str, status: str, stage: str, message: str, **extra: Any) -> None:
    payload = {
        "event": event,
        "status": status,
        "stage": stage,
        "message": message,
        **extra,
    }
    print(json.dumps(payload, ensure_ascii=False), flush=True)


# Converte segundos para o formato padrao do arquivo .srt.
def format_timestamp(seconds: float) -> str:
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    milliseconds = math.floor((secs % 1) * 1000)
    return f"{int(hours):02}:{int(minutes):02}:{int(secs):02},{milliseconds:03}"


# Helpers de limpeza de texto aplicados antes de salvar a legenda final.
def remove_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def remove_punctuation(text: str) -> str:
    return re.sub(r"[^\w\s]", "", text)


def clean_text(text: str, no_accents: bool = False, no_punctuation: bool = False) -> str:
    if no_punctuation:
        text = remove_punctuation(text)
    if no_accents:
        text = remove_accents(text)
    return re.sub(r"\s+", " ", text).strip()


# Quebra a fala em linhas menores para melhorar a leitura do subtitulo.
def split_text_into_lines(text: str, max_width: int) -> str:
    words = text.split()
    lines: list[str] = []
    current_line = ""

    for word in words:
        if current_line and len(current_line) + 1 + len(word) > max_width:
            lines.append(current_line)
            current_line = word
        else:
            current_line = f"{current_line} {word}".strip()

    if current_line:
        lines.append(current_line)

    return "\n".join(lines)


# Gera um progresso aproximado mesmo quando o Whisper ainda nao terminou tudo.
def estimate_progress(segment_end: float | None, total_duration: float | None, segment_count: int) -> int:
    if total_duration and total_duration > 0 and segment_end is not None:
        return min(96, max(50, 50 + math.floor((segment_end / total_duration) * 44)))

    return min(96, 50 + math.floor(segment_count / 5))


# Fluxo principal: carrega o modelo, transcreve, formata e grava o .srt.
def transcribe_video(
    input_path: str,
    model_size: str = DEFAULT_MODEL,
    language: str = DEFAULT_LANGUAGE,
    beam_size: int = DEFAULT_BEAM_SIZE,
    max_line_width: int = DEFAULT_MAX_LINE_WIDTH,
    max_words: int = 0,
    word_timestamps: bool = True,
    device: str = "cuda",
    compute_type: str = "float16",
    output_path: str | None = None,
    uppercase: bool = False,
    lowercase: bool = False,
    no_accents: bool = False,
    no_punctuation: bool = False,
) -> str:
    input_file = Path(input_path)

    if not input_file.exists():
        emit(
            "error",
            "error",
            "input",
            "Arquivo nao encontrado.",
            error=f"Arquivo nao encontrado: {input_path}",
        )
        raise FileNotFoundError(input_path)

    if output_path is None:
        output_file = input_file.with_suffix(".srt")
    else:
        output_file = Path(output_path)

    emit(
        "status",
        "preparing",
        "starting",
        "Inicializando SubtitleForge...",
        progress=5,
        outputPath=str(output_file),
    )
    emit(
        "status",
        "preparing",
        "loading-model",
        f"Carregando modelo {model_size}...",
        progress=12,
    )

    load_started_at = time.time()
    model = WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
    )
    load_time = round(time.time() - load_started_at, 1)

    emit(
        "status",
        "preparing",
        "model-ready",
        f"Modelo carregado em {load_time}s.",
        progress=28,
        loadTimeSec=load_time,
    )
    emit(
        "status",
        "processing",
        "transcribing",
        "Transcrevendo audio...",
        progress=42,
    )

    transcribe_started_at = time.time()
    segments, info = model.transcribe(
        str(input_file),
        beam_size=beam_size,
        language=language,
        word_timestamps=word_timestamps,
        vad_filter=True,
        vad_parameters={
            "min_silence_duration_ms": 300,
        },
    )

    detected_language = getattr(info, "language", language)
    language_probability = getattr(info, "language_probability", None)
    total_duration = getattr(info, "duration", None)

    probability_text = f"{language_probability:.1%}" if isinstance(language_probability, (int, float)) else "--"

    emit(
        "status",
        "processing",
        "language-detected",
        f"Idioma detectado: {detected_language} ({probability_text}).",
        progress=50,
        detectedLanguage=detected_language,
        languageProbability=language_probability,
    )

    srt_content: list[str] = []
    segment_count = 0

    for segment in segments:
        if max_words > 0 and word_timestamps and segment.words:
            # Neste modo, usa timestamps por palavra para fatiar legendas por quantidade maxima de palavras.
            words_buffer = []
            for word_info in segment.words:
                words_buffer.append(word_info)
                if len(words_buffer) >= max_words:
                    segment_count += 1
                    sub_start = format_timestamp(words_buffer[0].start)
                    sub_end = format_timestamp(words_buffer[-1].end)
                    text = " ".join(word.word.strip() for word in words_buffer)
                    text = clean_text(text, no_accents, no_punctuation)
                    if uppercase:
                        text = text.upper()
                    elif lowercase:
                        text = text.lower()

                    srt_content.append(f"{segment_count}")
                    srt_content.append(f"{sub_start} --> {sub_end}")
                    srt_content.append(text)
                    srt_content.append("")
                    words_buffer = []

            if words_buffer:
                segment_count += 1
                sub_start = format_timestamp(words_buffer[0].start)
                sub_end = format_timestamp(words_buffer[-1].end)
                text = " ".join(word.word.strip() for word in words_buffer)
                text = clean_text(text, no_accents, no_punctuation)
                if uppercase:
                    text = text.upper()
                elif lowercase:
                    text = text.lower()

                srt_content.append(f"{segment_count}")
                srt_content.append(f"{sub_start} --> {sub_end}")
                srt_content.append(text)
                srt_content.append("")

            segment_end = getattr(segment, "end", None)
        else:
            # Sem max_words, cada segmento do Whisper vira uma entrada do .srt.
            segment_count += 1
            text = segment.text.strip()
            text = clean_text(text, no_accents, no_punctuation)
            if uppercase:
                text = text.upper()
            elif lowercase:
                text = text.lower()
            text = split_text_into_lines(text, max_line_width)

            srt_content.append(f"{segment_count}")
            srt_content.append(f"{format_timestamp(segment.start)} --> {format_timestamp(segment.end)}")
            srt_content.append(text)
            srt_content.append("")

            segment_end = getattr(segment, "end", None)

        if segment_count == 1 or segment_count % 25 == 0:
            # Emite checkpoints periodicos para a UI nao ficar "morta" durante arquivos longos.
            emit(
                "status",
                "processing",
                "segments",
                f"{segment_count} segmentos processados.",
                progress=estimate_progress(segment_end, total_duration, segment_count),
                processedSegments=segment_count,
            )

    transcribe_time = round(time.time() - transcribe_started_at, 1)

    emit(
        "status",
        "processing",
        "writing",
        "Gravando arquivo .srt...",
        progress=97,
        processedSegments=segment_count,
        totalSegments=segment_count,
        outputPath=str(output_file),
    )

    with open(output_file, "w", encoding="utf-8") as file_handle:
        file_handle.write("\n".join(srt_content))

    emit(
        "done",
        "completed",
        "done",
        "Transcricao concluida.",
        progress=100,
        outputPath=str(output_file),
        processedSegments=segment_count,
        totalSegments=segment_count,
        durationSec=transcribe_time,
        detectedLanguage=detected_language,
    )

    return str(output_file)


# Define a interface CLI usada pelo processo principal do Electron.
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Careca Studio Subtitle service")
    parser.add_argument("input", help="Caminho do video ou audio")
    parser.add_argument("-o", "--output", default=None)
    parser.add_argument("-m", "--model", default=DEFAULT_MODEL)
    parser.add_argument("-l", "--language", default=DEFAULT_LANGUAGE)
    parser.add_argument("-b", "--beam-size", type=int, default=DEFAULT_BEAM_SIZE)
    parser.add_argument("-w", "--max-width", type=int, default=DEFAULT_MAX_LINE_WIDTH)
    parser.add_argument("--uppercase", action="store_true")
    parser.add_argument("--lowercase", action="store_true")
    parser.add_argument("--no-accents", action="store_true")
    parser.add_argument("--no-punctuation", action="store_true")
    parser.add_argument("--max-words", type=int, default=0)
    parser.add_argument("--cpu", action="store_true")
    return parser.parse_args()


# Configura device/compute type e transforma excecoes em saidas previsiveis para o Electron.
def main() -> int:
    args = parse_args()
    device = "cpu" if args.cpu else "cuda"
    compute_type = "int8" if args.cpu else "float16"

    try:
        transcribe_video(
            input_path=args.input,
            model_size=args.model,
            language=args.language,
            beam_size=args.beam_size,
            max_line_width=args.max_width,
            max_words=args.max_words,
            device=device,
            compute_type=compute_type,
            output_path=args.output,
            uppercase=args.uppercase,
            lowercase=args.lowercase,
            no_accents=args.no_accents,
            no_punctuation=args.no_punctuation,
        )
        return 0
    except FileNotFoundError:
        return 1
    except KeyboardInterrupt:
        emit(
            "error",
            "error",
            "cancelled",
            "Processo interrompido.",
            error="Processo interrompido.",
        )
        return 130
    except Exception as error:
        print(str(error), file=sys.stderr, flush=True)
        emit(
            "error",
            "error",
            "runtime",
            "Falha durante a transcricao.",
            error=str(error),
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

