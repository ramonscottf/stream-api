# stream-api

Centralized Cloudflare Stream API. Single source of truth for video upload, playback URLs, and lifecycle across all Foster Labs / Wicko Waypoint projects.

## Endpoints

All endpoints (except `/`) require `Authorization: Bearer <STREAM_AUTH_TOKEN>`.

- `GET /` — Health check (public)
- `GET /list` — List all videos
- `GET /:uid` — Video metadata + playback URLs
- `POST /upload` — Get one-time direct upload URL
- `POST /migrate` — Copy video from URL (e.g. R2) to Stream
- `DELETE /:uid` — Delete video

## Usage from another Worker

```js
const res = await fetch('https://stream.fosterlabs.org/migrate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.STREAM_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://hires-media.fosterlabs.org/hero-loop.mp4',
    meta: { name: 'hires-hero-loop' }
  }),
});
const { uid, urls } = await res.json();
// urls.hls, urls.iframe, urls.mp4_download, urls.thumbnail
```

## Playback in HTML

```html
<!-- Iframe (easy, Cloudflare's player) -->
<iframe src="https://customer-iy642ze20tqh3xpm.cloudflarestream.com/{UID}/iframe"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowfullscreen></iframe>

<!-- Direct HLS (custom player, full styling control) -->
<video controls>
  <source src="https://customer-iy642ze20tqh3xpm.cloudflarestream.com/{UID}/manifest/video.m3u8" 
          type="application/x-mpegURL">
</video>

<!-- Hero loop (autoplay muted, optimized MP4) -->
<video autoplay muted loop playsinline>
  <source src="https://customer-iy642ze20tqh3xpm.cloudflarestream.com/{UID}/downloads/default.mp4" 
          type="video/mp4">
</video>
```
