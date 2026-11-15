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

`npm run fetch` pulls real Berlin listings (rent and buy, ~160) from Kleinanzeigen into `data/listings.json`
(2.5 s between requests, robots.txt-permitted search pages only). Cards show postcode and district, not street.
Without that file the app falls back to `data/sample-listings.json`.

immowelt and ImmoScout24 answer automated requests with CAPTCHAs/bot checks, and Neubau was unreachable, so they
need an official API or partner feed. Add them in `data/provider.js`. Check each site's terms before using scraped data.
