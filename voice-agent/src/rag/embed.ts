import fs from 'fs/promises';
import { pipeline } from '@xenova/transformers';


const RAW = './src/rag/store.raw.json';
const OUT = './src/rag/store.json';


(async () => {
const docs: {url: string, text: string}[] = JSON.parse(await fs.readFile(RAW, 'utf-8'));
const embedder: any = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');


const items: any[] = [];
for (const d of docs) {
const chunks = chunkText(d.text, 800, 200);
for (const ch of chunks) {
const output = await embedder(ch);
// Mean-pool last hidden state
const last = output.data as number[][];
const vec = meanPool(last);
items.push({ url: d.url, text: ch, embedding: vec });
}
}
await fs.writeFile(OUT, JSON.stringify(items));
console.log('Embedded', items.length, 'chunks');
})();


function chunkText(t: string, size: number, overlap: number) {
const out: string[] = [];
let i = 0;
while (i < t.length) {
out.push(t.slice(i, i + size));
i += size - overlap;
}
return out;
}


function meanPool(mat: number[][]) {
const dim = mat[0].length;
const out = new Array(dim).fill(0);
for (const row of mat) for (let j = 0; j < dim; j++) out[j] += row[j];
for (let j = 0; j < dim; j++) out[j] /= mat.length;
return out;
}