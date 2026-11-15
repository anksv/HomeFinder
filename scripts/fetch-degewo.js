// Fetches current rental flats from degewo.de (municipal Berlin housing company) into data/degewo.json.
// degewo's robots.txt allows /immosuche. Pagination links carry a cHash, so they are followed from the page, not built.
// Many flats require a WBS (housing entitlement certificate); this is kept in the description.
// Run: npm run fetch:dg   (Node 18+, no dependencies)
const fs = require('fs');
const path = require('path');

const BASE = 'https://www.degewo.de';
const UA = 'Mozilla/5.0 (compatible; HomeFinderBot/0.1; personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x3D;|&#61;/g, '=').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));

function parse(html) {
  const out = [];
  const starts = [...html.matchAll(/data-openimmo-bookmark-item-uid="([^"]+)"/g)];
  starts.forEach((m, i) => {
    const seg = html.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : m.index + 6000);
    const cells = decode(seg.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').split('|').map((c) => c.trim()).filter(Boolean);
    const pi = cells.findIndex((c) => /^[\d.,]+ €$/.test(c));
    const ri = cells.indexOf('Zimmer');
    const si = cells.indexOf('m²');
    if (pi < 0 || ri < 1 || si < 1) return;
    const detail = (seg.match(/href="(\/immosuche\/details\/[^"]+)"/) || [])[1];
    // cells: [uid attr, title, "Street | District", ...feature chips..., price, "Warmmiete", rooms, "Zimmer", size, "m²", date|"sofort", "frei ab"]
    const [street, district] = (cells[2] || '').split(/\s*(?:\||&#124;)\s*/);
    const tags = cells.slice(3, pi);
    const date = cells.find((c) => /^\d{2}\.\d{2}\.\d{4}$/.test(c));
    out.push({
      id: `dg-${m[1]}`, title: cells[1], address: `${street}, ${district || 'Berlin'}, Berlin`, district: district || 'Berlin',
      type: 'apartment', mode: 'rent', size: num(cells[si - 1]), rooms: num(cells[ri - 1]), price: num(cells[pi]),
      floor: null, available: date ? date.split('.').reverse().join('-') : null, source: 'degewo',
      url: detail ? BASE + detail : `${BASE}/immosuche`,
      description: `Warm rent${date ? '' : ', available now'}. ${tags.join(', ')}`.trim(),
    });
  });
  return out;
}

(async () => {
  const all = new Map();
  let html = await (await fetch(`${BASE}/immosuche`, { headers: { 'User-Agent': UA } })).text();
  const nextLink = (h, p) => {
    for (const m of h.matchAll(/href="(\/immosuche\?[^"]*?%5Bpage%5D(?:&#x3D;|=)(\d+)[^"]*)"/g)) if (+m[2] === p) return decode(m[1]).replace(/#.*$/, '');
    return null;
  };
  for (let p = 1; p <= 30; p++) {
    const items = parse(html);
    items.forEach((i) => all.set(i.id, i));
    console.log(`degewo page ${p} -> ${items.length} listings`);
    const next = nextLink(html, p + 1);
    if (!next) break;
    await sleep(2500);
    html = await (await fetch(BASE + next, { headers: { 'User-Agent': UA } })).text();
  }
  if (!all.size) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'degewo.json'), JSON.stringify([...all.values()], null, 2));
  console.log(`Wrote ${all.size} listings to data/degewo.json`);
})();
