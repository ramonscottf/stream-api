/**
 * stream-api client helper - drop into any Worker
 * 
 * Set STREAM_AUTH_TOKEN as a secret in your Worker, then:
 *
 *   import { stream } from './stream-client.js';
 *   const { uid, urls } = await stream(env).migrate('https://r2.example.com/video.mp4');
 */

export function stream(env, baseUrl = 'https://stream.fosterlabs.org') {
  const auth = { 'Authorization': `Bearer ${env.STREAM_AUTH_TOKEN}` };
  const json = { ...auth, 'Content-Type': 'application/json' };

  return {
    async list() {
      const r = await fetch(`${baseUrl}/list`, { headers: auth });
      return r.json();
    },
    async get(uid) {
      const r = await fetch(`${baseUrl}/${uid}`, { headers: auth });
      return r.json();
    },
    async upload(meta = {}) {
      const r = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ meta }),
      });
      return r.json(); // { uploadURL, uid }
    },
    async migrate(url, meta = {}) {
      const r = await fetch(`${baseUrl}/migrate`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ url, meta }),
      });
      return r.json(); // { uid, urls }
    },
    async delete(uid) {
      const r = await fetch(`${baseUrl}/${uid}`, {
        method: 'DELETE',
        headers: auth,
      });
      return r.json();
    },
  };
}
