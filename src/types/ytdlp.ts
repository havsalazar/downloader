export interface YtdlpFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  height?: number;
  width?: number;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  video_ext?: string;
  audio_ext?: string;
  tbr?: number;
  vbr?: number;
  abr?: number;
  url?: string;
  protocol?: string;
  format_note?: string;
}

export interface YtdlpVideoInfo {
  id: string;
  title: string;
  duration?: number;
  uploader?: string;
  channel?: string;
  thumbnail?: string;
  formats: YtdlpFormat[];
}

export interface FormatsRequest {
  url: string;
}

export interface FormatsResponse {
  info: YtdlpVideoInfo;
}

export type FormatType = 'muxed' | 'video-only' | 'audio-only';
