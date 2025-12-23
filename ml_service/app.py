from flask import Flask, request, jsonify
import whisper
from phonemizer import phonemize
import Levenshtein
import tempfile
import os

app = Flask(__name__)
model = whisper.load_model("base")

LETTER_PHONEMES = {
    "a": "eɪ",
    "b": "biː",
    "c": "siː",
    "d": "diː",
    "e": "iː"
    # add rest later
}

def phoneme_similarity(p1, p2):
    return 1 - Levenshtein.distance(p1, p2) / max(len(p1), len(p2))

@app.route("/analyze", methods=["POST"])
def analyze():
    audio = request.files["audio"]
    letter = request.form["letter"]

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        audio.save(f.name)
        audio_path = f.name

    result = model.transcribe(audio_path)
    spoken_text = result["text"].strip().lower()

    spoken_phonemes = phonemize(spoken_text, language="en-us")
    expected_phoneme = LETTER_PHONEMES.get(letter, "")

    score = phoneme_similarity(spoken_phonemes, expected_phoneme)
    correct = score >= 0.7

    os.remove(audio_path)

    return jsonify({
        "spokenText": spoken_text,
        "phonemeScore": score,
        "correct": correct
    })

if __name__ == "__main__":
    app.run(port=6000)
