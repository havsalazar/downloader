import { spawn } from 'child_process';
import { mkdir, stat, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/job-store';
import type { ProgressUpdate } from '@/lib/job-store';

const YTDLP_BIN = '/home/henry/.local/bin/yt-dlp';
const TEMP_DIR = join(tmpdir(), 'ytdlp-downloads');

const MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg; codecs=opus',
  flac: 'audio/flac',
  aac: 'audio/aac',
};

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9\s\-_.]/g, '_').slice(0, 200);
}

export async function POST(req: NextRequest) {
  let body: { url?: string; formatId?: string; filename?: string; ext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { url, formatId, filename = 'download', ext = 'mp4' } = body;
  if (!url || !formatId) {
    return NextResponse.json({ error: 'Missing url or formatId' }, { status: 400 });
  }

  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!/^[\w.+\-]+$/.test(formatId)) {
    return NextResponse.json({ error: 'Invalid formatId' }, { status: 400 });
  }

  if (!MIME_TYPES[ext]) {
    return NextResponse.json({ error: 'Invalid extension' }, { status: 400 });
  }

  await mkdir(TEMP_DIR, { recursive: true });
  const tempPath = join(TEMP_DIR, `${randomUUID()}.${ext}`);
  const jobId = randomUUID();

  const job = {
    emitter: new EventEmitter(),
    tempPath,
    ext,
    contentType: MIME_TYPES[ext] ?? 'application/octet-stream',
    filename: safeFilename(filename),
    size: 0,
    lastUpdate: null as ProgressUpdate | null,
  };
  jobs.set(jobId, job);

  const emit = (update: ProgressUpdate) => {
    job.lastUpdate = update;
    job.emitter.emit('update', update);
  };

  // Auto-cleanup if client never fetches the file
  const abandonTimeout = setTimeout(() => {
    jobs.delete(jobId);
    unlink(tempPath).catch(() => {});
  }, 3600_000);

  const isMuxed = formatId.includes('+');
  const phases = isMuxed ? 2 : 1;
  let phase = 1;
  let prevPercent = 0;
  let stderrBuf = '';

  const ytdlp = spawn(YTDLP_BIN, [
    '--no-warnings', '--no-playlist', '--newline',
    '--concurrent-fragments', '5',
    '-f', formatId, '-o', tempPath, url,
  ]);

  ytdlp.stderr.on('data', (chunk: Buffer) => {
    stderrBuf += chunk.toString();
    const lines = stderrBuf.split(/[\r\n]/);
    stderrBuf = lines.pop() ?? '';

    for (const line of lines) {
      const pct = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (pct) {
        const percent = parseFloat(pct[1]);
        const speed = line.match(/at\s+([\d.]+\S+)\s+ETA/)?.[1] ?? '';
        const eta   = line.match(/ETA\s+(\S+)/)?.[1] ?? '';

        if (phase < phases && prevPercent > 80 && percent < 10) phase++;
        prevPercent = percent;

        emit({ status: 'downloading', phase, phases, percent, speed, eta });
      } else if (/Merging formats/i.test(line)) {
        emit({ status: 'merging' });
      }
    }
  });

  ytdlp.on('error', (err) => {
    clearTimeout(abandonTimeout);
    console.error('[prepare] spawn error:', err.message);
    emit({ status: 'error', message: 'Download failed' });
    jobs.delete(jobId);
    unlink(tempPath).catch(() => {});
  });

  ytdlp.on('close', async (code) => {
    clearTimeout(abandonTimeout);
    if (code === 0) {
      try {
        const { size } = await stat(tempPath);
        job.size = size;
        emit({ status: 'done' });
        // Cleanup if not fetched within 10 minutes
        setTimeout(() => {
          jobs.delete(jobId);
          unlink(tempPath).catch(() => {});
        }, 600_000);
      } catch {
        emit({ status: 'error', message: 'Failed to stat output file' });
        jobs.delete(jobId);
        unlink(tempPath).catch(() => {});
      }
    } else {
      console.error('[prepare] yt-dlp exited with code', code);
      emit({ status: 'error', message: 'Download failed' });
      jobs.delete(jobId);
      unlink(tempPath).catch(() => {});
    }
  });

  return NextResponse.json({ jobId });
}
