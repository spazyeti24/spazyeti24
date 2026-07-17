import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Profile, Score } from '@shared/types';
import { Badge, Button } from './ui/primitives';
import { cn } from '@/lib/utils';

// --- Toasts: how every caught error (and success note) is surfaced ---

interface Toast {
  id: number;
  kind: 'error' | 'success';
  message: string;
}

const ToastContext = createContext<(kind: Toast['kind'], message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    // Errors stay long enough to read; successes clear quickly.
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 10000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-96 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-md border p-3 text-sm shadow-lg',
              t.kind === 'error'
                ? 'border-red-300 bg-red-50 text-red-800'
                : 'border-green-300 bg-green-50 text-green-800',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Score badge, colored by the user's threshold ---

export function ScoreBadge({ score, threshold }: { score: Score | null; threshold: number }) {
  if (!score) return <Badge variant="gray">unscored</Badge>;
  const variant =
    score.overall >= threshold ? 'green' : score.overall >= threshold - 15 ? 'yellow' : 'red';
  return <Badge variant={variant}>{score.overall}</Badge>;
}

// --- Markdown with a copy button, used for generated materials ---

export function MarkdownBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-md border border-slate-200 bg-slate-50 p-4">
      <Button
        size="sm"
        variant="outline"
        className="absolute right-2 top-2"
        onClick={() => {
          void navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
      <div className="prose-sm max-w-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

// --- Score breakdown detail ---

export function ScoreBreakdown({ score }: { score: Score }) {
  const rows: [string, number][] = [
    ['Fit', score.fit],
    ['Requirements', score.requirementsMatch],
    ['Growth', score.growth],
    ['Comp signal', score.compSignal],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm italic text-slate-600">“{score.verdict}”</p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-2 text-sm">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="font-semibold">{value}</div>
          </div>
        ))}
      </div>
      {score.strengths.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-green-700">Strengths</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {score.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {score.gaps.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-red-700">Gaps</div>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
            {score.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-400">
        Scored by {score.model} · {new Date(score.createdAt).toLocaleString()}
      </p>
    </div>
  );
}

// --- Empty state helper ---

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
      <p className="font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export type { Profile };
