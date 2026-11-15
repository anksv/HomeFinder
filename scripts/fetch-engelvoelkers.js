// Reads Berlin listing pages from engelvoelkers.com and writes data/engelvoelkers.json.
// The pages embed their first 35 results as JSON (Next.js __NEXT_DATA__); ?page=N is ignored by the site,
// so we take page one of four robots.txt-permitted Berlin pages (never the disallowed /search/ URLs).
// Run: npm run fetch:ev   (Node 18+, no dependencies)
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.engelvoelkers.com';
const PAGES = [
  { mode: 'rent', type: 'apartment', path: '/de/en/properties/res/rent/apartment/berlin/berlin' },
  { mode: 'rent', type: 'house', path: '/de/en/properties/res/rent/house/berlin/berlin' },
  { mode: 'buy', type: 'apartment', path: '/de/en/properties/res/sale/apartment/berlin/berlin' },
  { mode: 'buy', type: 'house', path: '/de/en/properties/res/sale/house/berlin/berlin' },
];
const UA = 'Mozilla/5.0 (compatible; HomeFinderBot/0.1; personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mid = (r) => (r ? (r.min + r.max) / 2 : null);

function parse(html, page) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  const queries = JSON.parse(m[1]).props.pageProps.dehydratedState?.queries || [];
  const hit = queries.find((q) => Array.isArray(q.state?.data?.listings));
  if (!hit) return [];
  const out = [];
  for (const { listing: l } of hit.state.data.listings) {
    const ac = Object.fromEntries((l.addressComponents || []).map((c) => [c.placeType, c.text]));
    if (ac.administrative_area_level_1 !== 'Berlin') continue; // sale search has a 10 km radius
    const size = mid(l.area?.livingSurface);
    const rooms = mid(l.rooms);
    const p = l.price || {};
    const price = page.mode === 'rent' ? mid(p.rentTotal) ?? mid(p.rentNet) : mid(p.salesPrice);
    if (!(size > 0 && rooms > 0 && price > 0)) continue; // skips price-on-request and projects without data
    const district = ac.sublocality_level_1 || ac.sublocality_level_2 || ac.locality || 'Berlin';
    out.push({
      id: `ev-${l.id}`, title: l.profile?.title || `${rooms}-room ${page.type}`, address: `${district}, Berlin`, district,
      type: page.type, mode: page.mode, size: Math.round(size * 10) / 10, rooms, price: Math.round(price), floor: null,
      available: null, source: 'Engel & Völkers', url: `${BASE}/de/en/exposes/${l.id}`,
      description: l.shopName ? `Offered by ${l.shopName}.` : '',
    });
  }
  return out;
}

(async () => {
  const all = new Map();
  for (const pg of PAGES) {
    const res = await fetch(BASE + pg.path, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
    if (!res.ok) { console.warn(`${res.status} for ${pg.path}, skipping`); continue; }
    const items = parse(await res.text(), pg);
    items.forEach((i) => all.set(i.id, i));
    console.log(`${pg.path} -> ${items.length} listings`);
    await sleep(2500);
  }
  if (!all.size) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'engelvoelkers.json'), JSON.stringify([...all.values()], null, 2));
  console.log(`Wrote ${all.size} listings to data/engelvoelkers.json`);
})();
