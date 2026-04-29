# stream-api

Centralized Cloudflare Stream API + `<stream-video>` Web Component for Foster Labs.

## Quick start

### 1. Drop a video on any page

```html
<script src="https://stream.fosterlabs.org/component.js"></script>

<!-- Hero autoplay loop -->
<stream-video uid="68b25df073544937c39521c4a1bdc5aa" mode="hero"></stream-video>

<!-- Full playback with controls -->
<stream-video uid="68b25df073544937c39521c4a1bdc5aa"></stream-video>

<!-- Iframe (Cloudflare's player) -->
<stream-video uid="68b25df073544937c39521c4a1bdc5aa" mode="iframe"></stream-video>

<!-- Just a thumbnail -->
<stream-video uid="68b25df073544937c39521c4a1bdc5aa" mode="thumbnail" poster-time="2s"></stream-video>
```

### 2. Upload a new video

```js
// From any Worker with STREAM_AUTH_TOKEN secret:
const res = await fetch('https://stream.fosterlabs.org/migrate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.STREAM_AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://my-bucket.r2.dev/video.mp4',
    meta: { name: 'my-hero-video' }
  }),
});
const { uid, urls } = await res.json();
```

## Component reference

`<stream-video>` attributes:

| Attribute | Default | Notes |
|---|---|---|
| `uid` | required | Cloudflare Stream UID |
| `mode` | `player` | `hero` \| `player` \| `iframe` \| `thumbnail` |
| `poster-time` | `0s` | When to grab the poster frame |
| `subdomain` | `customer-iy642ze20tq7w2hz...` | Override customer subdomain |
| `muted` | hero: true, player: false | |
| `autoplay` | hero: true, player: false | |
| `loop` | hero: true, player: false | |
| `controls` | hero: false, player: true | |
| `class`, `style` | — | Forwarded to inner element |
| `alt` | — | For thumbnail mode |

### Mode reference

- **hero** — autoplay muted loop using optimized MP4 download URL. Best for landing-page background loops. Fastest first frame.
- **player** — full HLS adaptive playback with controls. Native HLS in Safari, hls.js elsewhere. Falls back to MP4 if HLS fails.
- **iframe** — Cloudflare's branded player in an iframe. Easiest, but limited styling.
- **thumbnail** — just an `<img>`. For grids, link previews, or anywhere you want a static frame.

## API endpoints

All endpoints (except `/`, `/component.js`) require `Authorization: Bearer <STREAM_AUTH_TOKEN>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Health check (public) |
| GET | `/component.js` | Web Component (public) |
| GET | `/list` | List all videos |
| GET | `/:uid` | Video metadata + playback URLs |
| POST | `/upload` | Get one-time direct upload URL |
| POST | `/migrate` | Copy video from URL (R2, etc.) to Stream |
| POST | `/:uid/enable-mp4` | Manually trigger MP4 download generation |
| DELETE | `/:uid` | Delete video |

## Demo

Live demo of all modes: **https://stream-demo.pages.dev**

## Live videos

R2 → Stream UID lookup is stored in `SKIPPY_KV` under key `stream-mapping`.

## Architecture

- Worker `stream-api` at `stream.fosterlabs.org`
- Holds Cloudflare Stream API token
- Bearer-auth gate (`STREAM_AUTH_TOKEN`)
- Component embedded as JS string, served at `/component.js` with 1-day edge cache
