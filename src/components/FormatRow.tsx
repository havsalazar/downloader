import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DownloadButton } from './DownloadButton';
import type { YtdlpFormat, YtdlpVideoInfo } from '@/types/ytdlp';
import {
  getResolutionLabel,
  formatFilesize,
  getBestFilesize,
} from '@/lib/ytdlp';

interface FormatRowProps {
  format: YtdlpFormat;
  info: YtdlpVideoInfo;
  videoUrl: string;
}

export function FormatRow({ format, info, videoUrl }: FormatRowProps) {
  const resolution = getResolutionLabel(format);
  const size = formatFilesize(getBestFilesize(format));

  const vCodecStr =
    format.vcodec && format.vcodec !== 'none'
      ? format.vcodec.split('.')[0]
      : format.video_ext && format.video_ext !== 'none'
      ? format.video_ext
      : null;
  const aCodecStr =
    format.acodec && format.acodec !== 'none'
      ? format.acodec.split('.')[0]
      : format.audio_ext && format.audio_ext !== 'none'
      ? format.audio_ext
      : null;
  const codec = [vCodecStr, aCodecStr].filter(Boolean).join('+') || '—';

  return (
    <TableRow>
      <TableCell className="font-medium">{resolution}</TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline" className="font-mono text-xs uppercase">
          {format.ext}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{size}</TableCell>
      <TableCell>
        <DownloadButton format={format} info={info} videoUrl={videoUrl} />
      </TableCell>
    </TableRow>
  );
}
