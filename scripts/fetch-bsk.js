// Fetches Berlin apartments for sale from bsk-immobilien.de into data/bsk.json.
// robots.txt allows the listing pages (it only blocks /suchen/, /preisfinder/, /merkliste/ and action URLs). The list at
// /kaufen/wohnungen/ shows 15 cards per page (/P15, /P30, ...) with district, size, rooms, price and a "Vermietet" flag.
// Run: npm run fetch:bsk   (Node 18+, no dependencies, ~30 s)
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.bsk-immobilien.de';
const UA = 'HomeFinderBot/0.1 (personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#178;/g, '²');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

function parseList(html) {
  // each card ends with a "Zum Objekt" link; put its URL into the text so a card always keeps its own URL
  const marked = html.replace(/<a href="(\/expose\/[^"]+)"[^>]*>\s*Zum Objekt/g, '@@$1@@ Zum Objekt');
  const text = decode(marked.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').replace(/(\| ?)+/g, '|');
  const parts = text.split(/@@(\/expose\/[^@]+)@@/);
  const re = /([^|]+)\|Berlin\|([^|]+)\|([^|]+)\|Wohnfläche:\|([\d.,]+) m ?²?\|(?:2\|)?Zimmer:\|([\d,]+)\|(?:Vermietet:\|(Ja|Nein)\|)?Kaufpreis:\|€ ([\d.,]+)\s*\|?\s*$/;
  const out = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const m = parts[i].slice(-500).match(re); // cards in Brandenburg (Potsdam, Stahnsdorf, ...) do not match
    if (!m) continue;
    const url = BASE + parts[i + 1];
    const area = m[2].trim();
    out.push({
      id: `bsk-${url.split('/').pop().slice(0, 70)}`, title: m[3].trim(), address: `Berlin, ${area.split(' / ').pop()}`, district: area.split(' / ').pop().replace(/ \(OT\)$/, ''),
      type: 'apartment', mode: 'buy', size: num(m[4]), rooms: num(m[5]), price: num(m[7]), floor: null, available: null,
      source: 'BSK Immobilien', url, description: `${m[1].trim()}. ${m[3].trim()}`, ...(m[6] ? { rented: m[6] === 'Ja' } : {}),
    });
  }
  return { cards: out, urls: parts.length >> 1 };
}

(async () => {
  const all = new Map();
  for (let offset = 0; offset < 600; offset += 15) {
    const res = await fetch(`${BASE}/kaufen/wohnungen/${offset ? `P${offset}` : ''}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });
    if (!res.ok) break;
    const { cards, urls } = parseList(await res.text());
    const before = all.size;
    for (const c of cards) all.set(c.id, c);
    console.log(`offset ${offset}: ${urls} ads, ${cards.length} parsed`);
    if (all.size === before) break; // past the last page
    await sleep(2500);
  }
  if (!all.size) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'bsk.json'), JSON.stringify([...all.values()], null, 2));
  console.log(`Wrote ${all.size} listings to data/bsk.json`);
})();
