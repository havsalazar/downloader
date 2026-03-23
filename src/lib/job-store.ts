import { EventEmitter } from 'events';

export type ProgressUpdate =
  | { status: 'downloading'; phase: number; phases: number; percent: number; speed: string; eta: string }
  | { status: 'merging' }
  | { status: 'done' }
  | { status: 'error'; message: string };

export interface Job {
  emitter: EventEmitter;
  tempPath: string;
  ext: string;
  contentType: string;
  filename: string;
  size: number;
  lastUpdate: ProgressUpdate | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _ytdlpJobs: Map<string, Job> | undefined;
}

globalThis._ytdlpJobs ??= new Map<string, Job>();
export const jobs: Map<string, Job> = globalThis._ytdlpJobs;
