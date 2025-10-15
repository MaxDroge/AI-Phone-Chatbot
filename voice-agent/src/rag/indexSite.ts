import fs from 'fs/promises';


// Minimal placeholder: if you already have documents.json from your scraper, reuse it here.
const INPUT = './data/documents.json';
const OUT = './src/rag/store.raw.json';


(async () => {
const raw = JSON.parse(await fs.readFile(INPUT, 'utf-8'));
// Expect format: [{url, text}] — adjust as needed
await fs.writeFile(OUT, JSON.stringify(raw, null, 2));
console.log('Wrote', OUT, raw.length, 'docs');
})();