from faster_whisper import WhisperModel
from flask import Flask, request, jsonify
import base64
import audioop


app = Flask(__name__)
model = WhisperModel("base", device="cpu", compute_type="int8")
buffer = b''


@app.post('/stt')
def stt_push():
global buffer
b64 = request.json.get('payload')
ulaw = base64.b64decode(b64)
# convert mu-law 8k to linear16 16k for Whisper
lin16 = audioop.ulaw2lin(ulaw, 2)
lin16_16k, _ = audioop.ratecv(lin16, 2, 1, 8000, 16000, None)
buffer += lin16_16k
return jsonify(ok=True)


@app.post('/flush')
def flush():
global buffer
segments, _ = model.transcribe(buffer, language="en", vad_filter=True)
text = " ".join([seg.text for seg in segments])
buffer = b''
return jsonify(text=text)


if __name__ == '__main__':
app.run(host='0.0.0.0', port=9009)