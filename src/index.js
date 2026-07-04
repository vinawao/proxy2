export default {
  async fetch(request, env, ctx) {
    // Handle preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': request.headers.get("Access-Control-Request-Headers") || "*",
        }
      });
    }

    const url = new URL(request.url);
    let targetUrl = url.searchParams.get('url');

    // Support path style: /https://example.com/api
    if (!targetUrl) {
      const pathTarget = url.pathname.slice(1);
      if (pathTarget) {
        targetUrl = decodeURIComponent(pathTarget);
      }
    }

    if (!targetUrl) {
      return new Response("Missing target URL", { status: 400 });
    }

    // Clean headers
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('x-forwarded-for');
    headers.delete('x-forwarded-proto');

    // Custom stream type UA/Referer
    const streamType = url.searchParams.get('type');
    headers.set('Referer', 'https://aesport.tv/');
    headers.set('Origin', 'https://aesport.tv/');
    headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile Safari/604.1');
    if (streamType === 'mobile-stream') {
      headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile Safari/604.1');
    } else {
      headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile Safari/604.1');
    }

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      redirect: 'follow'
    });

    try {
      const response = await fetch(modifiedRequest);

      // Clone headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');

      // Tambahan: deteksi manifest/segmen
      if (targetUrl.endsWith('.m3u8')) {
        newHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
        newHeaders.set('Cache-Control', 'no-cache');
      } else if (targetUrl.endsWith('.mpd')) {
        newHeaders.set('Content-Type', 'application/dash+xml');
        newHeaders.set('Cache-Control', 'no-cache');
      } else if (targetUrl.endsWith('.ts')) {
        newHeaders.set('Content-Type', 'video/mp2t');
      } else if (targetUrl.endsWith('.mp4')) {
        newHeaders.set('Content-Type', 'video/mp4');
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    } catch (e) {
      return new Response("Error fetching stream: " + e.message, { status: 500 });
    }
  }
};

