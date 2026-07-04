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

    // Copy headers but remove host-related ones
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('x-forwarded-for');
    headers.delete('x-forwarded-proto');

    // Custom stream type UA/Referer
    const streamType = url.searchParams.get('type');
    if (streamType === 'premium1') {
      headers.set('Referer', 'https://aesport.tv/');
      headers.set('Origin', 'https://aesport.tv/');
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    } else if (streamType === 'mobile-stream') {
      headers.set('Referer', 'https://aesport.tv/');
      headers.set('Origin', 'https://aesport.tv/');
      headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile Safari/604.1');
    } else {
      headers.set('Referer', 'https://aesport.tv/');
      headers.set('Origin', 'https://aesport.tv/');
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    }

    // Forward request with body if needed
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
      redirect: 'follow'
    });

    try {
      const response = await fetch(modifiedRequest);

      // Clone response properly
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');

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
