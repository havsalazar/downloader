# yt-dlp UI

Next.js 15 web app that wraps the `yt-dlp` CLI. Paste a video URL, browse available formats, and download files directly to the client. Files are written to a server temp dir during download, then streamed to the browser and deleted.

## Commands

```bash
npm run dev     # dev server at localhost:3000
npm run build   # production build
npm run lint    # ESLint
npx tsc --noEmit  # type-check without building
```

## Architecture

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/formats` | POST | Runs `yt-dlp -J <url>`, returns format list. If ffmpeg is available, synthesises muxed formats by pairing best video+audio per resolution. |
| `/api/prepare` | POST | Spawns `yt-dlp -f <formatId> -o <tempFile> <url>`, parses stderr for progress, emits SSE-ready events. Returns `{ jobId }`. |
| `/api/progress` | GET (SSE) | Streams `ProgressUpdate` events from the job's EventEmitter as `text/event-stream`. |
| `/api/download` | GET | Serves the completed temp file by `jobId`, then deletes it. |

### Key Files

```
src/
  app/
    api/
      formats/route.ts    POST — yt-dlp metadata fetch + synthetic muxed formats
      prepare/route.ts    POST — start download job, parse progress
      progress/route.ts   GET  — SSE progress stream
      download/route.ts   GET  — serve completed file, then delete
    layout.tsx            Dark bg (zinc-950), Geist fonts on <html>
    page.tsx              Thin server component shell
  components/
    UrlForm.tsx           'use client' — URL input, fetch state, renders FormatTable
    FormatTable.tsx       'use client' — Tabs (Muxed / Video Only / Audio Only)
    FormatRow.tsx         One table row; uses DownloadButton
    DownloadButton.tsx    'use client' — download state machine, progress bar
  lib/
    job-store.ts          Global in-memory Map<jobId, Job> on globalThis
    ytdlp.ts              Pure helpers: getFormatType, formatFilesize, etc.
  types/
    ytdlp.ts              YtdlpFormat, YtdlpVideoInfo, FormatType
```

### Download Flow

1. User clicks **Download** → `POST /api/prepare` → returns `jobId`
2. Client opens `EventSource` to `/api/progress?jobId=<id>`
3. yt-dlp writes to `/tmp/ytdlp-downloads/<uuid>.<ext>`; stderr is parsed for `[download] XX%` lines and forwarded as SSE
4. On `done` event → client programmatically clicks `<a href="/api/download?jobId=<id>">` to trigger browser Save As
5. Download route streams the file and deletes it on completion or client disconnect

### Job Store

`src/lib/job-store.ts` holds an in-memory `Map` on `globalThis._ytdlpJobs` so it survives Next.js hot-reloads. Each job stores its `EventEmitter`, `tempPath`, `lastUpdate`, and file metadata. Jobs auto-delete after 1 hour (abandoned) or 10 minutes (completed but not fetched).

### Format Classification

`getFormatType(format)` checks `vcodec`/`acodec` **and** `video_ext`/`audio_ext` (X.com and similar sites omit the codec fields but set the ext fields). Returns `'muxed' | 'video-only' | 'audio-only'`.

Synthetic muxed formats are built in `/api/formats` when ffmpeg is present: one entry per unique video height, combining the highest-bitrate video with the best-bitrate audio. The format ID is `videoFormatId+audioFormatId` — yt-dlp resolves and merges these natively via ffmpeg.

## External Binaries

| Binary | Path |
|---|---|
| yt-dlp | `/home/henry/.local/bin/yt-dlp` |
| ffmpeg | `/usr/bin/ffmpeg` (system package) |

## Tech Stack

- **Next.js 15** (App Router, Node.js runtime — not Edge)
- **React 19**, TypeScript, Tailwind CSS v4
- **shadcn/ui** built on `@base-ui/react` (not Radix) — no `asChild` prop; use `buttonVariants` directly on `<a>` tags
- Fonts: Geist Sans + Geist Mono via `next/font/google`, variables set on `<html>` (not `<body>`)

## Notes

- `--concurrent-fragments 5` is passed to every yt-dlp download for parallel HLS segment fetching
- The shadcn version here uses `@base-ui/react`, not Radix. `Button` has no `asChild` prop — apply `buttonVariants({ variant, size })` directly to an `<a>` element instead
- Tailwind font variables must be on `<html>`, not `<body>` — `globals.css` applies `font-sans` to `html`, so `--font-geist-sans` must be defined on an ancestor of `html` (i.e. `html` itself)
- Node 18 is in use; `@tailwindcss/oxide-linux-x64-gnu` is installed manually to work around an npm optional-deps bug with Node < 20
