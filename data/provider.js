// Data source. Currently returns sample data from listings.json.
// To plug in a real source (immowelt, ImmoScout24, Kleinanzeigen/eBay, ...), return objects
// with the same shape from getListings(). Prefer official APIs or partner feeds: scraping
// these sites generally violates their terms of service.
const listings = require('./listings.json');

async function getListings() {
  return listings;
}

module.exports = { getListings };
