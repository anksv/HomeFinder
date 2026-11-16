// Maps a Berlin postcode to its most common district name in the other sources' data. Used by sources that give a postcode
// but no (reliable) district: WBM and Berlinhaus.
const fs = require('fs');
const path = require('path');

function districtByZip() {
  const counts = {};
  for (const f of fs.readdirSync(__dirname).filter((x) => x.endsWith('.json') && !/^(sample|market|berlinhaus|wbm)/.test(x))) {
    for (const l of JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'))) {
      const zip = (l.address || '').match(/\b(1[0-4]\d{3})\b/)?.[1];
      if (zip && l.district && l.district !== 'Berlin' && l.district.length < 30) { counts[zip] = counts[zip] || {}; counts[zip][l.district] = (counts[zip][l.district] || 0) + 1; }
    }
  }
  return Object.fromEntries(Object.entries(counts).map(([z, d]) => [z, Object.entries(d).sort((a, b) => b[1] - a[1])[0][0]]));
}

module.exports = { districtByZip };
