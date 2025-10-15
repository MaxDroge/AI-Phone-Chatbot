import { spawn } from 'child_process';
import { Readable } from 'stream';


// Assumes you have a Piper server or CLI available. Here we shell out to CLI for simplicity.
// We also transcode to 8kHz mu-law base64 frames for Twilio.
export async function* piperSpeak(text: string) {
const voice = process.env.PIPER_VOICE || 'en_US-amy-low';
// Generate raw WAV at 16k; you can also run Piper in server mode and fetch /synthesize
const proc = spawn('piper', ['-m', voice, '-t', text, '-f', '-']);


const chunks: Buffer[] = [];
for await (const c of proc.stdout) chunks.push(Buffer.from(c));
const wav = Buffer.concat(chunks);
const pcm16 = stripWavToPCM16(wav);
const ulaw = linear16ToMuLaw(pcm16);


const frame = 160; // 20ms at 8kHz
for (let i = 0; i < ulaw.length; i += frame) {
const slice = ulaw.subarray(i, i + frame);
yield Buffer.from(slice).toString('base64');
}
}


function stripWavToPCM16(wav: Buffer) {
// naive: skip 44-byte header; adjust if different
return wav.subarray(44);
}


function linear16ToMuLaw(pcm16: Buffer) {
const out = Buffer.alloc(Math.floor(pcm16.length / 2));
for (let i = 0, j = 0; i < pcm16.length; i += 2, j++) {
const sample = pcm16.readInt16LE(i);
out[j] = linear16ToMuLawSample(sample);
}
return out;
}


function linear16ToMuLawSample(sample: number) {
// G.711 μ-law conversion (simplified)
const BIAS = 0x84; const CLIP = 32635;
let s = Math.max(-CLIP, Math.min(CLIP, sample));
const sign = (s < 0) ? 0x7f : 0xff;
if (s < 0) s = -s;
s += BIAS;
let exponent = 7; for (let expMask = 0x4000; (s & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
const mantissa = (s >> ((exponent === 0) ? 4 : (exponent + 3))) & 0x0f;
return sign ^ ((exponent << 4) | mantissa);
}