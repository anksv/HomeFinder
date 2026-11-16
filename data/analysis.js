// Compares a listing's price per m2 with the Berlin benchmarks in market.json (existing apartments, from guthmann.estate
// Market Intelligence; refresh with `npm run fetch:market`). Only apartments for sale are compared: houses and new builds are not
// covered, and rents are not like-for-like (the sources quote warm rent, the benchmark is net cold rent).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'market.json');
const norm = (s) => String(s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

let market = null;
let index = [];
if (fs.existsSync(FILE)) {
  market = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  index = Object.entries(market.ortsteile).map(([name, v]) => ({ name, key: norm(name), ...v }));
}

function findArea(district) {
  const d = norm(district);
  if (!d) return null;
  return index.find((o) => o.key === d)
    || index.filter((o) => ` ${d} `.includes(` ${o.key} `)).sort((a, b) => b.key.length - a.key.length)[0]
    || index.find((o) => o.key.split(' ').includes(d)) // "Treptow" -> "Alt-Treptow"
    || null;
}

const verdictFor = (ratio) => (ratio < 0.9 ? 'below' : ratio <= 1.1 ? 'fair' : ratio <= 1.25 ? 'above' : 'far-above');

function analyze(l) {
  if (!market || l.type !== 'apartment' || l.mode !== 'buy' || !l.size || !l.price) return null;
  const area = findArea(l.district);
  if (!area) return null;
  const benchmark = area.offer;
  if (!benchmark) return null;
  const ppm2 = l.price / l.size;
  const ratio = ppm2 / benchmark;
  return {
    area: area.name, ppm2: Math.round(ppm2 * 100) / 100, benchmark,
    transaction: area.transaction, diffPct: Math.round((ratio - 1) * 100), verdict: verdictFor(ratio), asOf: market.fetched,
  };
}

module.exports = { analyze };
