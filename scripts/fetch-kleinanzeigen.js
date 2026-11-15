// Fetches a few result pages of Berlin listings from kleinanzeigen.de and writes data/kleinanzeigen.json.
// Polite by design: robots.txt-permitted search pages only, a delay between requests, small page count.
// Run: npm run fetch   (Node 18+, no dependencies)
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.kleinanzeigen.de';
const SOURCES = [
  { mode: 'rent', type: 'apartment', slug: 's-wohnung-mieten/berlin', code: 'c203l3331', pages: 3 },
  { mode: 'buy', type: 'apartment', slug: 's-eigentumswohnung/berlin', code: 'c196l3331', pages: 2 },
  { mode: 'buy', type: 'house', slug: 's-haus-kaufen/berlin', code: 'c208l3331', pages: 1 },
];
const UA = 'Mozilla/5.0 (compatible; HomeFinderBot/0.1; personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

function parse(html, src) {
  const out = [];
  const re = /<article[^>]*data-adid="(\d+)" data-href="([^"]+)">([\s\S]*?)<\/article>/g;
  let m;
  while ((m = re.exec(html))) {
    const [, id, href, body] = m;
    const text = decode(body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ');
    const cells = text.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.some((c) => c.startsWith('Gesuch'))) continue; // "wanted" ads
    const facts = cells.find((c) => /m²/.test(c) && /Zi\./.test(c));
    const priceCell = cells.find((c) => /^[\d.,]+ €/.test(c));
    const loc = cells.find((c) => /^\d{5} /.test(c));
    if (!facts || !priceCell || !loc) continue;
    const size = num(facts.match(/([\d.,]+) m²/)[1]);
    const rooms = num(facts.match(/([\d.,]+) Zi\./)[1]);
    const price = num(priceCell.match(/^([\d.,]+) €/)[1]);
    const titleIdx = cells.indexOf(loc) + 1;
    out.push({
      id: `ka-${id}`, title: cells[titleIdx], address: `${loc}, Berlin`, district: loc.replace(/^\d{5} /, ''),
      type: src.type, mode: src.mode, size, rooms, price, floor: null, available: null,
      source: 'Kleinanzeigen', url: BASE + href, description: cells[titleIdx + 1] || '',
    });
  }
  return out;
}

(async () => {
  const all = new Map();
  for (const src of SOURCES) {
    for (let p = 1; p <= src.pages; p++) {
      const url = `${BASE}/${src.slug}/${p > 1 ? `seite:${p}/` : ''}${src.code}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });
      if (!res.ok) { console.warn(`${res.status} for ${url}, skipping`); continue; }
      const items = parse(await res.text(), src);
      items.forEach((i) => all.set(i.id, i));
      console.log(`${url} -> ${items.length} listings`);
      await sleep(2500);
    }
  }
  const file = path.join(__dirname, '..', 'data', 'kleinanzeigen.json');
  if (!all.size) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(file, JSON.stringify([...all.values()], null, 2));
  console.log(`Wrote ${all.size} listings to data/kleinanzeigen.json`);
})();
