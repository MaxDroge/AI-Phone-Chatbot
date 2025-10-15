import axios from 'axios';


export class STTClient {
private partial = '';
pushAudioBase64(b64: string) {
// For simplicity, buffer locally and POST in chunks to the Python server.
// In production, use a persistent WS stream to the STT server.
axios.post('http://localhost:9009/stt', { payload: b64 }).catch(() => {});
}
getPartial() { return this.partial; }
resetPartial() { this.partial = ''; }
close() { axios.post('http://localhost:9009/flush').catch(() => {}); }
}