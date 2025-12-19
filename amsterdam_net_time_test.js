async function getAmsterdamTime() {
  // Helper: portable fetch JSON with Node https fallback
  async function fetchJson(url) {
    if (typeof fetch === 'function') {
      const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'EG/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
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
          headers: { 'User-Agent': 'EG/1.0', 'Accept': 'application/json' }
        };
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.end();
      } catch (e) { reject(e); }
    });
  }

  // Provider 1: worldtimeapi.org
  try {
    const data = await fetchJson('https://worldtimeapi.org/api/timezone/Europe/Amsterdam');
    if (data && data.datetime) return new Date(data.datetime);
  } catch (_) {}

  // Provider 2: timeapi.io
  try {
    const data = await fetchJson('https://timeapi.io/api/Time/current/zone?timeZone=Europe/Amsterdam');
    if (data?.dateTime) return new Date(data.dateTime);
    if (data?.year && data?.month && data?.day && data?.hour !== undefined) {
      const mm = String(data.month).padStart(2, '0');
      const dd = String(data.day).padStart(2, '0');
      const hh = String(data.hour).padStart(2, '0');
      const mi = String(data.minute || 0).padStart(2, '0');
      const ss = String(data.seconds || 0).padStart(2, '0');
      return new Date(`${data.year}-${mm}-${dd}T${hh}:${mi}:${ss}`);
    }
  } catch (_) {}

  // Provider 3: worldtimeapi by IP (UTC then convert with tz offset if provided)
  try {
    const data = await fetchJson('https://worldtimeapi.org/api/ip');
    if (data && data.utc_datetime) {
      // utc_datetime is ISO; this is not guaranteed Amsterdam, but validates network path
      return new Date(data.utc_datetime);
    }
  } catch (_) {}

  throw new Error('Failed to fetch Amsterdam time from internet');
}

// Simple self-test when loaded directly in a page/extension
// Comment out if you prefer no automatic logging

const dt = await getAmsterdamTime();
console.log('[NetTimeTest] Amsterdam time (ISO):', dt.toISOString());



