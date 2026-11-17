// Fetches Berlin apartments from escon-objekte.de (ESCON GmbH, a Berlin developer/broker) into data/escon.json.
// Its robots.txt allows everything. The "Einheiten" list (/objekte/?core_units_page=N) shows district, rooms, size and price on each card.
// The same units are shared through crm.propstack.de links, but that host disallows bots, so only escon-objekte.de is read.
// Run: npm run fetch:escon   (Node 18+, no dependencies, ~15 s)
const fs = require('fs');
const path = require('path');

const BASE = 'https://escon-objekte.de';
const UA = 'HomeFinderBot/0.1 (personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&#8211;/g, '-').replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

function parseCards(html) {
  const out = [];
  const parts = html.split(/href="(https:\/\/escon-objekte\.de\/immobilie\/[^"]+)"/);
  const seen = new Set();
  for (let i = 1; i < parts.length; i += 2) {
    const url = parts[i];
    if (seen.has(url)) continue;
    seen.add(url);
    const body = parts[i + 1].split(/Merkliste/)[0];
    const cells = decode(body.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).split('|').map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const title = cells.find((c) => c.length > 3);
    const loc = cells.find((c) => /^Berlin( · .+)?$/.test(c)); // other cities (Potsdam, Hohen Neuendorf) are skipped
    const rooms = cells.find((c) => /^[\d,]+ Zimmer$/.test(c));
    const size = cells.find((c) => /^[\d.,]+ m²$/.test(c));
    const pi = cells.findIndex((c) => /^(Kaufpreis|Mietpreis|Kaltmiete|Warmmiete|Miete)$/.test(c));
    const price = pi < 0 ? null : cells[pi + 1];
    if (!loc || !rooms || !size || !price || !/^[\d.,]+ €$/.test(price)) continue;
    out.push({
      id: `es-${url.replace(/\/$/, '').split('/').pop().slice(0, 70)}`, title, address: loc.replace(' · ', ', '), district: loc.split(' · ')[1] || 'Berlin',
      type: 'apartment', mode: /^Kauf/.test(cells[pi]) ? 'buy' : 'rent', size: num(size), rooms: num(rooms), price: num(price),
      floor: null, available: null, source: 'ESCON', url, description: title,
      ...(cells.includes('Aktuell vermietet') ? { rented: true } : {}),
    });
  }
  return out;
}

(async () => {
  const all = new Map();
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${BASE}/objekte/?core_units_page=${page}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });
    if (!res.ok) break;
    const cards = parseCards(await res.text());
    const before = all.size;
    for (const c of cards) all.set(c.id, c);
    console.log(`page ${page}: ${cards.length} Berlin cards`);
    if (all.size === before) break; // past the last page
    await sleep(2500);
  }
  if (!all.size) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'escon.json'), JSON.stringify([...all.values()], null, 2));
  console.log(`Wrote ${all.size} listings to data/escon.json`);
})();
