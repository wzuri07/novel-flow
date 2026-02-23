import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  ollamaUrl: string;
  modelName: string;
  fontSize: number;
  darkMode: boolean;
  corsProxy: string;
}

const DEFAULTS: AppSettings = {
  ollamaUrl: 'http://localhost:11434',
  modelName: 'gemma3:12b',
  fontSize: 18,
  darkMode: true,
  corsProxy: 'https://corsproxy.io/?url=',
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
