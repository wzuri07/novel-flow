@echo off
REM Starts everything Novel Flow needs: Ollama, the CORS proxy and the web app.
REM Requires Node.js, Ollama and local-cors-proxy (npm install -g local-cors-proxy).

cd /d "%~dp0"

REM Windows opened with "start" inherit these variables.
set "OLLAMA_ORIGINS=*"
set "OLLAMA_HOST=0.0.0.0:11434"

start "Ollama" cmd /k ollama serve
start "CORS proxy" cmd /k lcp --proxyUrl https://lnmtl.com --port 8010 --proxyPartial proxy
start "Novel Flow" cmd /k npm run dev
