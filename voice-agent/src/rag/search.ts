import fs from 'fs';
import * as mlDistance from 'ml-distance';
const cosine = mlDistance.similarity.cosine;


let store: { url: string; text: string; embedding: number[] }[] | null = null;


export function search(query: string, k = 5) {
if (!store) store = JSON.parse(fs.readFileSync('./src/rag/store.json', 'utf-8'));
// Lazy embed query with same model in memory to keep costs zero.
// For brevity, we import the embedder dynamically and cache it.
return (globalThis as any).__embed(query).then((q) =>
store!
.map((it) => ({ ...it, score: 1 - cosine(q, it.embedding) }))
.sort((a, b) => b.score - a.score)
.slice(0, k)
);
}


// Minimal global embed cache
(async () => {
const { pipeline } = await import('@xenova/transformers');
const embedder: any = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
(globalThis as any).__embed = async (t: string) => {
const out = await embedder(t);
const last = out.data as number[][];
return meanPool(last);
};
})();


function meanPool(mat: number[][]) {
const dim = mat[0].length; const out = new Array(dim).fill(0);
for (const row of mat) for (let j = 0; j < dim; j++) out[j] += row[j];
for (let j = 0; j < dim; j++) out[j] /= mat.length; return out;
}