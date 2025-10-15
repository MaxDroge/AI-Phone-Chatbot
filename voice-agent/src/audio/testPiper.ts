import { piperSpeak } from './ttsPiper.js';

(async () => {
  let shown = 0;
  for await (const chunk of piperSpeak('Piper is ready')) {
    if (shown++ < 5) console.log('Chunk', chunk.slice(0, 12));
  }
  console.log('✅ Piper test finished');
})();
