/**
 * Extract chapter text from lnmtl.com HTML
 */
export function extractChapterText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // lnmtl.com stores translated sentences in .translated elements
  const sentences = doc.querySelectorAll('.translated');
  if (sentences.length > 0) {
    return Array.from(sentences)
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  // Fallback: try .chapter-body or main content area
  const chapterBody = doc.querySelector('.chapter-body') ||
    doc.querySelector('.text-content') ||
    doc.querySelector('article') ||
    doc.querySelector('.content');

  if (chapterBody) {
    return chapterBody.textContent?.trim() || '';
  }

  return '';
}

/**
 * Parse chapter number from lnmtl URL and generate prev/next URLs
 */
export function parseChapterUrl(url: string): {
  prevUrl: string | null;
  nextUrl: string | null;
  chapterNum: number | null;
} {
  // Match patterns like chapter-123 or c123
  const match = url.match(/(-|\/c|chapter[-_])(\d+)/i);
  if (!match) return { prevUrl: null, nextUrl: null, chapterNum: null };

  const num = parseInt(match[2], 10);
  const prefix = match[1];

  const prevUrl = num > 1 ? url.replace(`${prefix}${num}`, `${prefix}${num - 1}`) : null;
  const nextUrl = url.replace(`${prefix}${num}`, `${prefix}${num + 1}`);

  return { prevUrl, nextUrl, chapterNum: num };
}

/**
 * Fetch chapter HTML via CORS proxy
 */
export async function fetchChapterHtml(url: string, corsProxy: string): Promise<string> {
  const proxiedUrl = `${corsProxy}${encodeURIComponent(url)}`;
  const res = await fetch(proxiedUrl);
  if (!res.ok) throw new Error(`Failed to fetch chapter: ${res.status}`);
  return res.text();
}

/**
 * Call Ollama API to smooth the translated text
 */
export async function smoothTextWithOllama(
  text: string,
  ollamaUrl: string,
  model: string
): Promise<string> {
  const systemPrompt =
    'You are a professional novel editor. The following text is a machine translation of a Chinese web novel. Fix all grammar errors, awkward phrasing, and unnatural English. Make it read smoothly and naturally. Preserve all character names, plot events, and content exactly as they are. Do not summarize, skip, or add anything. Return only the corrected text.';

  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: text,
      system: systemPrompt,
      stream: false,
    }),
  });

  if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
  const data = await res.json();
  return data.response || '';
}
