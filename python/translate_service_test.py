import importlib.util
import sys
import types
import unittest
from pathlib import Path


class FakeTranslationResult:
    def __init__(self, tokens: list[str]):
        self.hypotheses = [tokens]


class FakeTranslator:
    """Simula ctranslate2.Translator: devolve o texto de entrada com um marcador."""

    def __init__(self, model_dir, device=None, compute_type=None):
        self.model_dir = model_dir
        self.device = device
        self.compute_type = compute_type

    def translate_batch(self, source, target_prefix):
        results = []
        for tokens, prefix in zip(source, target_prefix):
            # tokens = [source_lang_code, *words]; devolve [target_lang_code, *TRANSLATED:words]
            words = tokens[1:]
            translated = [f"TRANSLATED:{word}" for word in words]
            results.append(FakeTranslationResult(prefix + translated))
        return results


class FakeSentencePieceProcessor:
    def load(self, path):
        self.path = path

    def encode(self, text, out_type=str):
        return text.split()

    def decode(self, tokens):
        return " ".join(tokens)


def load_translate_service(tmp_model_dir: str):
    fake_ctranslate2 = types.SimpleNamespace(Translator=FakeTranslator)
    fake_sentencepiece = types.SimpleNamespace(SentencePieceProcessor=FakeSentencePieceProcessor)
    fake_huggingface_hub = types.SimpleNamespace(snapshot_download=lambda repo_id: tmp_model_dir)

    sys.modules["ctranslate2"] = fake_ctranslate2
    sys.modules["sentencepiece"] = fake_sentencepiece
    sys.modules["huggingface_hub"] = fake_huggingface_hub

    module_path = Path(__file__).with_name("translate_service.py")
    spec = importlib.util.spec_from_file_location("translate_service_for_test", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class TranslateSegmentsTest(unittest.TestCase):
    def setUp(self):
        self.service = load_translate_service(tmp_model_dir="/fake/model/dir")

    def test_translates_batch_preserving_order(self):
        translator = self.service.Translator(device="cpu", compute_type="default")

        result = translator.translate_segments(
            ["ola mundo", "tudo bem"],
            source_lang="pt",
            target_lang="en",
        )

        self.assertEqual(result, ["TRANSLATED:ola TRANSLATED:mundo", "TRANSLATED:tudo TRANSLATED:bem"])

    def test_empty_input_returns_empty_list_without_loading_model(self):
        translator = self.service.Translator(device="cpu", compute_type="default")

        result = translator.translate_segments([], source_lang="pt", target_lang="en")

        self.assertEqual(result, [])
        self.assertIsNone(translator._translator)

    def test_unknown_language_code_raises_clear_error(self):
        translator = self.service.Translator(device="cpu", compute_type="default")

        with self.assertRaises(ValueError):
            translator.translate_segments(["oi"], source_lang="xx", target_lang="en")


if __name__ == "__main__":
    unittest.main()
