// Perantara login Neon Auth: browser -> distribusi.vercel.app/api/neonauth/* -> Neon.
// Tujuannya agar cookie sesi dianggap milik domain aplikasi (Safari/iPhone memblokir cookie pihak ketiga).
const BASE = 'https://ep-sweet-violet-b3cm8n6p.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
const DROP = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding', 'keep-alive', 'upgrade', 'forwarded', 'x-real-ip']);

function setCookies(h) {
  if (typeof h.getSetCookie === 'function') return h.getSetCookie();
  const raw = h.get('set-cookie');
  return raw ? raw.split(/,\s*(?=[^;,\s]+=)/) : [];
}

module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    // Ambil path dari URL asli (paling andal di Vercel); req.query.path hanya cadangan.
    let p = '';
    const m = u.pathname.match(/^\/api\/neonauth\/?(.*)$/);
    if (m && m[1]) p = decodeURIComponent(m[1]);
    if (!p) p = [].concat((req.query && req.query.path) || []).join('/');
    p = p.replace(/^\/+/, '');
    u.searchParams.delete('path');
    const target = BASE + '/' + p + (u.search || '');

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const l = k.toLowerCase();
      if (DROP.has(l) || l.startsWith('x-forwarded-') || l.startsWith('x-vercel-')) continue;
      headers[l] = Array.isArray(v) ? v.join(', ') : v;
    }

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body != null) {
      const b = req.body;
      body = Buffer.isBuffer(b) || typeof b === 'string' ? b : JSON.stringify(b);
    }

    const r = await fetch(target, { method: req.method, headers, body, redirect: 'manual' });

    res.statusCode = r.status;
    r.headers.forEach((v, k) => {
      const l = k.toLowerCase();
      if (['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie'].includes(l) || l.startsWith('access-control-')) return;
      res.setHeader(k, v);
    });
    const sc = setCookies(r.headers).map(c => c.replace(/;\s*Domain=[^;]*/gi, ''));
    if (sc.length) res.setHeader('Set-Cookie', sc);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('x-proxy-target', '/' + p);
    res.setHeader('x-proxy-upstream', String(r.status));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Gagal menghubungi server login: ' + (e && e.message || e) }));
  }
};
