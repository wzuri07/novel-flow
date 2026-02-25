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

const EDITOR_SYSTEM_PROMPT = `You are an expert editor specializing in Chinese web novels (xianxia, wuxia, cultivation fantasy) translated to English. Polish the machine-translated text to read like a professionally published English novel.

Rules:
- Fix grammar errors and unnatural phrasing
- Combine short choppy sentences into natural flowing prose where appropriate
- Make dialogue sound natural while preserving meaning
- Keep cultivation terms (qi, dao, dantian, meridians, sect, realm) exactly as written
- Preserve ALL character names exactly as written
- Preserve ALL plot events, descriptions and content
- Maintain tone — serious stays serious, humor stays humorous
- Target reading level: engaging adult fiction prose
- Do not summarize, skip, or add anything
- Return only the corrected text`;

export async function smoothTextWithOllama(
  text: string,
  ollamaUrl: string,
  model: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text, system: EDITOR_SYSTEM_PROMPT, stream: true }),
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
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${EDITOR_SYSTEM_PROMPT}\n\nText to polish:\n${text}`
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

export async function smoothTextWithGeminiParallel(
  text: string,
  apiKey: string,
  onChunk: (chunk: string) => void,
  concurrency = 2,
  maxChunkSize = 8000
): Promise<string> {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';
  for (const p of paragraphs) {
    if ((buffer + '\n\n' + p).length > maxChunkSize) {
      if (buffer) chunks.push(buffer);
      buffer = p;
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p;
    }
  }
  if (buffer) chunks.push(buffer);

  async function processChunk(chunk: string) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${EDITOR_SYSTEM_PROMPT}\n\nText to polish:\n${chunk}`
            }]
          }]
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const part = JSON.parse(line.replace(/^data: /, '')).candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (part) { full += part; }
        } catch {}
      }
    }
    return full;
  }

  const results: (string | null)[] = Array(chunks.length).fill(null);
  let nextIndex = 0;

  const workerCount = Math.min(concurrency, chunks.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= chunks.length) break;
      const res = await processChunk(chunks[i]);
      results[i] = res;
      const combined = results.filter(Boolean).join('');
      onChunk(combined);
    }
  });

  await Promise.all(workers as Promise<void>[]);
  const fullText = results.filter(Boolean).join('');
  return fullText;
}