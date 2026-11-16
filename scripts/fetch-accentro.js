// Fetches Berlin condominiums for sale from accentro.de into data/accentro.json.
// accentro.de's robots.txt allows everything. The list page does not paginate, so listing URLs come from its sitemap and each
// ad page is read once (schema.org JSON-LD plus the "Objektdaten" table: price and "Vermietet" flag).
// Run: npm run fetch:ac   (Node 18+, no dependencies, ~6 min for ~135 ads)
const fs = require('fs');
const path = require('path');

const BASE = 'https://accentro.de';
const UA = 'Mozilla/5.0 (compatible; HomeFinderBot/0.1; personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));
const get = async (url) => fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });

function parse(html, url) {
  let apt;
  let listing;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const found = (JSON.parse(m[1])['@graph'] || []).find((g) => g['@type'] === 'Apartment');
      if (found) apt = found;
      const l = (JSON.parse(m[1])['@graph'] || []).find((g) => g['@type'] === 'RealEstateListing');
      if (l) listing = l;
    } catch { /* ignore other blocks */ }
  }
  if (!apt) return null; // offices, shops, practices
  const cells = decode(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').split('|').map((c) => c.trim()).filter(Boolean);
  const price = (cells[cells.indexOf('Kaufpreis') + 1] || '').replace(/ €$/, '');
  const rentedI = cells.findIndex((c, i) => c === 'Vermietet' && /^(Ja|Nein)$/.test(cells[i + 1]));
  const rentedCell = rentedI < 0 ? undefined : cells[rentedI + 1];
  const size = apt.floorSize?.value;
  if (!/^[\d.,]+$/.test(price) || !size || !apt.numberOfRooms) return null;
  const district = ((apt.name || '').split(',').pop() || '').trim().replace(/^Berlin-/, '') || 'Berlin';
  const a = apt.address || {};
  const floor = Number.parseInt(apt.floorLevel, 10);
  return {
    id: `ac-${url.split('/').pop()}`, title: listing?.name || apt.name, address: `${a.streetAddress}, ${a.postalCode} ${a.addressLocality}`,
    district, type: 'apartment', mode: 'buy', size: Math.round(size * 100) / 100, rooms: apt.numberOfRooms, price: num(price),
    floor: Number.isNaN(floor) ? null : floor, available: null, source: 'ACCENTRO', url, rented: rentedCell ? rentedCell === 'Ja' : null,
    description: listing?.description || apt.description || '',
  };
}

(async () => {
  const sitemap = await (await get(`${BASE}/de/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]*\/de\/immobilien\/[^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !/praxis|bueroflaeche|ladenlokal|gewerbe|stellplatz/.test(u));
  console.log(`${urls.length} candidate ads in sitemap`);
  const all = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await get(url);
      if (res.ok) { const l = parse(await res.text(), url); if (l) all.push(l); }
    } catch (e) { console.warn(`${url}: ${e.message}`); }
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${urls.length}`);
    await sleep(2500);
  }
  if (!all.length) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'accentro.json'), JSON.stringify(all, null, 2));
  console.log(`Wrote ${all.length} listings to data/accentro.json`);
})();
