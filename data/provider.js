// Data source: merges every fetched source file in data/ (kleinanzeigen.json, engelvoelkers.json, ...),
// falling back to the bundled sample data when none exist. Refresh with `npm run fetch`.
// immowelt and ImmoScout24 block automated access with CAPTCHAs, so they need an official API/partner feed.
const fs = require('fs');
const path = require('path');
const { detectRented } = require('./rented');

const SOURCES = ['kleinanzeigen.json', 'engelvoelkers.json', 'ohnemakler.json', 'degewo.json', 'wbm.json', 'accentro.json','rasmussen.json'];

async function getListings() {
  const found = SOURCES.map((f) => path.join(__dirname, f)).filter((f) => fs.existsSync(f));
  if (!found.length) return JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-listings.json'), 'utf8'));
  const all = found.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  // rented applies to for-sale listings; fetchers that checked the ad set it, others fall back to the text
  return all.map((l) => ({ ...l, rented: l.mode !== 'buy' ? null : l.rented !== undefined ? l.rented : detectRented(`${l.title} ${l.description}`) }));
}

module.exports = { getListings };
