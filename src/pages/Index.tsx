import { useState, useCallback } from 'react';
import { Settings, BookOpen, Minus, Plus, ArrowRight } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import SettingsPanel from '@/components/SettingsPanel';
import ReaderView from '@/components/ReaderView';
import LoadingIndicator from '@/components/LoadingIndicator';
import {
  fetchChapterHtml,
  extractChapterText,
  smoothTextWithOllama,
  parseChapterUrl,
  smoothTextWithGemini,
} from '@/lib/chapterUtils';

type Stage = 'fetching' | 'extracting' | 'smoothing';

const Index = () => {
  const { settings, updateSettings } = useSettings();
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [chapterText, setChapterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('fetching');
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadChapter = useCallback(
    async (chapterUrl: string) => {
      setLoading(true);
      setError('');
      setChapterText('');

      try {
        setStage('fetching');
        const html = await fetchChapterHtml(chapterUrl, settings.corsProxy);

        setStage('extracting');
        const raw = extractChapterText(html);
        if (!raw) throw new Error('Could not extract chapter text. The page structure may have changed.');

        setStage('smoothing');
        const smoothed = settings.useGemini && settings.geminiKey
  ? await smoothTextWithGemini(raw, settings.geminiKey, (chunk) => {
      setChapterText(chunk);
    })
  : await smoothTextWithOllama(raw, settings.ollamaUrl, settings.modelName, (chunk) => {
      setChapterText(chunk);
    });

        setChapterText(smoothed || raw);
        setCurrentUrl(chapterUrl);
        setUrl(chapterUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) loadChapter(url.trim());
  };

  const { prevUrl, nextUrl, chapterNum } = parseChapterUrl(currentUrl);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen size={22} />
            <span className="font-ui font-semibold text-foreground text-base">Novel Reader</span>
          </div>

          <div className="flex items-center gap-1">
            {chapterText && (
              <>
                <button
                  onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Decrease font size"
                >
                  <Minus size={16} />
                </button>
                <span className="text-xs text-muted-foreground font-ui w-8 text-center">{settings.fontSize}</span>
                <button
                  onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Increase font size"
                >
                  <Plus size={16} />
                </button>
              </>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* URL Input */}
        {!chapterText && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <BookOpen size={48} className="text-primary/40 mb-6" />
            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2 text-center">
              Paste a chapter URL
            </h1>
            <p className="text-muted-foreground text-sm font-ui mb-8 text-center max-w-sm">
              From lnmtl.com — the text will be extracted and polished by your local AI
            </p>
            <form onSubmit={handleSubmit} className="w-full max-w-md">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://lnmtl.com/chapter/..."
                  className="flex-1 px-4 py-3 rounded-xl bg-card border border-border text-foreground font-ui text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-ui text-sm font-medium hover:opacity-90 transition-opacity glow-primary"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && <LoadingIndicator stage={stage} />}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-destructive font-ui text-sm mb-4">{error}</p>
            <button
              onClick={() => { setError(''); setChapterText(''); }}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-ui text-sm hover:bg-muted transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Reader */}
        {chapterText && (
          <>
            {/* Quick URL bar for loading new chapters */}
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-foreground font-ui text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-ui text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Load
                </button>
              </div>
            </form>

            <ReaderView
              text={chapterText}
              fontSize={settings.fontSize}
              chapterNum={chapterNum}
              hasPrev={!!prevUrl}
              hasNext={!!nextUrl}
              onPrev={() => prevUrl && loadChapter(prevUrl)}
              onNext={() => nextUrl && loadChapter(nextUrl)}
            />
          </>
        )}
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSettings}
      />
    </div>
  );
};

export default Index;
