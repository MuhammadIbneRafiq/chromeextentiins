// Amsterdam time API smoke test (mirrors background.js providers first)
// Usage: node amsterdam_time_provider_test.js

(async () => {
  try {
    const hour = await getAmsterdamHour();
    const inRelax = hour >= 3 && hour < 6;
    console.log('[TimeTest] Amsterdam hour:', hour);
    console.log('[TimeTest] In relax window (03–06):', inRelax ? 'YES' : 'NO');
    process.exit(0);
  } catch (e) {
    console.error('[TimeTest] FAILED to get Amsterdam hour:', e?.message || e);
    process.exit(1);
  }
})();

async function getAmsterdamHour() {
  // fetch JSON with timeout and Node https fallback
  async function fetchJSON(url, timeoutMs = 3500) {
    if (typeof fetch === 'function') {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'EG/TimeTest' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally {
        clearTimeout(t);
      }
    }
    // Node https fallback (no external deps)
    return new Promise((resolve, reject) => {
      try {
        const https = require('https');
        const u = new URL(url);
        const options = {
          hostname: u.hostname,
          path: u.pathname + (u.search || ''),
          method: 'GET',
          headers: { 'User-Agent': 'EG/TimeTest', 'Accept': 'application/json' },
          timeout: timeoutMs,
        };
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        });
        req.on('timeout', () => { try { req.destroy(new Error('timeout')); } catch(_) {} });
        req.on('error', reject);
        req.end();
      } catch (e) { reject(e); }
    });
  }

  // Providers (mirror background.js priority): timeapi.io → worldtimeapi → aladhan
  const providers = [
    async () => {
      const j = await fetchJSON('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Amsterdam');
      if (j && typeof j.hour === 'number') return j.hour;
      if (j && j.dateTime) return new Date(j.dateTime).getHours();
      throw new Error('timeapi.io invalid');
    },
    async () => {
      const j = await fetchJSON('https://worldtimeapi.org/api/timezone/Europe/Amsterdam');
      if (j && j.datetime) return new Date(j.datetime).getHours();
      if (typeof j.unixtime === 'number') return new Date(j.unixtime * 1000).getUTCHours();
      throw new Error('worldtimeapi invalid');
    },
    async () => {
      const j = await fetchJSON('https://api.aladhan.com/v1/timingsByCity?city=Amsterdam&country=Netherlands');
      const ts = j && j.data && (j.data.date?.timestamp || j.data.date?.gregorian?.timestamp);
      if (ts) {
        const d = new Date(parseInt(ts, 10) * 1000);
        const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam' });
        return parseInt(fmt.format(d), 10);
      }
      throw new Error('aladhan invalid');
    },
  ];

  for (const fn of providers) {
    try {
      const hour = await fn();
      if (Number.isFinite(hour)) return hour;
    } catch (_) { /* try next */ }
  }

  // Fallback: compute using Intl timezone conversion from current clock
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hour12: false });
    return parseInt(fmt.format(Date.now()), 10);
  } catch (_) {}

  // Last resort: local hour
  return new Date().getHours();
}


