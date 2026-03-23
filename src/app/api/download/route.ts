import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/job-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

  const job = jobs.get(jobId);
  if (!job) return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 });
  if (job.lastUpdate?.status !== 'done') {
    return NextResponse.json({ error: 'Download not ready' }, { status: 400 });
  }

  const cleanup = () => {
    jobs.delete(jobId);
    unlink(job.tempPath).catch(() => {});
  };

  const nodeStream = createReadStream(job.tempPath);
  const stream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: Buffer | string) =>
        controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
      );
      nodeStream.on('end', () => { controller.close(); cleanup(); });
      nodeStream.on('error', (err) => { controller.error(err); cleanup(); });
    },
    cancel() { nodeStream.destroy(); cleanup(); },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': job.contentType,
      'Content-Disposition': `attachment; filename="${job.filename}.${job.ext}"`,
      'Content-Length': job.size.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
