import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PIPER_BIN =
  process.env.PIPER_BIN ||
  'C:/Users/maxd/OneDrive/Documents/GitHub/AI-Phone-Chatbot/.venv/Scripts/piper.exe';

// Use FULL PATH to your .onnx model (recommended: set PIPER_VOICE in .env)
const MODEL_PATH =
  process.env.PIPER_VOICE ||
  'C:/Users/maxd/OneDrive/Documents/GitHub/AI-Phone-Chatbot/voice-agent/en_US-lessac-medium.onnx';

export async function* piperSpeak(text: string) {
  const exe = path.win32.normalize(PIPER_BIN);
  const model = path.win32.normalize(MODEL_PATH);

  if (!fs.existsSync(exe)) {
    throw new Error(`Piper executable not found at: ${exe}
Set PIPER_BIN in your .env to the full path of piper.exe`);
  }
  if (!fs.existsSync(model)) {
    throw new Error(`Piper voice model not found at: ${model}
Set PIPER_VOICE in your .env to the full path of the .onnx model`);
  }

  // Run Piper and capture WAV on stdout
  const args = ['-m', model, '-t', text, '-o', '-'];
  const proc = spawn(exe, args);

  // Helpful diagnostics if Piper errors out
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (d) => {
    if (process.env.DEBUG?.toLowerCase() === 'true') {
      console.error('[piper stderr]', d);
    }
  });

  const chunks: Buffer[] = [];
  for await (const c of proc.stdout) chunks.push(Buffer.from(c));
  const wav = Buffer.concat(chunks);
  const pcm16 = stripWavToPCM16(wav);
  const ulaw = linear16ToMuLaw(pcm16);

  // 20 ms frames @ 8 kHz for Twilio (G.711 μ-law)
  const frame = 160;
  for (let i = 0; i < ulaw.length; i += frame) {
    yield Buffer.from(ulaw.subarray(i, i + frame)).toString('base64');
  }

  const code = await new Promise<number>((resolve) =>
    proc.on('close', (c) => resolve(c ?? 0))
  );
  if (code !== 0) {
    throw new Error(`Piper exited with code ${code}`);
  }
}

function stripWavToPCM16(wav: Buffer) {
  // naive: skip 44-byte WAV header
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
  const BIAS = 0x84;
  const CLIP = 32635;
  let s = Math.max(-CLIP, Math.min(CLIP, sample));
  const sign = s < 0 ? 0x7f : 0xff;
  if (s < 0) s = -s;
  s += BIAS;
  let exponent = 7;
  for (let expMask = 0x4000; (s & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
  const mantissa = (s >> (exponent === 0 ? 4 : exponent + 3)) & 0x0f;
  return sign ^ ((exponent << 4) | mantissa);
}
