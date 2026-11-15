// Zero-dependency server: serves ./public and /api/listings, then opens the browser.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { getListings } = require('./data/provider');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/listings') {
    const listings = await getListings();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(listings));
  }
  const rel = url.pathname === '/' ? 'index.html' : url.pathname;
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(PORT, () => {
  const target = `http://localhost:${PORT}`;
  console.log(`HomeFinder running at ${target}`);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  if (!process.env.NO_OPEN) exec(`${opener} ${target}`);
});
