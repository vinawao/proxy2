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
    const streamType = url.searchParams.get('type');

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

    // Daftar fallback URL (mirror)
    const fallbackUrls = [
      targetUrl,
      url.searchParams.get('backup1'),
      url.searchParams.get('backup2'),
      url.searchParams.get('backup3')
    ].filter(Boolean); // hanya ambil yang ada

    // Clean headers
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('x-forwarded-for');
    headers.delete('x-forwarded-proto');

    // Custom UA/Referer
    headers.set('Referer', 'https://aesport.tv/');
    headers.set('Origin', 'https://aesport.tv/');
    if (streamType === 'mobile-stream') {
      headers.set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile Safari/604.1');
    } else {
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    }

    // Fungsi fetch dengan fallback
    async function tryFetch(urls) {
      for (const u of urls) {
        try {
          const req = new Request(u, {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : undefined,
            redirect: 'follow'
          });
          const res = await fetch(req);
          if (res.ok) return res;
        } catch (e) {
          // lanjut ke fallback berikutnya
        }
      }
      throw new Error("All sources failed");
    }

    try {
      const response = await tryFetch(fallbackUrls);

      // Clone headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');

      // Deteksi manifest/segmen
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
      return new Response("Error fetching stream: " + e.message, { status: 502 });
    }
  }
};



Cara pakai:
- Panggil proxy dengan query ?url=...&backup1=...&backup2=...  
- Jika url gagal, otomatis coba backup1, lalu backup2, dst.  
- Cocok untuk HLS/DASH karena manifest .m3u8 dan segmen .ts akan tetap di-serve dengan header yang benar.  

👉 Dengan ini kamu bisa bikin multi-level failover langsung di proxy, tanpa harus mengandalkan player saja.  


  

