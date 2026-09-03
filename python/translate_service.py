from pathlib import Path
from typing import Any

# Repositorio HuggingFace com o NLLB-200-distilled-600M ja convertido para CTranslate2.
MODEL_REPO = "michaelfeil/ct2fast-nllb-200-distilled-600M"

# Mapeia codigos curtos usados na UI/whisper para o codigo FLORES-200 esperado pelo NLLB.
LANGUAGE_TO_FLORES = {
    "pt": "por_Latn",
    "en": "eng_Latn",
    "zh": "zho_Hans",
    "es": "spa_Latn",
    "fr": "fra_Latn",
    "de": "deu_Latn",
    "it": "ita_Latn",
    "ja": "jpn_Jpan",
    "ko": "kor_Hang",
    "ru": "rus_Cyrl",
}


def resolve_flores_code(language: str) -> str:
    code = LANGUAGE_TO_FLORES.get(language.lower())
    if not code:
        raise ValueError(f"Idioma sem mapeamento FLORES-200 conhecido: {language}")
    return code


class Translator:
    """Traduz lotes de texto via NLLB-200 (ctranslate2). Carregamento do modelo e lazy."""

    def __init__(self, device: str = "cuda", compute_type: str = "default"):
        self._device = device
        self._compute_type = compute_type
        self._translator: Any = None
        self._tokenizer: Any = None

    def _ensure_loaded(self) -> None:
        if self._translator is not None:
            return

        import ctranslate2
        import sentencepiece as spm
        from huggingface_hub import snapshot_download

        model_dir = snapshot_download(MODEL_REPO)
        self._translator = ctranslate2.Translator(
            model_dir,
            device=self._device,
            compute_type=self._compute_type,
        )
        self._tokenizer = spm.SentencePieceProcessor()
        self._tokenizer.load(str(Path(model_dir) / "sentencepiece.bpe.model"))

    def translate_segments(self, texts: list[str], source_lang: str, target_lang: str) -> list[str]:
        if not texts:
            return []

        source_code = resolve_flores_code(source_lang)
        target_code = resolve_flores_code(target_lang)

        self._ensure_loaded()

        source_tokens = [[source_code, *self._tokenizer.encode(text, out_type=str)] for text in texts]
        target_prefix = [[target_code] for _ in texts]

        results = self._translator.translate_batch(source_tokens, target_prefix=target_prefix)

        translated: list[str] = []
        for result in results:
            tokens = result.hypotheses[0][1:]  # remove o token de idioma alvo
            translated.append(self._tokenizer.decode(tokens).strip())

        return translated
