import { execFile } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';
import type { YtdlpVideoInfo, YtdlpFormat, FormatsResponse } from '@/types/ytdlp';
import { getFormatType } from '@/lib/ytdlp';

const YTDLP_BIN = '/home/henry/.local/bin/yt-dlp';

function checkFfmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], { timeout: 5000 }, (err) => resolve(!err));
  });
}

function buildMuxedFormats(formats: YtdlpFormat[]): YtdlpFormat[] {
  const videoOnly = formats.filter((f) => getFormatType(f) === 'video-only');
  const audioOnly = formats.filter((f) => getFormatType(f) === 'audio-only');
  if (!videoOnly.length || !audioOnly.length) return [];

  // Best audio by bitrate
  const bestAudio = [...audioOnly].sort(
    (a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0)
  )[0];

  // Best video per unique height (highest bitrate wins)
  const byHeight = new Map<number, YtdlpFormat>();
  for (const v of videoOnly) {
    const h = v.height ?? 0;
    const existing = byHeight.get(h);
    if (!existing || (v.tbr ?? v.vbr ?? 0) > (existing.tbr ?? existing.vbr ?? 0)) {
      byHeight.set(h, v);
    }
  }

  return [...byHeight.values()]
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
    .map((v) => {
      const combinedSize =
        (v.filesize ?? v.filesize_approx ?? 0) +
        (bestAudio.filesize ?? bestAudio.filesize_approx ?? 0);
      return {
        ...v,
        format_id: `${v.format_id}+${bestAudio.format_id}`,
        acodec: bestAudio.acodec,
        audio_ext: bestAudio.audio_ext,
        abr: bestAudio.abr ?? bestAudio.tbr,
        tbr: (v.tbr ?? 0) + (bestAudio.tbr ?? 0) || undefined,
        filesize: v.filesize && bestAudio.filesize ? v.filesize + bestAudio.filesize : undefined,
        filesize_approx: combinedSize || undefined,
      };
    });
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const info = await new Promise<YtdlpVideoInfo>((resolve, reject) => {
    execFile(
      YTDLP_BIN,
      ['--no-warnings', '--no-playlist', '-J', url],
      { maxBuffer: 50 * 1024 * 1024, timeout: 30_000 },
      (err, stdout, stderr) => {
        if (err) {
          console.error('[formats] yt-dlp error:', stderr || err.message);
          reject(new Error('Failed to fetch video info'));
          return;
        }
        try {
          const data = JSON.parse(stdout) as YtdlpVideoInfo;
          data.formats = (data.formats ?? []).filter(
            (f) => f.ext !== 'mhtml' && f.protocol !== 'mhtml'
          );
          resolve(data);
        } catch {
          reject(new Error('Failed to parse yt-dlp output'));
        }
      }
    );
  }).catch((err: Error) => ({ error: err.message } as { error: string }));

  if ('error' in info) {
    return NextResponse.json({ error: (info as { error: string }).error }, { status: 500 });
  }

  const ffmpegAvailable = await checkFfmpeg();
  if (ffmpegAvailable) {
    const muxed = buildMuxedFormats(info.formats);
    if (muxed.length) info.formats = [...muxed, ...info.formats];
  }

  return NextResponse.json({ info } satisfies FormatsResponse);
}
