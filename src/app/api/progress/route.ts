import { NextRequest } from 'next/server';
import { jobs } from '@/lib/job-store';
import type { ProgressUpdate } from '@/lib/job-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return new Response('Missing jobId', { status: 400 });

  const enc = new TextEncoder();
  const send = (data: ProgressUpdate) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    start(controller) {
      const job = jobs.get(jobId);
      if (!job) {
        controller.enqueue(send({ status: 'error', message: 'Job not found' }));
        controller.close();
        return;
      }

      // Already finished — flush immediately
      if (job.lastUpdate?.status === 'done' || job.lastUpdate?.status === 'error') {
        controller.enqueue(send(job.lastUpdate));
        controller.close();
        return;
      }

      const onUpdate = (update: ProgressUpdate) => {
        controller.enqueue(send(update));
        if (update.status === 'done' || update.status === 'error') {
          job.emitter.off('update', onUpdate);
          try { controller.close(); } catch { /* already closed */ }
        }
      };

      job.emitter.on('update', onUpdate);

      req.signal.addEventListener('abort', () => {
        job.emitter.off('update', onUpdate);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
