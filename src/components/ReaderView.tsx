import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReaderViewProps {
  text: string;
  fontSize: number;
  chapterNum: number | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export default function ReaderView({
  text,
  fontSize,
  chapterNum,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: ReaderViewProps) {
  const paragraphs = text.split('\n').filter((p) => p.trim());

  return (
    <div className="animate-fade-in">
      {chapterNum !== null && (
        <div className="text-center mb-8">
          <span className="text-primary font-ui text-sm font-medium tracking-widest uppercase">
            Chapter {chapterNum}
          </span>
        </div>
      )}

      <article className="reading-prose text-foreground max-w-2xl mx-auto" style={{ fontSize: `${fontSize}px` }}>
        {paragraphs.map((p, i) => (
          <p key={i} className="mb-4 text-foreground/90">
            {p}
          </p>
        ))}
      </article>

      {/* Chapter Navigation */}
      <nav className="flex items-center justify-between max-w-2xl mx-auto mt-12 pt-8 border-t border-border">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all font-ui text-sm"
        >
          <ChevronLeft size={18} />
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all font-ui text-sm"
        >
          Next
          <ChevronRight size={18} />
        </button>
      </nav>
    </div>
  );
}
