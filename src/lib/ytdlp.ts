import type { YtdlpFormat, FormatType } from '@/types/ytdlp';

export function getFormatType(format: YtdlpFormat): FormatType {
  const hasVideo =
    (format.vcodec && format.vcodec !== 'none') ||
    (format.video_ext && format.video_ext !== 'none');
  const hasAudio =
    (format.acodec && format.acodec !== 'none') ||
    (format.audio_ext && format.audio_ext !== 'none');
  if (hasVideo && hasAudio) return 'muxed';
  if (hasVideo) return 'video-only';
  return 'audio-only';
}

export function getBestFilesize(format: YtdlpFormat): number | null {
  return format.filesize ?? format.filesize_approx ?? null;
}

export function formatFilesize(bytes: number | null): string {
  if (bytes === null) return '—';
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function getResolutionLabel(format: YtdlpFormat): string {
  if (format.height) return `${format.height}p`;
  if (format.resolution && format.resolution !== 'audio only') return format.resolution;
  return 'Audio';
}

export function formatBitrate(kbps: number | undefined): string {
  if (!kbps) return '—';
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${Math.round(kbps)} kbps`;
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
