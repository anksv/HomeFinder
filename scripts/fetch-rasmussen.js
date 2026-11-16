// Fetches Berlin apartments for sale from rasmussenimmobilien.de into data/rasmussen.json.
// robots.txt only blocks /wp-admin/. The list page has ~9 ads and no pagination (page/2 repeats page 1), so every ad is read once.
// Run: npm run fetch:ras   (Node 18+, no dependencies, takes a few seconds)
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.rasmussenimmobilien.de';
const UA = 'HomeFinderBot/0.1 (personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#8211;/g, '-');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));
const get = (url) => fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });

function parse(html, url) {
  const title = decode((html.match(/<h1[^>]*>([^<]*)/) || [])[1] || '').trim();
  const text = decode(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const field = (label) => (text.match(new RegExp(`${label}: ([^:]*?)(?= (?:Stadt|Bereich|Landkreis|PLZ|Land|Objekt ID|Preis|Preisinformation|Grundstücksgröße|Räume|Schlafzimmer|Badezimmer|Benutzerdefinierte ID|Baujahr|Verfügbar ab|Etage|Keller):|$)`)) || [])[1]?.trim();
  const price = (field('Preis') || '').match(/^([\d.,]+) €/)?.[1];
  const size = text.match(/([\d.,]+) m 2 Wohnfläche/)?.[1];
  const rooms = field('Räume');
  if (!title || !price || !size || !rooms) return null; // commercial units and the like
  if (/gewerbe|laden/i.test(title) && !/wohnung|whg/i.test(title)) return null;
  if (field('Stadt') !== 'Berlin') return null; // e.g. a partner ad in Halle
  const street = (field('Adresse') || '').replace(/ in \d{5} .*$/, '');
  const zip = field('PLZ');
  const district = field('Bereich') || 'Berlin';
  const available = field('Verfügbar ab');
  const floor = Number.parseInt(field('Etage') || '', 10);
  return {
    id: `ras-${url.replace(/\/$/, '').split('/').pop().slice(0, 60)}`, title, address: [street, `${zip || ''} Berlin`.trim()].filter(Boolean).join(', '),
    district, type: 'apartment', mode: 'buy', size: num(size), rooms: parseFloat(rooms), price: num(price),
    floor: Number.isNaN(floor) ? null : floor, available: /^\d{4}-\d\d-\d\d$/.test(available || '') ? available : null,
    source: 'Rasmussen Immobilien', url, description: title,
  };
}

(async () => {
  const list = await (await get(`${BASE}/immobilien-kaufen/`)).text();
  const urls = [...new Set([...list.matchAll(/href="(https:\/\/www\.rasmussenimmobilien\.de\/immobilie\/[^"]+)"/g)].map((m) => m[1]))];
  console.log(`${urls.length} ads on the list page`);
  const all = [];
  for (const url of urls) {
    try {
      const res = await get(url);
      if (res.ok) { const l = parse(await res.text(), url); if (l) all.push(l); else console.log(`skipped (not a priced apartment): ${url}`); }
    } catch (e) { console.warn(`${url}: ${e.message}`); }
    await sleep(2500);
  }
  if (!all.length) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'rasmussen.json'), JSON.stringify(all, null, 2));
  console.log(`Wrote ${all.length} listings to data/rasmussen.json`);
})();
