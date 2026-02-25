export function extractChapterText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sentences = doc.querySelectorAll('.translated');
  if (sentences.length > 0) {
    return Array.from(sentences)
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  const chapterBody = doc.querySelector('.chapter-body') ||
    doc.querySelector('.text-content') ||
    doc.querySelector('article') ||
    doc.querySelector('.content');
  if (chapterBody) return chapterBody.textContent?.trim() || '';
  return '';
}

export function parseChapterUrl(url: string): {
  prevUrl: string | null;
  nextUrl: string | null;
  chapterNum: number | null;
} {
  const match = url.match(/(chapter-)(\d+)$/i);
  if (!match) return { prevUrl: null, nextUrl: null, chapterNum: null };
  const num = parseInt(match[2], 10);
  const prevUrl = num > 1 ? url.replace(/(chapter-)(\d+)$/, `$1${num - 1}`) : null;
  const nextUrl = url.replace(/(chapter-)(\d+)$/, `$1${num + 1}`);
  return { prevUrl, nextUrl, chapterNum: num };
}

export async function fetchChapterHtml(url: string, corsProxy: string): Promise<string> {
  const proxy = corsProxy || 'http://100.80.232.61:8010/proxy';
  const proxiedUrl = url.replace('https://lnmtl.com', proxy);
  const res = await fetch(proxiedUrl);
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  return res.text();
}

export async function smoothTextWithOllama(
  text: string,
  ollamaUrl: string,
  model: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const systemPrompt = `You are an expert editor specializing in Chinese web novels translated to English. Your job is to polish machine-translated text while preserving the author's style and all story content.

Rules:
- Fix all grammar errors and unnatural phrasing
- Make sentences flow naturally in English
- Preserve ALL character names exactly as written
- Preserve ALL plot events, dialogue, and descriptions
- Keep the same paragraph structure
- Maintain the tone: serious moments stay serious, humor stays humorous
- Do not summarize, skip, or add any content
- Do not add commentary or explanations
- Return only the corrected text, nothing else`;
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text, system: systemPrompt, stream: true }),
  });
  if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const part = JSON.parse(line).response || '';
        if (part) { fullText += part; onChunk(fullText); }
      } catch {}
    }
  }
  return fullText;
}

export async function smoothTextWithGemini(
  text: string,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 10000));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert editor specializing in Chinese web novels translated to English. Polish the following machine-translated text to read naturally and fluently in English.

Rules:
- Fix all grammar errors and unnatural phrasing
- Make sentences flow naturally in English
- Preserve ALL character names exactly as written
- Preserve ALL plot events, dialogue, and descriptions
- Keep the same paragraph structure
- Maintain the tone: serious moments stay serious, humor stays humorous
- Do not summarize, skip, or add any content
- Return only the corrected text, nothing else

Text to polish:
${text}`
          }]
        }]
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const part = JSON.parse(line.replace(/^data: /, '')).candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (part) { fullText += part; onChunk(fullText); }
      } catch {}
    }
  }
  return fullText;
}