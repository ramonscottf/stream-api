/**
 * stream-api - Centralized Cloudflare Stream API
 * 
 * Endpoints:
 *   GET  /                    - Health check
 *   GET  /list                - List all videos
 *   GET  /:uid                - Get video metadata + playback URLs
 *   POST /upload              - Direct upload (returns one-time upload URL)
 *   POST /migrate             - Copy video from public URL (R2, etc.) to Stream
 *   DELETE /:uid              - Delete video
 * 
 * Auth: Bearer token in Authorization header (STREAM_AUTH_TOKEN secret)
 * 
 * All endpoints (except GET /) require Bearer auth.
 */

const STREAM_VIDEO_COMPONENT = `/**
 * <stream-video> Web Component
 * 
 * Smart Cloudflare Stream player that picks the best delivery method
 * based on use case (hero loop, full-length playback, thumbnail).
 * 
 * Usage:
 *   <script src="https://stream.fosterlabs.org/component.js"></script>
 *   
 *   <!-- Hero autoplay loop (uses optimized MP4) -->
 *   <stream-video uid="abc123" mode="hero" poster-time="2s"></stream-video>
 *   
 *   <!-- Full playback with controls (uses HLS adaptive) -->
 *   <stream-video uid="abc123" mode="player"></stream-video>
 *   
 *   <!-- Iframe (Cloudflare's branded player) -->
 *   <stream-video uid="abc123" mode="iframe"></stream-video>
 *   
 *   <!-- Just a thumbnail image -->
 *   <stream-video uid="abc123" mode="thumbnail"></stream-video>
 * 
 * Attributes:
 *   uid          - Required. Cloudflare Stream video UID.
 *   mode         - hero | player | iframe | thumbnail. Default: player.
 *   poster-time  - Timestamp for poster frame (e.g. "2s", "0s"). Default: "0s".
 *   subdomain    - Override customer subdomain.
 *   muted        - Force muted (default: true for hero, false otherwise).
 *   autoplay     - Force autoplay (default: true for hero).
 *   loop         - Force loop (default: true for hero).
 *   controls     - Show controls (default: true for player, false for hero).
 *   class        - Forwarded to inner element for styling.
 *   style        - Forwarded to inner element.
 *   alt          - Alt text (thumbnail mode).
 * 
 * Slots:
 *   fallback     - Content shown if video fails to load.
 */


// Inject baseline styles once
(function() {
  if (document.getElementById('stream-video-base-styles')) return;
  const s = document.createElement('style');
  s.id = 'stream-video-base-styles';
  s.textContent = \`
    stream-video { display: block; position: relative; }
    stream-video[mode="thumbnail"] { display: inline-block; }
    stream-video > video, stream-video > iframe, stream-video > img {
      display: block;
      max-width: 100%;
    }
    /* When parent has fixed dimensions (e.g. .hero-video-bg), fill it */
    stream-video > video[autoplay][muted][loop] {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  \`;
  (document.head || document.documentElement).appendChild(s);
})();

const DEFAULT_SUBDOMAIN = 'customer-iy642ze20tq7w2hz.cloudflarestream.com';

class StreamVideo extends HTMLElement {
  static get observedAttributes() {
    return ['uid', 'mode', 'poster-time', 'subdomain', 'muted', 'autoplay', 'loop', 'controls', 'alt'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  get subdomain() {
    return this.getAttribute('subdomain') || DEFAULT_SUBDOMAIN;
  }

  get uid() {
    return this.getAttribute('uid');
  }

  get mode() {
    return (this.getAttribute('mode') || 'player').toLowerCase();
  }

  url(path) {
    return \`https://\${this.subdomain}/\${this.uid}/\${path}\`;
  }

  // Boolean attribute helper - supports "true", "false", presence, absence
  boolAttr(name, defaultValue) {
    if (!this.hasAttribute(name)) return defaultValue;
    const v = this.getAttribute(name);
    return v !== 'false' && v !== '0' && v !== 'no';
  }

  render() {
    const uid = this.uid;
    if (!uid) {
      this.innerHTML = '<!-- stream-video: missing uid -->';
      return;
    }

    const mode = this.mode;
    const posterTime = this.getAttribute('poster-time') || '0s';
    const klass = this.getAttribute('class') || '';
    const style = this.getAttribute('style') || '';

    // Forward styling to inner element only when set on host
    const innerAttrs = [];
    if (klass) innerAttrs.push(\`class="\${this.escapeAttr(klass)}"\`);
    if (style) innerAttrs.push(\`style="\${this.escapeAttr(style)}"\`);

    let html;
    switch (mode) {
      case 'hero':
        html = this.renderHero(innerAttrs, posterTime);
        break;
      case 'iframe':
        html = this.renderIframe(innerAttrs, posterTime);
        break;
      case 'thumbnail':
        html = this.renderThumbnail(innerAttrs, posterTime);
        break;
      case 'player':
      default:
        html = this.renderPlayer(innerAttrs, posterTime);
        break;
    }

    this.innerHTML = html;

    // Wire up HLS for player mode if browser doesn't natively support it
    if (mode === 'player') this.attachHlsIfNeeded();
  }

  renderHero(innerAttrs, posterTime) {
    // Hero loops use MP4 download URL (faster than HLS for short autoplay loops)
    const muted = this.boolAttr('muted', true);
    const autoplay = this.boolAttr('autoplay', true);
    const loop = this.boolAttr('loop', true);
    const controls = this.boolAttr('controls', false);

    const attrs = [
      autoplay ? 'autoplay' : '',
      muted ? 'muted' : '',
      loop ? 'loop' : '',
      controls ? 'controls' : '',
      'playsinline',
      'preload="metadata"',
      \`poster="\${this.url(\`thumbnails/thumbnail.jpg?time=\${posterTime}\`)}"\`,
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<video \${attrs}>
  <source src="\${this.url('downloads/default.mp4')}" type="video/mp4">
  <slot name="fallback">Your browser does not support video.</slot>
</video>\`;
  }

  renderPlayer(innerAttrs, posterTime) {
    // Full playback uses HLS (adaptive bitrate)
    const muted = this.boolAttr('muted', false);
    const autoplay = this.boolAttr('autoplay', false);
    const loop = this.boolAttr('loop', false);
    const controls = this.boolAttr('controls', true);

    const attrs = [
      autoplay ? 'autoplay' : '',
      muted ? 'muted' : '',
      loop ? 'loop' : '',
      controls ? 'controls' : '',
      'playsinline',
      'preload="metadata"',
      \`poster="\${this.url(\`thumbnails/thumbnail.jpg?time=\${posterTime}\`)}"\`,
      \`data-hls="\${this.url('manifest/video.m3u8')}"\`,
      \`data-mp4="\${this.url('downloads/default.mp4')}"\`,
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<video \${attrs}>
  <slot name="fallback">Your browser does not support video.</slot>
</video>\`;
  }

  renderIframe(innerAttrs, posterTime) {
    const params = new URLSearchParams();
    if (this.boolAttr('autoplay', false)) params.set('autoplay', 'true');
    if (this.boolAttr('muted', false)) params.set('muted', 'true');
    if (this.boolAttr('loop', false)) params.set('loop', 'true');
    if (posterTime !== '0s') params.set('poster', \`\${this.url('thumbnails/thumbnail.jpg')}?time=\${posterTime}\`);
    
    const qs = params.toString();
    const src = \`\${this.url('iframe')}\${qs ? '?' + qs : ''}\`;

    const attrs = [
      \`src="\${src}"\`,
      'allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"',
      'allowfullscreen',
      'loading="lazy"',
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<iframe \${attrs}></iframe>\`;
  }

  renderThumbnail(innerAttrs, posterTime) {
    const alt = this.getAttribute('alt') || 'Video thumbnail';
    const attrs = [
      \`src="\${this.url(\`thumbnails/thumbnail.jpg?time=\${posterTime}\`)}"\`,
      \`alt="\${this.escapeAttr(alt)}"\`,
      'loading="lazy"',
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<img \${attrs}>\`;
  }

  attachHlsIfNeeded() {
    const video = this.querySelector('video');
    if (!video) return;
    const hls = video.dataset.hls;
    const mp4 = video.dataset.mp4;
    if (!hls) return;

    // Safari and iOS support HLS natively
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hls;
      return;
    }

    // Other browsers: try hls.js
    if (window.Hls && window.Hls.isSupported()) {
      const hlsInstance = new window.Hls();
      hlsInstance.loadSource(hls);
      hlsInstance.attachMedia(video);
      hlsInstance.on(window.Hls.Events.ERROR, () => {
        // Fallback to MP4 if HLS fails
        video.src = mp4;
      });
      return;
    }

    // No HLS support and no hls.js — use MP4 fallback
    video.src = mp4;
    
    // Optionally lazy-load hls.js once and re-attempt
    if (!window.__streamVideoHlsLoading) {
      window.__streamVideoHlsLoading = true;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
      script.onload = () => {
        // Re-render any player-mode components on the page
        document.querySelectorAll('stream-video[mode="player"], stream-video:not([mode])').forEach(el => {
          if (el.attachHlsIfNeeded) el.attachHlsIfNeeded();
        });
      };
      document.head.appendChild(script);
    }
  }

  escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}

if (!customElements.get('stream-video')) {
  customElements.define('stream-video', StreamVideo);
}

// Export for ES modules / bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreamVideo;
}
`;
  }

  // Boolean attribute helper - supports "true", "false", presence, absence
  boolAttr(name, defaultValue) {
    if (!this.hasAttribute(name)) return defaultValue;
    const v = this.getAttribute(name);
    return v !== 'false' && v !== '0' && v !== 'no';
  }

  render() {
    const uid = this.uid;
    if (!uid) {
      this.innerHTML = '<!-- stream-video: missing uid -->';
      return;
    }

    const mode = this.mode;
    const posterTime = this.getAttribute('poster-time') || '0s';
    const klass = this.getAttribute('class') || '';
    const style = this.getAttribute('style') || '';

    // Forward styling to inner element only when set on host
    const innerAttrs = [];
    if (klass) innerAttrs.push(\`class="\${this.escapeAttr(klass)}"\`);
    if (style) innerAttrs.push(\`style="\${this.escapeAttr(style)}"\`);

    let html;
    switch (mode) {
      case 'hero':
        html = this.renderHero(innerAttrs, posterTime);
        break;
      case 'iframe':
        html = this.renderIframe(innerAttrs, posterTime);
        break;
      case 'thumbnail':
        html = this.renderThumbnail(innerAttrs, posterTime);
        break;
      case 'player':
      default:
        html = this.renderPlayer(innerAttrs, posterTime);
        break;
    }

    this.innerHTML = html;

    // Wire up HLS for player mode if browser doesn't natively support it
    if (mode === 'player') this.attachHlsIfNeeded();
  }

  renderHero(innerAttrs, posterTime) {
    // Hero loops use MP4 download URL (faster than HLS for short autoplay loops)
    const muted = this.boolAttr('muted', true);
    const autoplay = this.boolAttr('autoplay', true);
    const loop = this.boolAttr('loop', true);
    const controls = this.boolAttr('controls', false);

    const attrs = [
      autoplay ? 'autoplay' : '',
      muted ? 'muted' : '',
      loop ? 'loop' : '',
      controls ? 'controls' : '',
      'playsinline',
      'preload="metadata"',
      \`poster="\${this.url(\`thumbnails/thumbnail.jpg?time=\${posterTime}\`)}"\`,
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<video \${attrs}>
  <source src="\${this.url('downloads/default.mp4')}" type="video/mp4">
  <slot name="fallback">Your browser does not support video.</slot>
</video>\`;
  }

  renderPlayer(innerAttrs, posterTime) {
    // Full playback uses HLS (adaptive bitrate)
    const muted = this.boolAttr('muted', false);
    const autoplay = this.boolAttr('autoplay', false);
    const loop = this.boolAttr('loop', false);
    const controls = this.boolAttr('controls', true);

    const attrs = [
      autoplay ? 'autoplay' : '',
      muted ? 'muted' : '',
      loop ? 'loop' : '',
      controls ? 'controls' : '',
      'playsinline',
      'preload="metadata"',
      \`poster="\${this.url(\`thumbnails/thumbnail.jpg?time=\${posterTime}\`)}"\`,
      \`data-hls="\${this.url('manifest/video.m3u8')}"\`,
      \`data-mp4="\${this.url('downloads/default.mp4')}"\`,
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<video \${attrs}>
  <slot name="fallback">Your browser does not support video.</slot>
</video>\`;
  }

  renderIframe(innerAttrs, posterTime) {
    const params = new URLSearchParams();
    if (this.boolAttr('autoplay', false)) params.set('autoplay', 'true');
    if (this.boolAttr('muted', false)) params.set('muted', 'true');
    if (this.boolAttr('loop', false)) params.set('loop', 'true');
    if (posterTime !== '0s') params.set('poster', \`\${this.url('thumbnails/thumbnail.jpg')}?time=\${posterTime}\`);
    
    const qs = params.toString();
    const src = \`\${this.url('iframe')}\${qs ? '?' + qs : ''}\`;

    const attrs = [
      \`src="\${src}"\`,
      'allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"',
      'allowfullscreen',
      'loading="lazy"',
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<iframe \${attrs}></iframe>\`;
  }

  renderThumbnail(innerAttrs, posterTime) {
    const alt = this.getAttribute('alt') || 'Video thumbnail';
    const attrs = [
      \`src="\${this.url(\`thumbnails/thumbnail.jpg?time=\${posterTime}\`)}"\`,
      \`alt="\${this.escapeAttr(alt)}"\`,
      'loading="lazy"',
      ...innerAttrs,
    ].filter(Boolean).join(' ');

    return \`<img \${attrs}>\`;
  }

  attachHlsIfNeeded() {
    const video = this.querySelector('video');
    if (!video) return;
    const hls = video.dataset.hls;
    const mp4 = video.dataset.mp4;
    if (!hls) return;

    // Safari and iOS support HLS natively
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hls;
      return;
    }

    // Other browsers: try hls.js
    if (window.Hls && window.Hls.isSupported()) {
      const hlsInstance = new window.Hls();
      hlsInstance.loadSource(hls);
      hlsInstance.attachMedia(video);
      hlsInstance.on(window.Hls.Events.ERROR, () => {
        // Fallback to MP4 if HLS fails
        video.src = mp4;
      });
      return;
    }

    // No HLS support and no hls.js — use MP4 fallback
    video.src = mp4;
    
    // Optionally lazy-load hls.js once and re-attempt
    if (!window.__streamVideoHlsLoading) {
      window.__streamVideoHlsLoading = true;
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
      script.onload = () => {
        // Re-render any player-mode components on the page
        document.querySelectorAll('stream-video[mode="player"], stream-video:not([mode])').forEach(el => {
          if (el.attachHlsIfNeeded) el.attachHlsIfNeeded();
        });
      };
      document.head.appendChild(script);
    }
  }

  escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}

if (!customElements.get('stream-video')) {
  customElements.define('stream-video', StreamVideo);
}

// Export for ES modules / bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreamVideo;
}
`;

const ACCOUNT_ID = '77f3d6611f5ceab7651744268d434342';
const STREAM_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`;
const CUSTOMER_SUBDOMAIN = 'customer-iy642ze20tq7w2hz.cloudflarestream.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'Content-Type': 'application/json', ...cors },
});

const err = (msg, status = 400) => json({ success: false, error: msg }, status);

async function streamFetch(env, path, options = {}) {
  const res = await fetch(`${STREAM_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.STREAM_API_TOKEN}`,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

function buildPlaybackUrls(uid) {
  return {
    hls: `https://${CUSTOMER_SUBDOMAIN}/${uid}/manifest/video.m3u8`,
    dash: `https://${CUSTOMER_SUBDOMAIN}/${uid}/manifest/video.mpd`,
    iframe: `https://${CUSTOMER_SUBDOMAIN}/${uid}/iframe`,
    thumbnail: `https://${CUSTOMER_SUBDOMAIN}/${uid}/thumbnails/thumbnail.jpg`,
    mp4_download: `https://${CUSTOMER_SUBDOMAIN}/${uid}/downloads/default.mp4`,
  };
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  return token === env.STREAM_AUTH_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check (public)
    if (path === '/' || path === '/health') {
      return json({
        service: 'stream-api',
        status: 'ok',
        subdomain: CUSTOMER_SUBDOMAIN,
        endpoints: ['GET /list', 'GET /:uid', 'POST /upload', 'POST /migrate', 'DELETE /:uid', 'GET /component.js'],
      });
    }

    // Component JS (public, no auth)
    if (path === '/component.js' || path === '/stream-video.js') {
      return new Response(STREAM_VIDEO_COMPONENT, {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Auth required for everything else
    if (!checkAuth(request, env)) return err('unauthorized', 401);

    // GET /list
    if (path === '/list' && request.method === 'GET') {
      const data = await streamFetch(env, '');
      if (!data.success) return err(data.errors?.[0]?.message || 'list failed', 500);
      const videos = (data.result || []).map(v => ({
        uid: v.uid,
        name: v.meta?.name || v.uid,
        duration: v.duration,
        size: v.size,
        ready: v.readyToStream,
        created: v.created,
        urls: buildPlaybackUrls(v.uid),
      }));
      return json({ success: true, count: videos.length, videos });
    }

    // POST /upload - returns one-time direct upload URL
    if (path === '/upload' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const data = await streamFetch(env, '/direct_upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxDurationSeconds: body.maxDurationSeconds || 3600,
          meta: body.meta || {},
          requireSignedURLs: body.requireSignedURLs || false,
        }),
      });
      if (!data.success) return err(data.errors?.[0]?.message || 'upload init failed', 500);
      return json({ success: true, uploadURL: data.result.uploadURL, uid: data.result.uid });
    }

    // POST /migrate - copy from URL (auto-enables MP4 download)
    if (path === '/migrate' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (!body.url) return err('url required');
      const data = await streamFetch(env, '/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: body.url,
          meta: body.meta || { name: body.url.split('/').pop() },
        }),
      });
      if (!data.success) return err(data.errors?.[0]?.message || 'migrate failed', 500);
      
      // Fire-and-forget: trigger MP4 download generation
      // (only succeeds once video is ready, so retry is needed for new uploads)
      streamFetch(env, `/${data.result.uid}/downloads`, { method: 'POST' }).catch(() => {});
      
      return json({
        success: true,
        uid: data.result.uid,
        urls: buildPlaybackUrls(data.result.uid),
        status: data.result.status,
        note: 'MP4 download generation triggered; available within 1-2 min after video is ready',
      });
    }
    
    // POST /:uid/enable-mp4 - manually trigger MP4 download generation
    if (path.endsWith('/enable-mp4') && request.method === 'POST') {
      const uid = path.split('/')[1];
      const data = await streamFetch(env, `/${uid}/downloads`, { method: 'POST' });
      if (!data.success) return err(data.errors?.[0]?.message || 'enable failed', 500);
      return json({ success: true, status: data.result.default });
    }

    // GET /:uid
    if (request.method === 'GET' && path.length > 1) {
      const uid = path.slice(1);
      const data = await streamFetch(env, `/${uid}`);
      if (!data.success) return err(data.errors?.[0]?.message || 'not found', 404);
      const v = data.result;
      return json({
        success: true,
        uid: v.uid,
        name: v.meta?.name,
        duration: v.duration,
        ready: v.readyToStream,
        status: v.status,
        urls: buildPlaybackUrls(v.uid),
      });
    }

    // DELETE /:uid
    if (request.method === 'DELETE' && path.length > 1) {
      const uid = path.slice(1);
      const data = await streamFetch(env, `/${uid}`, { method: 'DELETE' });
      if (!data.success) return err(data.errors?.[0]?.message || 'delete failed', 500);
      return json({ success: true, deleted: uid });
    }

    return err('not found', 404);
  },
};
