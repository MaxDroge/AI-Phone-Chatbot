import axios from 'axios';


export async function llmAnswer(userText: string, contextChunks: {url: string, text: string}[]) {
const context = contextChunks.map(c => `Source: ${c.url}\n${c.text}`).join('\n\n---\n\n');
const system = `You are TechCraft Studio's helpful phone assistant. Answer conversationally in 1-3 sentences. If unsure, say so and offer to follow up. Prefer information from the provided sources. If you reference a page, mention it naturally (e.g., \"on our Services page\"). Avoid making things up.`;


const resp = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
model: 'meta-llama/llama-3.1-8b-instruct', // default primary model
stream: true,
messages: [
{ role: 'system', content: system },
{ role: 'user', content: `Context:\n${context}\n\nUser: ${userText}` }
],
temperature: 0.3,
max_tokens: 300
}, {
headers: {
'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
'HTTP-Referer': process.env.PUBLIC_URL || 'http://localhost',
'X-Title': 'Voice Agent'
}
});


return resp.data.choices?.[0]?.message?.content?.trim() || 'Sorry, I did not catch that.';
}