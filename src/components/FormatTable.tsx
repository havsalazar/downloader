'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
} from '@/components/ui/table';
import { FormatRow } from './FormatRow';
import type { YtdlpVideoInfo, YtdlpFormat, FormatType } from '@/types/ytdlp';
import { getFormatType, getBestFilesize } from '@/lib/ytdlp';

interface FormatTableProps {
  info: YtdlpVideoInfo;
  videoUrl: string;
}

function sortFormats(formats: YtdlpFormat[]): YtdlpFormat[] {
  return [...formats].sort((a, b) => {
    const heightDiff = (b.height ?? 0) - (a.height ?? 0);
    if (heightDiff !== 0) return heightDiff;
    const sizeA = getBestFilesize(a) ?? 0;
    const sizeB = getBestFilesize(b) ?? 0;
    return sizeB - sizeA;
  });
}

const TAB_LABELS: Record<FormatType, string> = {
  muxed: 'Muxed',
  'video-only': 'Video Only',
  'audio-only': 'Audio Only',
};

const FORMAT_TYPES: FormatType[] = ['muxed', 'video-only', 'audio-only'];

export function FormatTable({ info, videoUrl }: FormatTableProps) {
  const grouped = FORMAT_TYPES.reduce<Record<FormatType, YtdlpFormat[]>>(
    (acc, type) => {
      acc[type] = sortFormats(info.formats.filter((f) => getFormatType(f) === type));
      return acc;
    },
    { muxed: [], 'video-only': [], 'audio-only': [] }
  );

  const defaultTab = grouped.muxed.length > 0
    ? 'muxed'
    : grouped['video-only'].length > 0
    ? 'video-only'
    : 'audio-only';

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mx-auto">
        {FORMAT_TYPES.map((type) => (
          <TabsTrigger key={type} value={type} disabled={grouped[type].length === 0}>
            {TAB_LABELS[type]} ({grouped[type].length})
          </TabsTrigger>
        ))}
      </TabsList>

      {FORMAT_TYPES.map((type) => (
        <TabsContent key={type} value={type}>
          {grouped[type].length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">No formats available.</p>
          ) : (
            <div className="[&>[data-slot=table-container]]:h-96 [&>[data-slot=table-container]]:overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Resolution</TableHead>
                  <TableHead className="hidden sm:table-cell">Container</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped[type].map((format) => (
                  <FormatRow
                    key={format.format_id}
                    format={format}
                    info={info}
                    videoUrl={videoUrl}
                  />
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
