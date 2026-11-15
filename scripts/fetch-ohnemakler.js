// Fetches Berlin listings from ohne-makler.net (private, commission-free offers) into data/ohnemakler.json.
// Only /immobilien/... category pages are used; its robots.txt disallows /immobilie/list/ and the detail print pages.
// Run: npm run fetch:om   (Node 18+, no dependencies)
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.ohne-makler.net';
const SOURCES = [
  { mode: 'buy', type: 'apartment', path: '/immobilien/wohnung-kaufen/berlin/berlin/', pages: 4 },
  { mode: 'rent', type: 'apartment', path: '/immobilien/wohnung-mieten/berlin/berlin/', pages: 3 },
  { mode: 'buy', type: 'house', path: '/immobilien/haus-kaufen/berlin/berlin/', pages: 2 },
];
const UA = 'Mozilla/5.0 (compatible; HomeFinderBot/0.1; personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

function parse(html, src) {
  const out = [];
  const re = /<a\s[^>]*?data-om-id="(\w+)"\s+data-om-type="(\w+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, id, , body] = m;
    const clean = body.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>|<button[\s\S]*?<\/button>/g, '');
    const cells = decode(clean.replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').split('|').map((c) => c.trim()).filter(Boolean);
    const priceI = cells.findIndex((c) => /^[\d.,]+ ?€/.test(c));
    const loc = cells.find((c) => /^\d{5} Berlin/.test(c));
    const rooms = cells.find((c) => /^\d+(,\d+)?$/.test(c));
    const size = cells.find((c) => /^[\d.,]+ ?m²$/.test(c));
    if (priceI < 0 || !loc || !rooms || !size) continue;
    const district = (loc.match(/\(([^)]+)\)/) || [])[1] || 'Berlin';
    out.push({
      id: `om-${id}`, title: cells[priceI + 1] || `${src.type} in ${district}`, address: loc, district,
      type: src.type, mode: src.mode, size: num(size), rooms: num(rooms), price: num(cells[priceI]),
      floor: null, available: null, source: 'ohne-makler.net', url: `${BASE}/immobilie/${id}/`, description: 'Private offer, no broker commission.',
    });
  }
  return out;
}

(async () => {
  const all = new Map();
  for (const src of SOURCES) {
    for (let p = 1; p <= src.pages; p++) {
      const url = `${BASE}${src.path}${p > 1 ? `?page=${p}` : ''}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });
      if (!res.ok) { console.warn(`${res.status} for ${url}, skipping`); continue; }
      const items = parse(await res.text(), src);
      items.forEach((i) => all.set(i.id, i));
      console.log(`${url} -> ${items.length} listings`);
      await sleep(2500);
    }
  }
  if (!all.size) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'ohnemakler.json'), JSON.stringify([...all.values()], null, 2));
  console.log(`Wrote ${all.size} listings to data/ohnemakler.json`);
})();
