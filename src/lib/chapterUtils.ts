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
  if (!corsProxy) {
    throw new Error('Set the CORS proxy URL in Settings (gear icon) before loading a chapter.');
  }
  const proxiedUrl = url.replace('https://lnmtl.com', corsProxy.replace(/\/+$/, ''));
  const res = await fetch(proxiedUrl);
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  return res.text();
}

/**
 * Reads a streamed response body line by line.
 *
 * Network chunks do not respect line boundaries (or UTF-8 character boundaries),
 * so partial lines are buffered until their newline arrives instead of being parsed
 * and dropped.
 */
export async function readStreamLines(
  body: ReadableStream<Uint8Array>,
  onLine: (line: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) onLine(line);
  }
  buffer += decoder.decode();
  if (buffer.trim()) onLine(buffer);
}

/** Text from one line of Ollama's NDJSON stream, or '' if the line has none. */
export function parseOllamaLine(line: string): string {
  try {
    return JSON.parse(line).response || '';
  } catch {
    return '';
  }
}

/** Text from one line of Gemini's server-sent-events stream, or '' if the line has none. */
export function parseGeminiLine(line: string): string {
  if (!line.startsWith('data:')) return '';
  try {
    return JSON.parse(line.slice(5).trim()).candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch {
    return '';
  }
}

/** Splits text into chunks of at most maxChunkSize characters, on paragraph boundaries. */
export function splitIntoChunks(text: string, maxChunkSize = 8000): string[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';
  for (const p of paragraphs) {
    if (buffer && (buffer + '\n\n' + p).length > maxChunkSize) {
      chunks.push(buffer);
      buffer = p;
    } else {
      buffer = buffer ? buffer + '\n\n' + p : p;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

/** The finished chunks that can be shown in reading order: everything before the first gap. */
export function contiguousPrefix(results: (string | null)[]): string {
  const done: string[] = [];
  for (const r of results) {
    if (r === null) break;
    done.push(r.trim());
  }
  return done.join('\n\n');
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

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse';

async function geminiStream(text: string, apiKey: string, onPart: (part: string) => void): Promise<void> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${EDITOR_SYSTEM_PROMPT}\n\nText to polish:\n${text}` }] }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Gemini API error: ${res.status}`);
  await readStreamLines(res.body, (line) => {
    const part = parseGeminiLine(line);
    if (part) onPart(part);
  });
}

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
  if (!res.ok || !res.body) throw new Error(`Ollama API error: ${res.status}`);
  let fullText = '';
  await readStreamLines(res.body, (line) => {
    const part = parseOllamaLine(line);
    if (part) {
      fullText += part;
      onChunk(fullText);
    }
  });
  return fullText;
}

export async function smoothTextWithGemini(
  text: string,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<string> {
  let fullText = '';
  await geminiStream(text, apiKey, (part) => {
    fullText += part;
    onChunk(fullText);
  });
  return fullText;
}

export async function smoothTextWithGeminiParallel(
  text: string,
  apiKey: string,
  onChunk: (chunk: string) => void,
  concurrency = 2,
  maxChunkSize = 8000
): Promise<string> {
  const chunks = splitIntoChunks(text, maxChunkSize);
  const results: (string | null)[] = Array(chunks.length).fill(null);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, async () => {
    for (;;) {
      const i = nextIndex++;
      if (i >= chunks.length) break;
      let full = '';
      await geminiStream(chunks[i], apiKey, (part) => {
        full += part;
      });
      results[i] = full;
      onChunk(contiguousPrefix(results));
    }
  });

  await Promise.all(workers);
  return contiguousPrefix(results);
}
