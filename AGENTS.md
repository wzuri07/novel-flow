# AGENTS.md

Guide for coding agents (and humans) working on Novel Flow.

## Setup

```bash
npm ci
```

Node.js LTS (20+). Ollama and `local-cors-proxy` are only needed to read real chapters, not to develop or test.

## Commands

| Task | Command |
|---|---|
| Dev server (port 8080) | `npm run dev` |
| Tests | `npm test` |
| Lint | `npm run lint` (must have 0 errors; shadcn `react-refresh` warnings are expected) |
| Type check | `npx tsc -p tsconfig.app.json --noEmit` |
| Production build | `npm run build` |

CI runs lint, type check, tests and build on every push and pull request (`.github/workflows/ci.yml`).

## Layout

- `src/lib/chapterUtils.ts` — all non-UI logic: chapter fetching and extraction, URL navigation, streaming from Ollama/Gemini, chunking for parallel Gemini. Tests live next to it in `chapterUtils.test.ts`.
- `src/pages/Index.tsx` — the reader page and the load-chapter flow.
- `src/hooks/useSettings.ts` — settings persisted in `localStorage`; defaults point at the host the app was opened from.
- `src/components/ui/` — generated shadcn/ui components. Avoid hand-editing unless needed.

## Rules

- Streamed responses must go through `readStreamLines`; never parse raw network chunks directly (lines and UTF-8 characters can be split across chunks).
- No personal addresses, IPs or API keys in source. Machine-specific values belong in Settings.
- Gemini keys are sent in the `x-goog-api-key` header, not the URL.
- Add or update a test in `chapterUtils.test.ts` for any change to `chapterUtils.ts`. Mock `fetch`; tests must not need Ollama, Gemini or the network.
