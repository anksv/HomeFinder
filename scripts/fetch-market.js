// Fetches Berlin price benchmarks (existing apartments, EUR per m2) per district and neighbourhood from guthmann.estate's
// Market Intelligence pages into data/market.json. robots.txt allows these pages. The detail view compares a listing with them.
// Run: npm run fetch:market   (Node 18+, no dependencies, ~30 s)
const fs = require('fs');
const path = require('path');

const UA = 'HomeFinderBot/0.1 (personal project)';
const BEZIRKE = ['mitte', 'friedrichshain-kreuzberg', 'pankow', 'charlottenburg-wilmersdorf', 'spandau', 'steglitz-zehlendorf', 'tempelhof-schoeneberg', 'neukoelln', 'treptow-koepenick', 'marzahn-hellersdorf', 'lichtenberg', 'reinickendorf'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const eur = (s) => (/^[\d.]+ €$/.test(s) ? Number(s.replace(/[. €]/g, '')) : null);

(async () => {
  const out = { source: 'guthmann.estate Market Intelligence (Bestandswohnungen)', fetched: new Date().toISOString().slice(0, 10), bezirke: {}, ortsteile: {} };
  for (const slug of BEZIRKE) {
    const html = await (await fetch(`https://guthmann.estate/de/market-intelligence/berlin/${slug}/`, { headers: { 'User-Agent': UA } })).text();
    const t = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|').replace(/\s+/g, ' ').replace(/(\| ?)+/g, '|');
    const top = (label) => eur(t.match(new RegExp(`${label}\\|([\\d.]+ €)\\|`))?.[1] || '');
    out.bezirke[slug] = { transaction: top('Ø Transaktionspreis pro m²'), offer: top('Ø Kaufangebotspreis pro m²'), rent: top('Ø Mietangebotspreis pro m²') };
    const start = t.indexOf('|Link|');
    const end = t.indexOf('Transaktionsdaten im Zeitverlauf');
    if (start < 0 || end < 0) { console.warn(`${slug}: no neighbourhood table`); continue; }
    // rows: a name token followed by value tokens (euro amounts or "keine Daten"), pct/trend tokens in between
    let name = null;
    let vals = [];
    const flush = () => { if (name && vals.length === 3) out.ortsteile[name] = { bezirk: slug, transaction: vals[0], offer: vals[1], rent: vals[2] }; };
    for (const tok of t.slice(start + 6, end).split('|')) {
      if (/^[\d.]+ €$/.test(tok)) vals.push(eur(tok));
      else if (tok === 'keine Daten') vals.push(null);
      else if (/^(Rückgang|Anstieg|gleichbleibend|: |[−+-]?\d+ %)$|^:$/.test(tok) || !tok.trim()) continue;
      else { flush(); name = tok.trim(); vals = []; }
    }
    flush();
    console.log(`${slug}: ${Object.values(out.ortsteile).filter((o) => o.bezirk === slug).length} neighbourhoods`);
    await sleep(2500);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'market.json'), JSON.stringify(out, null, 2));
  console.log(`Wrote ${Object.keys(out.ortsteile).length} neighbourhoods, ${Object.keys(out.bezirke).length} districts to data/market.json`);
})();
