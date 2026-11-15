const COLS = [
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'size', label: 'Size (m²)', type: 'number' },
  { key: 'rooms', label: 'Rooms', type: 'number' },
  { key: 'price', label: 'Price (€)', type: 'number' },
  { key: 'district', label: 'District', type: 'text' },
];
const state = { all: [], sort: { key: 'price', dir: 1 }, filters: {}, q: '', mode: '' };
const $ = (id) => document.getElementById(id);
const eur = (n) => n.toLocaleString('de-DE');

// Text columns: substring match. Number columns: "50-80", ">=60", "<1500", or exact "3".
function matches(col, value, expr) {
  expr = expr.trim();
  if (!expr) return true;
  if (col.type === 'text') return String(value).toLowerCase().includes(expr.toLowerCase());
  let m;
  if ((m = expr.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/))) return value >= +m[1] && value <= +m[2];
  if ((m = expr.match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)?)$/))) {
    const n = +m[2];
    return { '>=': value >= n, '<=': value <= n, '>': value > n, '<': value < n }[m[1]] ?? value === n;
  }
  return true;
}

function visible() {
  const q = state.q.toLowerCase();
  return state.all
    .filter((l) => !state.mode || l.mode === state.mode)
    .filter((l) => !q || [l.address, l.district, l.title, l.description, l.source].join(' ').toLowerCase().includes(q))
    .filter((l) => COLS.every((c) => matches(c, l[c.key], state.filters[c.key] || '')))
    .sort((a, b) => {
      const { key, dir } = state.sort;
      return (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir;
    });
}

function renderRows() {
  const rows = visible();
  $('count').textContent = `${rows.length} of ${state.all.length} listings`;
  $('rows').innerHTML = rows.map((l) => `<tr data-id="${l.id}">
    <td>${l.address}</td><td class="num">${l.size}</td><td class="num">${l.rooms}</td>
    <td class="num">${eur(l.price)}${l.mode === 'rent' ? ' /mo' : ''}</td><td>${l.district}</td></tr>`).join('');
}

function renderHead() {
  $('heads').innerHTML = COLS.map((c) => {
    const arrow = state.sort.key === c.key ? (state.sort.dir > 0 ? ' ▲' : ' ▼') : '';
    return `<th data-key="${c.key}">${c.label}${arrow}</th>`;
  }).join('');
  if (!$('filters').children.length) {
    $('filters').innerHTML = COLS.map((c) =>
      `<th><input class="col-filter" data-key="${c.key}" placeholder="${c.type === 'number' ? 'e.g. 50-80, >=2' : 'filter…'}"></th>`).join('');
  }
}

function showDetail(l) {
  $('detail').innerHTML = `<h2>${l.title}</h2><div>${l.address}</div>
    <dl><dt>Type</dt><dd>${l.type} for ${l.mode}</dd><dt>Price</dt><dd>€ ${eur(l.price)}${l.mode === 'rent' ? ' per month' : ''}</dd>
    <dt>Size</dt><dd>${l.size} m²</dd><dt>Rooms</dt><dd>${l.rooms}</dd><dt>District</dt><dd>${l.district}</dd>
    <dt>Floor</dt><dd>${l.floor ?? '–'}</dd><dt>Available</dt><dd>${l.available}</dd><dt>Source</dt><dd>${l.source}</dd></dl>
    <p>${l.description}</p><button id="close">Close</button>`;
  $('overlay').hidden = false;
  $('close').onclick = () => ($('overlay').hidden = true);
}

$('heads').addEventListener('click', (e) => {
  const key = e.target.closest('th')?.dataset.key;
  if (!key) return;
  state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
  renderHead(); renderRows();
});
$('filters').addEventListener('input', (e) => { state.filters[e.target.dataset.key] = e.target.value; renderRows(); });
$('search').addEventListener('input', (e) => { state.q = e.target.value; renderRows(); });
$('mode').addEventListener('change', (e) => { state.mode = e.target.value; renderRows(); });
$('rows').addEventListener('click', (e) => {
  const id = e.target.closest('tr')?.dataset.id;
  if (id) showDetail(state.all.find((l) => l.id == id));
});
$('overlay').addEventListener('click', (e) => { if (e.target === $('overlay')) $('overlay').hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('overlay').hidden = true; });

fetch('/api/listings').then((r) => r.json()).then((d) => { state.all = d; renderHead(); renderRows(); });
