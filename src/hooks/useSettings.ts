import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  ollamaUrl: string;
  modelName: string;
  fontSize: number;
  darkMode: boolean;
  corsProxy: string;
  geminiKey: string;
  useGemini: boolean;
  geminiConcurrency: number;
  geminiChunkSize: number;
}

// Default to the machine the app was opened from: localhost on the PC itself,
// or the PC's Tailscale IP when opened from a phone. Saved settings override this.
const HOST = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';

const DEFAULTS: AppSettings = {
  ollamaUrl: `http://${HOST}:11434`,
  modelName: 'gemma3:12b',
  fontSize: 18,
  darkMode: true,
  corsProxy: `http://${HOST}:8010/proxy`,
  geminiKey: '',
  useGemini: false,
  geminiConcurrency: 3,
  geminiChunkSize: 8000,
};

const STORAGE_KEY = 'novel-reader-settings';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...partial }));
  }, []);

  return { settings, updateSettings };
}
