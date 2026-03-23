'use client';

import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { YtdlpFormat, YtdlpVideoInfo } from '@/types/ytdlp';

function Bar({ value, indeterminate }: { value?: number; indeterminate?: boolean }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-300',
          indeterminate && 'animate-pulse w-full'
        )}
        style={!indeterminate ? { width: `${value ?? 0}%` } : undefined}
      />
    </div>
  );
}

type DownloadState =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'downloading'; phase: number; phases: number; percent: number; speed: string; eta: string }
  | { status: 'merging' }
  | { status: 'done' }
  | { status: 'error'; message: string };

interface Props {
  format: YtdlpFormat;
  info: YtdlpVideoInfo;
  videoUrl: string;
}

export function DownloadButton({ format, info, videoUrl }: Props) {
  const [state, setState] = useState<DownloadState>({ status: 'idle' });

  async function handleClick() {
    setState({ status: 'preparing' });

    try {
      const res = await fetch('/api/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: videoUrl,
          formatId: format.format_id,
          filename: info.title,
          ext: format.ext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({ status: 'error', message: data.error ?? 'Failed to start' });
        return;
      }

      const { jobId } = await res.json();
      const es = new EventSource(`/api/progress?jobId=${jobId}`);

      es.onmessage = (e) => {
        const update = JSON.parse(e.data as string);

        if (update.status === 'downloading') {
          setState({ status: 'downloading', ...update });
        } else if (update.status === 'merging') {
          setState({ status: 'merging' });
        } else if (update.status === 'done') {
          es.close();
          setState({ status: 'done' });

          const a = document.createElement('a');
          a.href = `/api/download?jobId=${jobId}`;
          a.download = `${info.title}.${format.ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => setState({ status: 'idle' }), 3000);
        } else if (update.status === 'error') {
          es.close();
          setState({ status: 'error', message: update.message });
        }
      };

      es.onerror = () => {
        es.close();
        setState((s) =>
          s.status !== 'done' ? { status: 'error', message: 'Connection lost' } : s
        );
      };
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  if (state.status === 'idle') {
    return (
      <button onClick={handleClick} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
        Download
      </button>
    );
  }

  if (state.status === 'preparing') {
    return (
      <div className="w-32 space-y-1">
        <p className="text-xs text-muted-foreground">Preparing…</p>
        <Bar indeterminate />
      </div>
    );
  }

  if (state.status === 'downloading') {
    const { phase, phases, percent, speed, eta } = state;
    return (
      <div className="w-32 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{speed || (phases > 1 ? `Part ${phase}/${phases}` : '…')}</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <Bar value={percent} />
        {eta && eta !== 'Unknown' && (
          <p className="text-xs text-muted-foreground">ETA {eta}</p>
        )}
      </div>
    );
  }

  if (state.status === 'merging') {
    return (
      <div className="w-32 space-y-1">
        <p className="text-xs text-muted-foreground">Merging…</p>
        <Bar indeterminate />
      </div>
    );
  }

  if (state.status === 'done') {
    return <p className="text-xs text-green-500 font-medium">Done ✓</p>;
  }

  // error
  return (
    <button
      onClick={() => setState({ status: 'idle' })}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-destructive border-destructive/40')}
      title={state.message}
    >
      Retry
    </button>
  );
}
