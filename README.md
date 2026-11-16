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

`npm run fetch` refreshes real Berlin listings into `data/kleinanzeigen.json` and `data/engelvoelkers.json` `data/ohnemakler.json` and `data/degewo.json`
(`fetch:ka` / `fetch:ev` / `fetch:om` / `fetch:dg` run one source). The server merges whatever exists; with no file it uses `data/sample-listings.json`.

- **Kleinanzeigen** (~150): robots.txt-permitted search pages, 2.5 s between requests; for-sale ads are also opened once to read the "currently rented" flag (the fetch takes ~4 min). Cards give postcode and district, no street.
- **Engel & Völkers** (~90): the four Berlin rent/sale pages (apartments, houses). Each embeds only its newest 35 listings, and the site ignores `?page=N`. Gives neighbourhood, no street. Skips price-on-request. The `/search/` URLs are disallowed by robots.txt and not used.
- **ohne-makler.net** (~210): private, commission-free offers from the `/immobilien/...` Berlin category pages (paginated with `?page=N`). Its robots.txt disallows `/immobilie/list/`, which is not used. Gives postcode and district, no street.
- **degewo** (~70): Berlin municipal housing company, rentals only, with street address and warm rent. Many need a WBS (housing entitlement certificate), noted in the description. The site's pagination repeats some flats, so fewer unique flats come back than its "97 results".

Gewobag renders its offers with JavaScript (nothing in the static HTML) and HOWOGE loads them from a JSON endpoint its robots.txt disallows, so neither is fetched.

immowelt and ImmoScout24 answer automated requests with CAPTCHAs/bot checks, and Neubau was unreachable, so they
need an official API or partner feed. Add them in `data/provider.js`. Check each site's terms before using scraped data.

## Rented status

For-sale listings show a "Rented" row: **Yes** (currently let, so no vacant possession), **No** (stated vacant, e.g.
bezugsfrei) or **Unknown**. Kleinanzeigen ads are read from the ad page ("Aktuell vermietet"); other sources fall back to
keyword detection in the title/description (`data/rented.js`), so "Unknown" there can still be rented.
