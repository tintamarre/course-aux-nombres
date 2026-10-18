"""Generate one audio clip per sentence of the game with the Piper voice fr_FR-siwis-medium.

Usage (from the repository root):
    npx tsx scripts/list-phrases.ts > scripts/audio/phrases.json
    uv run --project scripts/audio scripts/audio/generate.py

Writes public/audio/siwis/<hash>.mp3 and src/data/audio-manifest.json (sentence -> file).
Requires ffmpeg. The voice model is downloaded once into scripts/audio/.voices (not committed).
Voice: SIWIS French Speech Synthesis Database, University of Edinburgh, CC BY 4.0.
"""

import hashlib
import json
import subprocess
import tempfile
import urllib.request
import wave
from pathlib import Path

from piper import PiperVoice
from piper.config import SynthesisConfig

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
VOICE = "fr_FR-siwis-medium"
BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/medium"
OUT = ROOT / "public" / "audio" / "siwis"
MANIFEST = ROOT / "src" / "data" / "audio-manifest.json"
# slightly slower than normal, validated by ear for 5-8 year olds
SYNTH = SynthesisConfig(length_scale=1.1)


def model_path() -> Path:
    folder = HERE / ".voices"
    folder.mkdir(exist_ok=True)
    for name in (f"{VOICE}.onnx", f"{VOICE}.onnx.json"):
        target = folder / name
        if not target.exists():
            print(f"downloading {name}…")
            urllib.request.urlretrieve(f"{BASE}/{name}", target)
    return folder / f"{VOICE}.onnx"


def clip_name(text: str) -> str:
    # named after the text actually synthesised, so a pronunciation fix gets a new file name
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12] + ".mp3"


def main() -> None:
    # sentence -> text to synthesise (same sentence, with pronunciation fixes)
    phrases: dict[str, str] = json.loads((HERE / "phrases.json").read_text(encoding="utf-8"))
    voice = PiperVoice.load(str(model_path()))
    OUT.mkdir(parents=True, exist_ok=True)
    clips: dict[str, str] = {}
    with tempfile.TemporaryDirectory() as tmp:
        for i, (text, spoken) in enumerate(phrases.items(), 1):
            name = clip_name(spoken)
            wav = Path(tmp) / "clip.wav"
            with wave.open(str(wav), "wb") as wf:
                voice.synthesize_wav(spoken, wf, syn_config=SYNTH)
            # trim the silence Piper leaves around the sentence (tight counting rhythm),
            # keep a few ms so that nothing is cut, then encode a small mono mp3
            subprocess.run(
                [
                    "ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                    "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,"
                    "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,"
                    "afade=t=in:d=0.005",
                    "-ac", "1", "-ar", "22050", "-b:a", "48k", str(OUT / name),
                ],
                check=True,
            )
            clips[text] = name
            print(f"{i:3}/{len(phrases)}  {text}")
    # remove clips of sentences that no longer exist
    for old in OUT.glob("*.mp3"):
        if old.name not in clips.values():
            old.unlink()
    MANIFEST.write_text(
        json.dumps(
            {
                "voice": VOICE,
                "base": "audio/siwis/",
                "credit": "Voix : Piper fr_FR-siwis-medium, SIWIS French Speech Synthesis Database (University of Edinburgh), CC BY 4.0",
                "clips": clips,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"{len(clips)} clips -> {OUT.relative_to(ROOT)}, manifest -> {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
