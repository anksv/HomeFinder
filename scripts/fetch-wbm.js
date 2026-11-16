// Fetches current rental flats from wbm.de (Berlin municipal housing company) into data/wbm.json.
// wbm.de's robots.txt allows everything. Warm rent, street address included; many flats need a WBS.
// Run: npm run fetch:wbm   (Node 18+, no dependencies)
const fs = require('fs');
const path = require('path');

const { districtByZip } = require('../data/zipdistrict');

const BASE = 'https://www.wbm.de';
const UA = 'Mozilla/5.0 (compatible; HomeFinderBot/0.1; personal project)';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

function parse(html) {
  const zips = districtByZip();
  const urls = [...new Set([...html.matchAll(/href="(\/wohnungen-berlin\/angebote\/details\/[^"]+)"/g)].map((m) => m[1]))];
  const cells = decode(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').split('|').map((c) => c.trim()).filter(Boolean);
  const out = [];
  cells.forEach((c, i) => {
    if (!/^[\d.,]+ €$/.test(c) || cells[i + 1] !== 'Warmmiete') return;
    // cells: district, title, street, "zip Berlin", "Zum Exposé", title, "street, zip Berlin", price, Warmmiete, size, "m²"/Größe, rooms, Zimmer, features..., Ansehen
    const size = num(cells[i + 2]);
    const rooms = num(cells[i + 4]);
    const end = cells.indexOf('Ansehen', i);
    const tags = cells.slice(i + 6, end < 0 ? i + 12 : end);
    const n = out.length;
    out.push({
      id: `wbm-${(urls[n] || cells[i - 2]).split('/').filter(Boolean).pop()}`, title: cells[i - 2], address: cells[i - 1],
      district: zips[(cells[i - 1].match(/\b(\d{5})\b/) || [])[1]] || 'Berlin', type: 'apartment', mode: 'rent', size, rooms, price: num(c), floor: null, available: null,
      source: 'WBM', url: urls[n] ? BASE + urls[n] : `${BASE}/wohnungen-berlin/angebote/`, description: `Warm rent. ${tags.join(', ')}`.trim(),
    });
  });
  return out;
}

(async () => {
  const res = await fetch(`${BASE}/wohnungen-berlin/angebote/`, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.error(`${res.status}`); process.exit(1); }
  const items = parse(await res.text()).filter((l) => l.size > 0 && l.rooms > 0 && l.price > 0);
  if (!items.length) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'wbm.json'), JSON.stringify(items, null, 2));
  console.log(`Wrote ${items.length} listings to data/wbm.json`);
})();
