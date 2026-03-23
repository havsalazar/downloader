'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

  async function handleSubmit(e: React.FormEvent) {
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

  const duration = videoInfo?.duration ? formatDuration(videoInfo.duration) : null;
  const channel = videoInfo?.channel ?? videoInfo?.uploader ?? null;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          autoComplete="off"
          required
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Fetching…' : 'Fetch Info'}
        </Button>
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
