// Fetches Berlin apartments for rent from berlinhaus.com (a landlord/property manager) into data/berlinhaus.json.
// robots.txt only blocks /wp-admin/. Ad URLs come from the WordPress sitemap; each ad is read once. The site covers several
// cities and commercial units, so only Berlin ads with a living area and a room count are kept. The ad gives a postcode but no
// district, so the district is taken from the most common district of that postcode in the other sources' data.
// Run: npm run fetch:bh   (Node 18+, no dependencies, ~3 min)
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const { districtByZip } = require('../data/zipdistrict');
const UA = 'HomeFinderBot/0.1 (personal project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;/g, "'").replace(/&#8211;/g, '-').replace(/&#8230;/g, '…').replace(/&nbsp;/g, ' ');
const num = (s) => parseFloat(s.replace(/\./g, '').replace(',', '.'));
const get = (url) => fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });

function parse(html, url, zips) {
  const title = decode((html.match(/<h1[^>]*>([^<]*)/) || [])[1] || '').trim();
  const cells = decode(html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).replace(/\s+/g, ' ').split('|').map((c) => c.trim()).filter(Boolean);
  const after = (label) => cells[cells.indexOf(label) + 1];
  const ort = after('Ort') || '';
  const zip = ort.match(/^(\d{5}) Berlin$/)?.[1];
  const rent = after('Warmmiete:') || after('Kaltmiete:');
  const size = (after('Wohnfläche') || '').match(/([\d.,]+) m²/)?.[1];
  const rooms = after('Anzahl Zimmer');
  if (!title || !zip || !rent || !size || !rooms || !/^[\d.,]+$/.test(rooms)) return null;
  const available = after('Bezugsfrei ab:');
  const street = after('Adresse');
  return {
    id: `bh-${url.replace(/\/$/, '').split('/').pop().slice(0, 60)}`, title, address: `${street && street !== 'Ort' ? `${street}, ` : ''}${zip} Berlin`,
    district: zips[zip] || 'Berlin', type: 'apartment', mode: 'rent', size: num(size), rooms: num(rooms), price: num(rent.replace(/ €.*/, '')),
    floor: null, available: available && /^\d{2}\.\d{2}\.\d{4}$/.test(available) ? available : null, source: 'Berlinhaus', url, description: title,
  };
}

(async () => {
  const zips = districtByZip();
  const sm = await (await get('https://www.berlinhaus.com/wp-sitemap-posts-immobilie-1.xml')).text();
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`${urls.length} ads in sitemap`);
  const all = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await get(url);
      if (res.ok) { const l = parse(await res.text(), url, zips); if (l) all.push(l); }
    } catch (e) { console.warn(`${url}: ${e.message}`); }
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${urls.length}`);
    await sleep(2500);
  }
  if (!all.length) { console.error('Nothing fetched; leaving existing data untouched.'); process.exit(1); }
  fs.writeFileSync(path.join(DATA, 'berlinhaus.json'), JSON.stringify(all, null, 2));
  console.log(`Wrote ${all.length} Berlin apartments to data/berlinhaus.json`);
})();
