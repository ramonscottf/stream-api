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
        endpoints: ['GET /list', 'GET /:uid', 'POST /upload', 'POST /migrate', 'DELETE /:uid'],
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

    // POST /migrate - copy from URL
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
      return json({
        success: true,
        uid: data.result.uid,
        urls: buildPlaybackUrls(data.result.uid),
        status: data.result.status,
      });
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
