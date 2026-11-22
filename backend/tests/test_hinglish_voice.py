"""The Hinglish Archivist: Roman-letter Hinglish is written in Devanagari for the offline Hindi voice, so it is read in an Indian voice, not an English one."""
import re

from app.sims import tts
from app.sims.translit import hn, to_devanagari


def test_hinglish_and_english_words_become_devanagari_with_numbers_spoken_in_hindi():
    out = to_devanagari("Aapne 13 decisions liye: 4 strong, 5 mixed aur 4 weak. Isse readiness 3 points badhi.")
    assert not re.search(r"[A-Za-z0-9]", out)
    assert "आपने" in out and "तेरह" in out and "चार" in out and "बढ़ी" in out
    assert hn(250) == "दो सौ पचास" and hn(1200).endswith("हज़ार दो सौ")


def test_words_that_are_hinglish_or_english_depending_on_context():
    assert "तो" in to_devanagari("Yeh sahi hai, to aage dekhte hain.")
    assert "टू" in to_devanagari("Move the patient to the ward.")


def test_unknown_english_words_still_get_a_reading_and_punctuation_is_kept():
    out = to_devanagari("Zorbulate the flange, then stop.")
    assert not re.search(r"[A-Za-z]", out) and "," in out and out.endswith(".")


def test_without_a_key_the_hinglish_voice_is_the_hindi_voice_reading_devanagari(monkeypatch):
    seen = {}
    monkeypatch.setattr(tts, "human_available", lambda: False)
    monkeypatch.setattr(tts, "synthesize", lambda text, voice, rate=1.0: seen.update(text=text, voice=voice) or b"wav")
    audio, kind = tts.synthesize_audio("Aapne chuna: a 330 ohm resistor", "hinglish", 1.0)
    assert (audio, kind) == (b"wav", "audio/wav")
    assert seen["voice"] == "hindi" and not re.search(r"[A-Za-z]", seen["text"])


def test_with_a_key_the_roman_text_goes_to_the_human_hinglish_voice(monkeypatch):
    seen = {}
    monkeypatch.setattr(tts, "human_available", lambda: True)
    monkeypatch.setattr(tts, "synthesize_human", lambda text, voice, rate=1.0: seen.update(text=text, voice=voice) or b"mp3")
    assert tts.synthesize_audio("Aapne chuna", "hinglish", 1.0) == (b"mp3", "audio/mpeg")
    assert seen == {"text": "Aapne chuna", "voice": "hinglish"}
