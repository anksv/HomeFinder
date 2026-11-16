// Fetches Berlin apartments for sale from guthmann.estate into data/guthmann.json.
// robots.txt allows everything except /api/. Ad URLs come from the sitemap (apartments-for-sale and investment-apartments);
// each ad is read once (schema.org JSON-LD plus the price and "10997 Berlin · Kreuzberg" lines). Investment apartments are
// sold with a tenant, so they are flagged rented.
// Run: npm run fetch:gu   (Node 18+, no dependencies, ~8 min for ~200 ads)
const fs = require('fs');
const path = require('path');

const UA = 'HomeFinderBot/0.1 (personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ');
const get = (url) => fetch(url, { headers: { 'User-Agent': UA } });

function parse(html, url, investment) {
  let apt;
  let listing;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      for (const g of JSON.parse(m[1])['@graph'] || []) {
        if (g['@type'] === 'Apartment') apt = g;
        if (g['@type'] === 'RealEstateListing') listing = g;
      }
    } catch { /* ignore other blocks */ }
  }
  if (!apt?.floorSize?.value || !apt.numberOfRooms) return null;
  const text = decode(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').replace(/(\| ?)+/g, '|');
  const price = text.match(/\|€([\d,]+)\|/)?.[1];
  const loc = text.match(/\|(\d{5}) Berlin · ([^|]+)\|/);
  if (!price || !loc) return null; // price on request, or not in Berlin
  const floor = Number.parseInt(apt.floorLevel, 10);
  const year = apt.yearBuilt ? ` Built ${apt.yearBuilt}.` : '';
  return {
    id: `gu-${url.replace(/\/$/, '').split('/').pop()}`, title: listing?.name || apt.name, address: `${loc[1]} Berlin`, district: loc[2].trim(),
    type: 'apartment', mode: 'buy', size: apt.floorSize.value, rooms: apt.numberOfRooms, price: Number(price.replace(/,/g, '')),
    floor: Number.isNaN(floor) ? null : floor, available: null, source: 'Guthmann Estate', url,
    description: `${listing?.description || ''}${year}`, ...(investment ? { rented: true } : {}),
  };
}

(async () => {
  const sitemap = await (await get('https://guthmann.estate/sitemap.xml')).text();
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/guthmann\.estate\/en\/properties\/(apartments-for-sale-berlin|investment-apartments-berlin)\/[^<]+)<\/loc>/g)].map((m) => [m[1], m[2].startsWith('invest')]);
  console.log(`${urls.length} ads in sitemap`);
  const all = [];
  for (const [i, [url, investment]] of urls.entries()) {
    try {
      const res = await get(url);
      if (res.ok) { const l = parse(await res.text(), url, investment); if (l) all.push(l); }
    } catch (e) { console.warn(`${url}: ${e.message}`); }
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${urls.length}`);
    await sleep(2500);
  }
  if (!all.length) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'guthmann.json'), JSON.stringify(all, null, 2));
  console.log(`Wrote ${all.length} listings to data/guthmann.json`);
})();
