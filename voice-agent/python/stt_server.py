from faster_whisper import WhisperModel
from flask import Flask, request, jsonify
import base64
import audioop

app = Flask(__name__)
model = WhisperModel("base", device="cpu", compute_type="int8")
AUDIO_BUFFER = b''

@app.post('/stt')
def stt_push():
    global AUDIO_BUFFER
    payload = request.json.get('payload')
    if not payload:
        return jsonify(ok=False, error="missing payload"), 400
    try:
        ulaw = base64.b64decode(payload)
        lin16 = audioop.ulaw2lin(ulaw, 2)
        lin16_16k, _ = audioop.ratecv(lin16, 2, 1, 8000, 16000, None)
        AUDIO_BUFFER += lin16_16k
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 500

@app.post('/flush')
def flush():
    global AUDIO_BUFFER
    if not AUDIO_BUFFER:
        return jsonify(text="")
    segments, _ = model.transcribe(AUDIO_BUFFER, language="en", vad_filter=True)
    text = " ".join(seg.text for seg in segments)
    AUDIO_BUFFER = b""
    return jsonify(text=text)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9009)
