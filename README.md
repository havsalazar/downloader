# yt-dlp UI

A web interface for [yt-dlp](https://github.com/yt-dl/yt-dlp). Paste a video URL, browse available formats, and download files directly to your device.

## Requirements

### yt-dlp

Install via pip:

```bash
pip install yt-dlp
```

Or download the standalone binary:

```bash
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp
chmod +x ~/.local/bin/yt-dlp
```

yt-dlp must be available in your `PATH`, or update the binary path in `src/app/api/formats/route.ts` and `src/app/api/prepare/route.ts`.

### ffmpeg

Required for muxing video-only and audio-only streams into a single file.

**Ubuntu / Debian:**
```bash
sudo apt install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to `PATH`.

Without ffmpeg, the Muxed tab will only show formats that already contain both video and audio.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
