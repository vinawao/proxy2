export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    const url = new URL(request.url);
    const queryUrl = url.searchParams.get('url');
    const streamType = url.searchParams.get('type');

    let targetUrl = queryUrl;

    // Support path style: /https://example.com/api
    if (!targetUrl) {
      const pathTarget = url.pathname.slice(1); // hapus leading "/"
      if (pathTarget) {
        targetUrl = decodeURIComponent(pathTarget);
      }
    }

    if (!targetUrl) {
      return new Response("Missing target URL", { status: 400 });
    }

    const headers = new Headers(request.headers);

    if (streamType === 'premium1') {
      headers.set('Referer', 'https://aesport.tv/');
      headers.set('Origin', 'https://aesport.tv/');
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    } else if (streamType === 'mobile-stream') {
      headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15');
    } else {
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    }

    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      redirect: 'follow'
    });

    try {
      const response = await fetch(modifiedRequest);
      const newResponse = new Response(response.body, response);

      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    } catch (e) {
      return new Response("Error fetching stream", { status: 500 });
    }
  }
};
