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

const DEFAULTS: AppSettings = {
  ollamaUrl: 'http://100.80.232.61:11434',
  modelName: 'gemma3:12b',
  fontSize: 18,
  darkMode: true,
  corsProxy: 'http://100.80.232.61:8010/proxy',
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...partial }));
  }, []);

  return { settings, updateSettings };
}
