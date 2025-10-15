import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { twiml as TwiML } from 'twilio';
import { WebSocketServer } from 'ws';
import { createMediaStreamServer } from './stream.js';


const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// 1) Twilio answers the phone call and connects media stream to our WS endpoint
app.post('/voice/incoming', (req, res) => {
const response = new TwiML.VoiceResponse();
response.connect().stream({ url: `${process.env.PUBLIC_URL}/media-stream` });
// Fallback greeting while media stream spins up (rarely spoken)
response.say({ voice: 'Polly.Joanna' }, 'Connecting you to our assistant.');
res.type('text/xml').send(response.toString());
});


// 2) Health check
app.get('/health', (_, res) => res.json({ ok: true }));


// 3) Start HTTP + WS for Twilio Media Streams
const server = app.listen(process.env.PORT || 8080, () => {
console.log('Server listening on', process.env.PORT || 8080);
});


createMediaStreamServer(server, '/media-stream');