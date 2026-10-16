import { describe, it, expect, vi, afterEach } from "vitest";
import {
  extractChapterText,
  parseChapterUrl,
  readStreamLines,
  parseOllamaLine,
  parseGeminiLine,
  splitIntoChunks,
  contiguousPrefix,
  fetchChapterHtml,
  smoothTextWithOllama,
} from "./chapterUtils";

/** A ReadableStream that delivers the given strings as separate network chunks. */
function streamOf(chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? encoder.encode(c) : c);
      controller.close();
    },
  });
}

describe("extractChapterText", () => {
  it("joins lnmtl's translated sentences as paragraphs", () => {
    const html = `<div><p class="translated"> First line. </p><p class="original">原文</p><p class="translated">Second line.</p></div>`;
    expect(extractChapterText(html)).toBe("First line.\n\nSecond line.");
  });

  it("falls back to a chapter body container", () => {
    expect(extractChapterText(`<div class="chapter-body">  Body text  </div>`)).toBe("Body text");
  });

  it("returns an empty string when nothing matches", () => {
    expect(extractChapterText("<p>nothing here</p>")).toBe("");
  });
});

describe("parseChapterUrl", () => {
  it("builds previous and next chapter URLs", () => {
    expect(parseChapterUrl("https://lnmtl.com/chapter/some-novel-chapter-12")).toEqual({
      prevUrl: "https://lnmtl.com/chapter/some-novel-chapter-11",
      nextUrl: "https://lnmtl.com/chapter/some-novel-chapter-13",
      chapterNum: 12,
    });
  });

  it("has no previous chapter before chapter 1", () => {
    expect(parseChapterUrl("https://lnmtl.com/chapter/x-chapter-1").prevUrl).toBeNull();
  });

  it("returns nulls for URLs without a chapter number", () => {
    expect(parseChapterUrl("https://lnmtl.com/novel/x")).toEqual({ prevUrl: null, nextUrl: null, chapterNum: null });
  });
});

describe("readStreamLines", () => {
  it("reassembles a line split across network chunks", async () => {
    const lines: string[] = [];
    await readStreamLines(streamOf(['{"response":"Hel', 'lo"}\n{"respon', 'se":" world"}\n']), (l) => lines.push(l));
    expect(lines).toEqual(['{"response":"Hello"}', '{"response":" world"}']);
  });

  it("keeps a multi-byte character split between chunks intact", async () => {
    const bytes = new TextEncoder().encode('{"response":"señor"}\n');
    const cut = bytes.indexOf(0xc3) + 1; // split inside the two-byte "ñ"
    const lines: string[] = [];
    await readStreamLines(streamOf([bytes.slice(0, cut), bytes.slice(cut)]), (l) => lines.push(l));
    expect(parseOllamaLine(lines[0])).toBe("señor");
  });

  it("delivers a final line that has no trailing newline", async () => {
    const lines: string[] = [];
    await readStreamLines(streamOf(["a\nb"]), (l) => lines.push(l));
    expect(lines).toEqual(["a", "b"]);
  });
});

describe("stream line parsers", () => {
  it("reads Ollama NDJSON and ignores junk", () => {
    expect(parseOllamaLine('{"response":"hi","done":false}')).toBe("hi");
    expect(parseOllamaLine("not json")).toBe("");
  });

  it("reads Gemini SSE data lines and ignores everything else", () => {
    const line = 'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}';
    expect(parseGeminiLine(line)).toBe("hi");
    expect(parseGeminiLine(": keep-alive")).toBe("");
    expect(parseGeminiLine("data: {broken")).toBe("");
  });
});

describe("splitIntoChunks", () => {
  it("never splits a paragraph and respects the size limit", () => {
    const text = ["aaaa", "bbbb", "cccc"].join("\n\n");
    expect(splitIntoChunks(text, 10)).toEqual(["aaaa\n\nbbbb", "cccc"]);
  });

  it("keeps an oversized paragraph whole instead of emitting an empty chunk", () => {
    expect(splitIntoChunks("x".repeat(20) + "\n\ny", 10)).toEqual(["x".repeat(20), "y"]);
  });
});

describe("contiguousPrefix", () => {
  it("shows only chunks that are complete in reading order, with paragraph breaks", () => {
    expect(contiguousPrefix(["one", null, "three"])).toBe("one");
    expect(contiguousPrefix(["one ", "two", "three"])).toBe("one\n\ntwo\n\nthree");
    expect(contiguousPrefix([null, "two"])).toBe("");
  });
});

describe("network calls", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks for a proxy instead of falling back to a hard-coded address", async () => {
    await expect(fetchChapterHtml("https://lnmtl.com/chapter/x-chapter-1", "")).rejects.toThrow(/CORS proxy/);
  });

  it("routes lnmtl through the configured proxy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html></html>"));
    vi.stubGlobal("fetch", fetchMock);
    await fetchChapterHtml("https://lnmtl.com/chapter/x-chapter-1", "http://pc:8010/proxy/");
    expect(fetchMock).toHaveBeenCalledWith("http://pc:8010/proxy/chapter/x-chapter-1");
  });

  it("streams Ollama output without losing text at chunk boundaries", async () => {
    const body = streamOf(['{"response":"The ', 'sect"}\n{"response":" elder"}', '\n{"done":true}\n']);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body)));
    const seen: string[] = [];
    const result = await smoothTextWithOllama("raw", "http://pc:11434", "gemma3", (t) => seen.push(t));
    expect(result).toBe("The sect elder");
    expect(seen.at(-1)).toBe("The sect elder");
  });
});
