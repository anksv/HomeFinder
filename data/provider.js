// Data source: data/listings.json (written by `npm run fetch`), falling back to the bundled sample data.
// Real listings come from scripts/fetch-kleinanzeigen.js. immowelt and ImmoScout24 block automated
// access with CAPTCHAs, so they need an official API/partner feed to be added here.
const fs = require('fs');
const path = require('path');

async function getListings() {
  for (const f of ['listings.json', 'sample-listings.json']) {
    const file = path.join(__dirname, f);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return [];
}

module.exports = { getListings };
