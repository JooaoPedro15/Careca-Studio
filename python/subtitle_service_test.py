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


if __name__ == "__main__":
    unittest.main()
