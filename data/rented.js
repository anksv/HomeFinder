// Heuristic "currently rented" detection for for-sale listings, from free text.
// Returns true (let/tenanted), false (explicitly vacant) or null (unknown).
const VACANT = /unvermietet|nicht vermietet|bezugsfrei|mieterfrei|leerstehend|leer stehend|sofort frei|lieferbar|vacant/i;
const RENTED = /aktuell vermietet|\bvermietet(e[nrms]?)?\b|zurzeit vermietet|tenanted|currently let/i;

function detectRented(text) {
  if (!text) return null;
  if (RENTED.test(text.replace(VACANT, ' '))) return true;
  if (VACANT.test(text)) return false;
  return null;
}

module.exports = { detectRented };
