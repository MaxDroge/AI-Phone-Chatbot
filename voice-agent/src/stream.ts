import { WebSocketServer } from 'ws';
import { STTClient } from './stt/sttClient.js';
import { llmAnswer } from './llmOpenRouter.js';
import { piperSpeak } from './audio/ttsPiper.js';
import { search } from './rag/search.js';


export function createMediaStreamServer(server: HTTPServer, path: string) {
const wss = new WebSocketServer({ server, path });


wss.on('connection', (ws) => {
console.log('Twilio Media Stream connected');


const stt = new STTClient();
let speaking = false;
let currentUtterance = '';


ws.on('message', async (msg) => {
const evt = JSON.parse(msg.toString());
// Twilio events: media (audio), mark, start, stop
if (evt.event === 'media') {
const audioBase64 = evt.media.payload; // 20ms mu-law PCM 8kHz
stt.pushAudioBase64(audioBase64);
const partial = stt.getPartial();
if (partial && partial.endsWith('?')) {
// naive end-of-utterance heuristic
currentUtterance = partial;
await handleUserTurn(currentUtterance);
stt.resetPartial();
}
}
if (evt.event === 'stop') {
stt.close();
}
});


async function handleUserTurn(text: string) {
if (!text || speaking) return;
speaking = true;
console.log('User:', text);


// Retrieve relevant site chunks (RAG)
const context = search(text, 5);


// Ask LLM to answer concisely, cite pages verbally when helpful
const answer = await llmAnswer(text, context);
console.log('Bot:', answer);


// Convert to speech and stream back to Twilio
for await (const chunk of piperSpeak(answer)) {
ws.send(JSON.stringify({
event: 'media',
media: { payload: chunk } // base64 mulaw 8k
}));
}
// mark end of speech
ws.send(JSON.stringify({ event: 'mark', mark: 'done' }));
speaking = false;
}
});
}