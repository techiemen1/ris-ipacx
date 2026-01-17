from vosk import Model, KaldiRecognizer
from flask import Flask, request
import json

app = Flask(__name__)
model = Model("vosk-model")

@app.post("/stt")
def stt():
    rec = KaldiRecognizer(model, 16000)
    audio = request.data

    if rec.AcceptWaveform(audio):
        result = json.loads(rec.Result())
        return {"text": result.get("text", "")}
    else:
        partial = json.loads(rec.PartialResult())
        return {"text": partial.get("partial", "")}

app.run(host="0.0.0.0", port=5001)
