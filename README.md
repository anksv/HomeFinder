# HomeFinder
A repo to find apartment or house either for rent or buy

## Run

```bash
npm start
```

Opens http://localhost:3000 (set `PORT` to change, `NO_OPEN=1` to skip opening the browser). No dependencies, Node 18+.

## Features

- Listing table: address, size, rooms, price, district
- Click a row for the detail view
- Per-column filters (text: substring; numbers: `50-80`, `>=2`, `<1500`, `3`) and sortable headers
- Global search box, rent/buy switch

## Data

`data/listings.json` is **sample data**. `data/provider.js` is the single place to plug in real sources
(immowelt, ImmoScout24, Kleinanzeigen, Neubau). Prefer official APIs or feeds; scraping those sites
generally violates their terms.
