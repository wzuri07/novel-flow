import { BookOpen } from 'lucide-react';

interface LoadingIndicatorProps {
  stage: 'fetching' | 'extracting' | 'smoothing';
}

const MESSAGES = {
  fetching: 'Fetching chapter…',
  extracting: 'Extracting text…',
  smoothing: 'Polishing with AI…',
};

export default function LoadingIndicator({ stage }: LoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
      <BookOpen size={40} className="text-primary animate-pulse-glow mb-4" />
      <p className="text-muted-foreground font-ui text-sm">{MESSAGES[stage]}</p>
    </div>
  );
}
