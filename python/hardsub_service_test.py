import sys
import types
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
import hardsub_service  # noqa: E402


FAKE_VIDEO_INFO = types.SimpleNamespace(duration_sec=10.0, width=1920, height=1080)


class ResolveModeLangsTest(unittest.TestCase):
    def test_zh_mode_is_single_language(self):
        self.assertEqual(hardsub_service.resolve_mode_langs("zh"), ["zh"])

    def test_zh_en_mode_stacks_zh_on_top(self):
        self.assertEqual(hardsub_service.resolve_mode_langs("zh-en"), ["zh", "en"])

    def test_zh_original_mode_stacks_zh_on_top(self):
        self.assertEqual(hardsub_service.resolve_mode_langs("zh-original"), ["zh", "original"])

    def test_unknown_mode_raises(self):
        with self.assertRaises(ValueError):
            hardsub_service.resolve_mode_langs("xx")


class EnsureSrtForLangTest(unittest.TestCase):
    def test_original_lang_returns_original_path_unchanged(self):
        result = hardsub_service.ensure_srt_for_lang(
            lang="original",
            original_srt_path="C:/videos/clip.srt",
            source_language="pt",
            translator=None,
        )

        self.assertEqual(result, "C:/videos/clip.srt")

    def test_existing_translated_srt_is_reused_without_translating(self):
        with mock.patch("hardsub_service.Path") as mock_path_cls:
            mock_path_cls.return_value.exists.return_value = True
            mock_path_cls.return_value.with_suffix.return_value = "C:/videos/clip.zh.srt"

            translator = mock.Mock()
            result = hardsub_service.ensure_srt_for_lang(
                lang="zh",
                original_srt_path="C:/videos/clip.srt",
                source_language="pt",
                translator=translator,
            )

            translator.translate_segments.assert_not_called()
            self.assertEqual(result, "C:/videos/clip.zh.srt")

    def test_missing_translated_srt_is_generated_on_demand(self):
        import tempfile

        with tempfile.TemporaryDirectory() as tmp_dir:
            original_path = Path(tmp_dir) / "clip.srt"
            original_path.write_text(
                "1\n00:00:00,000 --> 00:00:01,000\nola mundo\n\n",
                encoding="utf-8",
            )

            translator = mock.Mock()
            translator.translate_segments.return_value = ["hello world"]

            result = hardsub_service.ensure_srt_for_lang(
                lang="en",
                original_srt_path=str(original_path),
                source_language="pt",
                translator=translator,
            )

            expected_path = Path(tmp_dir) / "clip.en.srt"
            self.assertEqual(result, str(expected_path))
            self.assertTrue(expected_path.exists())
            self.assertIn("hello world", expected_path.read_text(encoding="utf-8"))
            translator.translate_segments.assert_called_once_with(
                ["ola mundo"], source_lang="pt", target_lang="en"
            )


class BuildFfmpegBurnCommandTest(unittest.TestCase):
    def test_single_language_uses_one_subtitles_filter(self):
        args = hardsub_service.build_ffmpeg_burn_command(
            ffmpeg_path="ffmpeg",
            video_path="C:/videos/clip.mp4",
            srt_paths_top_to_bottom=["C:/videos/clip.zh.srt"],
            video_height=1080,
            format_profile="long",
            output_path="C:/videos/clip.hardsub.zh.mp4",
        )

        joined = " ".join(args)
        self.assertIn("-vf", args)
        self.assertEqual(joined.count("subtitles="), 1)
        self.assertIn("clip.hardsub.zh.mp4", args[-1])

    def test_dual_language_chains_two_subtitles_filters_with_different_marginv(self):
        args = hardsub_service.build_ffmpeg_burn_command(
            ffmpeg_path="ffmpeg",
            video_path="C:/videos/clip.mp4",
            srt_paths_top_to_bottom=["C:/videos/clip.zh.srt", "C:/videos/clip.en.srt"],
            video_height=1080,
            format_profile="long",
            output_path="C:/videos/clip.hardsub.zh-en.mp4",
        )

        vf_index = args.index("-vf")
        filter_value = args[vf_index + 1]

        self.assertEqual(filter_value.count("subtitles="), 2)
        margins = [
            int(part.split("=")[1].rstrip("'"))
            for part in filter_value.split(",")
            if "MarginV" in part
        ]
        self.assertEqual(len(margins), 2)
        self.assertGreater(margins[0], margins[1])  # top tem MarginV maior que o de baixo


if __name__ == "__main__":
    unittest.main()
