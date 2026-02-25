import { X, Moon, Sun } from 'lucide-react';
import type { AppSettings } from '@/hooks/useSettings';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
}

export default function SettingsPanel({ open, onClose, settings, onUpdate }: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 animate-fade-in font-ui">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground">Theme</label>
            <button
              onClick={() => onUpdate({ darkMode: !settings.darkMode })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {settings.darkMode ? <Moon size={16} /> : <Sun size={16} />}
              <span className="text-sm">{settings.darkMode ? 'Dark' : 'Light'}</span>
            </button>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-sm text-foreground block mb-2">Font Size: {settings.fontSize}px</label>
            <input
              type="range"
              min={14}
              max={28}
              value={settings.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          {/* Ollama URL */}
          <div>
            <label className="text-sm text-foreground block mb-1.5">Ollama API URL</label>
            <input
              type="text"
              value={settings.ollamaUrl}
              onChange={(e) => onUpdate({ ollamaUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Model Name */}
          <div>
            <label className="text-sm text-foreground block mb-1.5">Model Name</label>
            <input
              type="text"
              value={settings.modelName}
              onChange={(e) => onUpdate({ modelName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* CORS Proxy */}
          <div>
            <label className="text-sm text-foreground block mb-1.5">CORS Proxy URL</label>
            <input
              type="text"
              value={settings.corsProxy}
              onChange={(e) => onUpdate({ corsProxy: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://corsproxy.io/?url="
            />
            <p className="text-xs text-muted-foreground mt-1">Needed to fetch chapters from lnmtl.com</p>
          </div>
          {/* AI Provider Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground">AI Provider</label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => onUpdate({ useGemini: false })}
                className={`px-3 py-2 text-sm transition-colors ${!settings.useGemini ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                Ollama
              </button>
              <button
                onClick={() => onUpdate({ useGemini: true })}
                className={`px-3 py-2 text-sm transition-colors ${settings.useGemini ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                Gemini
              </button>
            </div>
          </div>
          {/* Gemini API Key */}
          <div>
            <label className="text-sm text-foreground block mb-1.5">Gemini API Key</label>
            <input
              type="password"
              value={settings.geminiKey}
              onChange={(e) => onUpdate({ geminiKey: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste your Gemini API key here"
            />
            <p className="text-xs text-muted-foreground mt-1">If set, Gemini will be used instead of Ollama</p>
          </div>
          {/* Gemini Concurrency */}
          <div>
            <label className="text-sm text-foreground block mb-1.5">Gemini Concurrency</label>
            <input
              type="number"
              min={1}
              max={8}
              value={settings.geminiConcurrency}
              onChange={(e) => onUpdate({ geminiConcurrency: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">How many parallel requests to run when using Gemini (watch rate limits).</p>
          </div>

          {/* Gemini Chunk Size */}
          <div>
            <label className="text-sm text-foreground block mb-1.5">Gemini Chunk Size</label>
            <input
              type="number"
              min={2000}
              max={20000}
              step={500}
              value={settings.geminiChunkSize}
              onChange={(e) => onUpdate({ geminiChunkSize: Math.max(2000, Number(e.target.value) || 2000) })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Max characters per Gemini chunk (smaller → more requests).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
