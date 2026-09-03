import importlib.util
import sys
import types
import unittest
from dataclasses import dataclass
from pathlib import Path


def load_subtitle_service():
    sys.modules["faster_whisper"] = types.SimpleNamespace(WhisperModel=object)
    module_path = Path(__file__).with_name("subtitle_service.py")
    spec = importlib.util.spec_from_file_location("subtitle_service_for_test", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


@dataclass
class WordInfo:
    word: str
    start: float
    end: float


class NaturalSubtitleSegmentationTest(unittest.TestCase):
    def setUp(self):
        self.service = load_subtitle_service()

    def make_words(self, words: list[str], step: float = 0.25) -> list[WordInfo]:
        return [WordInfo(word=word, start=index * step, end=(index + 1) * step) for index, word in enumerate(words)]

    def segment_text(self, segments) -> list[str]:
        return [" ".join(word.word.strip() for word in segment) for segment in segments]

    def test_pulls_next_word_when_target_would_end_on_weak_word(self):
        words = self.make_words("eu tenho que pegar aquela chave ali".split())

        segments = self.service.segment_words_naturally(words, target_words=3)

        self.assertEqual(
            self.segment_text(segments),
            ["eu tenho que pegar", "aquela chave ali"],
        )

    def test_avoids_lonely_tail_word_when_previous_block_can_absorb_it(self):
        words = self.make_words("pegar aquela chave ali".split())

        segments = self.service.segment_words_naturally(words, target_words=3)

        self.assertEqual(self.segment_text(segments), ["pegar aquela chave ali"])


class TranscribeVideoTranslationTest(unittest.TestCase):
    def setUp(self):
        self.service = load_subtitle_service()

    def test_translate_to_writes_extra_srt_files_and_emits_events(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp_dir:
            input_path = Path(tmp_dir) / "video.mp4"
            input_path.write_bytes(b"fake")

            @dataclass
            class FakeSegment:
                start: float
                end: float
                text: str
                words: list

            fake_segments = [FakeSegment(start=0.0, end=1.0, text="ola mundo", words=[])]
            fake_info = types.SimpleNamespace(language="pt", language_probability=0.99, duration=1.0)

            class FakeWhisperModel:
                def __init__(self, *args, **kwargs):
                    pass

                def transcribe(self, *args, **kwargs):
                    return fake_segments, fake_info

            self.service.WhisperModel = FakeWhisperModel

            captured_calls = []

            class FakeTranslator:
                def __init__(self, device, compute_type):
                    pass

                def translate_segments(self, texts, source_lang, target_lang):
                    captured_calls.append((tuple(texts), source_lang, target_lang))
                    return [f"[{target_lang}] {text}" for text in texts]

            self.service.translate_service.Translator = FakeTranslator

            output_path = self.service.transcribe_video(
                input_path=str(input_path),
                translate_to=["en", "zh"],
            )

            en_path = Path(output_path).with_suffix(".en.srt")
            zh_path = Path(output_path).with_suffix(".zh.srt")

            self.assertTrue(en_path.exists())
            self.assertTrue(zh_path.exists())
            self.assertIn("[en] ola mundo", en_path.read_text(encoding="utf-8"))
            self.assertIn("[zh] ola mundo", zh_path.read_text(encoding="utf-8"))
            self.assertEqual(
                captured_calls,
                [(("ola mundo",), "pt", "en"), (("ola mundo",), "pt", "zh")],
            )

    def test_translation_failure_does_not_break_main_transcription(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp_dir:
            input_path = Path(tmp_dir) / "video.mp4"
            input_path.write_bytes(b"fake")

            @dataclass
            class FakeSegment:
                start: float
                end: float
                text: str
                words: list

            fake_segments = [FakeSegment(start=0.0, end=1.0, text="ola mundo", words=[])]
            fake_info = types.SimpleNamespace(language="pt", language_probability=0.99, duration=1.0)

            class FakeWhisperModel:
                def __init__(self, *args, **kwargs):
                    pass

                def transcribe(self, *args, **kwargs):
                    return fake_segments, fake_info

            self.service.WhisperModel = FakeWhisperModel

            class FailingTranslator:
                def __init__(self, device, compute_type):
                    pass

                def translate_segments(self, texts, source_lang, target_lang):
                    raise RuntimeError("sem internet")

            self.service.translate_service.Translator = FailingTranslator

            output_path = self.service.transcribe_video(
                input_path=str(input_path),
                translate_to=["en"],
            )

            self.assertTrue(Path(output_path).exists())
            en_path = Path(output_path).with_suffix(".en.srt")
            self.assertFalse(en_path.exists())


if __name__ == "__main__":
    unittest.main()
