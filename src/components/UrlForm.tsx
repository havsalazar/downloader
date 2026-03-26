'use client';

import { useState } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormatTable } from './FormatTable';
import type { YtdlpVideoInfo } from '@/types/ytdlp';
import { formatDuration } from '@/lib/ytdlp';

export function UrlForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<YtdlpVideoInfo | null>(null);
  const [fetchedUrl, setFetchedUrl] = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const res = await fetch('/api/formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to fetch formats');
        return;
      }
      setFetchedUrl(url);
      setVideoInfo(data.info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handlePaste() {
    setUrl('');
    const text = await navigator.clipboard.readText();
    setUrl(text);
  }

  const duration = videoInfo?.duration ? formatDuration(videoInfo.duration) : null;
  const channel = videoInfo?.channel ?? videoInfo?.uploader ?? null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <ButtonGroup className="w-full">
          <div data-slot="input" className="relative flex h-8 flex-1 items-center rounded-l-lg border border-input bg-transparent dark:bg-input/30">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
              autoComplete="off"
              required
              className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 pr-7"
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear input"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={handlePaste} title="Paste from clipboard">
            <ClipboardPaste />
          </Button>
          <Button type="submit" disabled={loading} variant="outline">
            {loading ? 'Fetching…' : 'Fetch Info'}
          </Button>
        </ButtonGroup>
      </form>

      {error && (
        <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {videoInfo && (
        <Card size="sm">
          <CardHeader>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-snug">{videoInfo.title}</CardTitle>
                {(duration || channel) && (
                  <CardDescription className="mt-1">
                    {[duration, channel].filter(Boolean).join(' · ')}
                  </CardDescription>
                )}
              </div>
              {videoInfo.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-32 h-20 object-cover rounded-md shrink-0 hidden sm:block"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <FormatTable info={videoInfo} videoUrl={fetchedUrl} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
