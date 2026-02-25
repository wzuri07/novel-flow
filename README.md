# 📖 Novel Flow — AI-Powered Chinese Web Novel Reader

A personal PWA (Progressive Web App) that fetches chapters from [lnmtl.com](https://lnmtl.com), extracts the machine-translated text, and polishes it using a local AI (Ollama) or Google Gemini API — so you can actually enjoy reading Chinese web novels in English.

---

## ✨ Features

- 📥 Fetch any chapter directly from lnmtl.com by pasting the URL
- 🤖 AI grammar smoothing via **Ollama** (local, free, private) or **Google Gemini** (fast, free tier)
- 🔄 Streaming output — text appears as it's generated, no waiting for the full chapter
- 📖 Clean reader interface with dark/light mode
- 🔤 Adjustable font size
- ⬅️ ➡️ Previous / Next chapter navigation
- 📱 Installable as a PWA on Android and iOS
- 🔒 100% private — all processing happens on your own PC

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **AI (local):** Ollama running Gemma3 locally on your PC
- **AI (cloud):** Google Gemini API (free tier)
- **CORS Proxy:** local-cors-proxy (runs on your PC)
- **Remote access:** Tailscale (access from phone anywhere)
- **Hosting:** GitHub Pages (UI only)

---

## 🚀 How It Works

```
Your Phone / Browser
        ↓
  React PWA (GitHub Pages or local)
        ↓
  Local CORS Proxy (port 8010) → lnmtl.com chapter
        ↓
  Ollama (port 11434) or Gemini API
        ↓
  Smoothed, clean English text displayed in reader
```

---

## ⚙️ Setup

### Prerequisites

- [Node.js](https://nodejs.org) (LTS version)
- [Ollama](https://ollama.com) installed on your PC
- [Tailscale](https://tailscale.com) (optional, for phone access from anywhere)

### Installation

```bash
# Clone the repo
git clone https://github.com/wzuri07/novel-flow.git
cd novel-flow

# Install dependencies
npm install

# Install the CORS proxy globally
npm install -g local-cors-proxy
```

### Pull an AI model

```bash
ollama pull gemma3:12b   # High quality, slower (recommended for 16GB+ RAM)
ollama pull gemma3:4b    # Faster, good quality (recommended for 8GB RAM)
```

### Start everything

Either run the batch file (Windows):

```
novel-reader-start.bat
```

Or manually in separate terminals:

```bash
# Terminal 1 — Start Ollama
set OLLAMA_ORIGINS=*
set OLLAMA_HOST=0.0.0.0:11434
ollama serve

# Terminal 2 — Start CORS proxy
lcp --proxyUrl https://lnmtl.com --port 8010 --proxyPartial proxy

# Terminal 3 — Start the app
npm run dev
```

Then open your browser at:
```
http://localhost:8080
```

---

## 📱 Phone Access

1. Install [Tailscale](https://tailscale.com) on both your PC and phone
2. Sign in with the same account on both
3. Find your PC's Tailscale IP (e.g. `100.x.x.x`)
4. Open `http://100.x.x.x:8080` on your phone browser
5. Tap **Add to Home Screen** to install as a PWA

---

## ⚙️ Settings

Click the gear icon ⚙️ in the top right to configure:

| Setting | Default | Description |
|---|---|---|
| Ollama API URL | `http://100.x.x.x:11434` | Your local Ollama endpoint |
| Model Name | `gemma3:12b` | Any Ollama model you have pulled |
| CORS Proxy URL | `http://100.x.x.x:8010/proxy` | Local proxy for fetching lnmtl.com |
| Gemini API Key | *(empty)* | Optional — get free key at aistudio.google.com |
| AI Provider | Ollama | Toggle between Ollama and Gemini |

---

## 🆓 Cost

**Everything is free.**

| Component | Cost |
|---|---|
| Ollama + models | Free |
| GitHub Pages hosting | Free |
| local-cors-proxy | Free |
| Tailscale personal | Free |
| Gemini API (free tier) | Free (1,500 requests/day) |

---

## 📝 Notes

- This app is for **personal use only**
- Your PC must be on and running for the app to work
- The batch file can be placed in your Windows startup folder to auto-start everything on boot
- GitHub Pages version is for reference only — use the local version at `http://localhost:8080` for full functionality

---

## 🙏 Credits

Built with [Lovable](https://lovable.dev), [Ollama](https://ollama.com), and [Google Gemini](https://aistudio.google.com).
