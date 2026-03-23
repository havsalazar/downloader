import { UrlForm } from '@/components/UrlForm';

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-1">yt-dlp UI</h1>
        <p className="text-muted-foreground text-sm">
          Paste a video URL, browse available formats, and download directly to your device.
        </p>
      </div>
      <UrlForm />
    </main>
  );
}
