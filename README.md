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

`npm run fetch` refreshes real Berlin listings into `data/kleinanzeigen.json` and `data/engelvoelkers.json` `data/ohnemakler.json` `data/degewo.json`, `data/wbm.json` and `data/accentro.json`
(`fetch:ka` / `fetch:ev` / `fetch:om` / `fetch:dg` / `fetch:wbm` / `fetch:ac` run one source). The server merges whatever exists; with no file it uses `data/sample-listings.json`.

- **Kleinanzeigen** (~150): robots.txt-permitted search pages, 2.5 s between requests; for-sale ads are also opened once to read the "currently rented" flag (the fetch takes ~4 min). Cards give postcode and district, no street.
- **Engel & Völkers** (~90): the four Berlin rent/sale pages (apartments, houses). Each embeds only its newest 35 listings, and the site ignores `?page=N`. Gives neighbourhood, no street. Skips price-on-request. The `/search/` URLs are disallowed by robots.txt and not used.
- **ohne-makler.net** (~210): private, commission-free offers from the `/immobilien/...` Berlin category pages (paginated with `?page=N`). Its robots.txt disallows `/immobilie/list/`, which is not used. Gives postcode and district, no street.
- **degewo** (~70): Berlin municipal housing company, rentals only, with street address and warm rent. Many need a WBS (housing entitlement certificate), noted in the description. The site's pagination repeats some flats, so fewer unique flats come back than its "97 results".
- **WBM** (6 right now): Berlin municipal housing company, rentals with street address and warm rent; many need a WBS.
- **ACCENTRO** (~130): Berlin condominiums for sale. Its list does not paginate, so ad URLs come from the sitemap and each ad is read once (~6 min). Gives street address, price and an explicit "Vermietet" flag.
- **Rasmussen Immobilien** (~6): Berlin apartments for sale from a small local agent. robots.txt only blocks `/wp-admin/`; the list has no pagination, so each ad is read once (seconds). Commercial units, ads outside Berlin and ads without a size are skipped.
- **Guthmann Estate** (~190): Berlin apartments for sale from a data-driven broker. Ad URLs come from the sitemap, each ad is read once (~8 min). Its "investment apartments" are sold with a tenant and flagged rented.

Gewobag renders its offers with JavaScript (nothing in the static HTML) and HOWOGE loads them from a JSON endpoint its robots.txt disallows, so neither is fetched.

immowelt and ImmoScout24 answer automated requests with CAPTCHAs/bot checks, and Neubau was unreachable, so they
need an official API or partner feed. Add them in `data/provider.js`. Check each site's terms before using scraped data.

## Rented status

For-sale listings show a "Rented" row: **Yes** (currently let, so no vacant possession), **No** (stated vacant, e.g.
bezugsfrei) or **Unknown**. Kleinanzeigen ads are read from the ad page ("Aktuell vermietet"); other sources fall back to
keyword detection in the title/description (`data/rented.js`), so "Unknown" there can still be rented.

## Sites checked and not used

Stonehedge (all flats are in Strausberg, outside Berlin), Gewobag/GESOBAU/Stadt und Land/berlinovo/Deutsche Wohnen/Vonovia/Bonava (listings are rendered by JavaScript), immosuchmaschine and von Poll (robots.txt disallows `/`), immowelt/ImmoScout24/wohnungsboerse/immonet/immobilien.de/neubaukompass (bot protection), HOWOGE (disallowed JSON endpoint).

## Price analysis

The detail view says whether a for-sale apartment is priced below, in line with, or above the local average. It compares the price per m² with the average asking price of existing apartments in the same neighbourhood (`data/market.json`, from guthmann.estate Market Intelligence; refresh with `npm run fetch:market`). In line means within 10%; above is up to 25% over; well above is more. Houses, new builds, rentals (the sources quote warm rent, the benchmark is net cold rent) and neighbourhoods without data get no verdict.
