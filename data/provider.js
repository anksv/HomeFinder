// Data source: merges every fetched source file in data/ (kleinanzeigen.json, engelvoelkers.json, ...),
// falling back to the bundled sample data when none exist. Refresh with `npm run fetch`.
// immowelt and ImmoScout24 block automated access with CAPTCHAs, so they need an official API/partner feed.
const fs = require('fs');
const path = require('path');

const SOURCES = ['kleinanzeigen.json', 'engelvoelkers.json', 'ohnemakler.json', 'degewo.json'];

async function getListings() {
  const found = SOURCES.map((f) => path.join(__dirname, f)).filter((f) => fs.existsSync(f));
  if (!found.length) return JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-listings.json'), 'utf8'));
  return found.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
}

module.exports = { getListings };
