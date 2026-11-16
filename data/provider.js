// Data source: merges every fetched source file in data/ (kleinanzeigen.json, engelvoelkers.json, ...),
// falling back to the bundled sample data when none exist. Refresh with `npm run fetch`.
// immowelt and ImmoScout24 block automated access with CAPTCHAs, so they need an official API/partner feed.
const fs = require('fs');
const path = require('path');
const { detectRented } = require('./rented');
const { analyze } = require('./analysis');

const SOURCES = ['kleinanzeigen.json', 'engelvoelkers.json', 'ohnemakler.json', 'degewo.json', 'wbm.json', 'accentro.json', 'rasmussen.json', 'guthmann.json', 'berlinhaus.json'];

async function getListings() {
  const found = SOURCES.map((f) => path.join(__dirname, f)).filter((f) => fs.existsSync(f));
  if (!found.length) return JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-listings.json'), 'utf8'));
  const all = found.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  // rented applies to for-sale listings; fetchers that checked the ad set it, others fall back to the text
  // a few sellers post sale ads in the rent category; a monthly rent above 10,000 is such a mistake
  return all.filter((l) => !(l.mode === 'rent' && l.price > 10000)).map((l) => ({ ...l, analysis: analyze(l), rented: l.mode !== 'buy' ? null : l.rented !== undefined ? l.rented : detectRented(`${l.title} ${l.description}`) }));
}

module.exports = { getListings };
