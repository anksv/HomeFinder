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

`npm run fetch` refreshes real Berlin listings into `data/kleinanzeigen.json` and `data/engelvoelkers.json`
(`fetch:ka` / `fetch:ev` run one source). The server merges whatever exists; with no file it uses `data/sample-listings.json`.

- **Kleinanzeigen** (~160): robots.txt-permitted search pages, 2.5 s between requests. Cards give postcode and district, no street.
- **Engel & Völkers** (~90): the four Berlin rent/sale pages (apartments, houses). Each embeds only its newest 35 listings, and the site ignores `?page=N`. Gives neighbourhood, no street. Skips price-on-request. The `/search/` URLs are disallowed by robots.txt and not used.

immowelt and ImmoScout24 answer automated requests with CAPTCHAs/bot checks, and Neubau was unreachable, so they
need an official API or partner feed. Add them in `data/provider.js`. Check each site's terms before using scraped data.
