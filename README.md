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
- **Berlinhaus** (~24): rentals from a Berlin landlord and property manager. Its sitemap covers several cities and commercial units (~360 ads, ~15 min), so only Berlin apartments are kept. Warm rent; the district comes from the postcode, matched against the other sources.

Gewobag renders its offers with JavaScript (nothing in the static HTML) and HOWOGE loads them from a JSON endpoint its robots.txt disallows, so neither is fetched.

immowelt and ImmoScout24 answer automated requests with CAPTCHAs/bot checks, and Neubau was unreachable, so they
need an official API or partner feed. Add them in `data/provider.js`. Check each site's terms before using scraped data.

## Rented status

For-sale listings show a "Rented" row: **Yes** (currently let, so no vacant possession), **No** (stated vacant, e.g.
bezugsfrei) or **Unknown**. Kleinanzeigen ads are read from the ad page ("Aktuell vermietet"); other sources fall back to
keyword detection in the title/description (`data/rented.js`), so "Unknown" there can still be rented.

## Websites not covered

Checked in November 2026 and left out. "Scrapable" means robots.txt allows it; "not usable" means no listing data could be read without breaking the site's rules or its protection.

| Site | Why it is not covered |
| --- | --- |
| immowelt | CAPTCHA / bot challenge; robots.txt also disallows the search URLs |
| ImmoScout24, wohnungsboerse, immonet | Bot protection (401/403) or redirect to ImmoScout24 |
| immobilien.de, neubaukompass, McMakler, inberlinwohnen.de, wohnen-berlin.de | Bot protection (403) |
| Neubau, Sotheby's, Ziegert, Rubin, Homelike, immotop, Zuhause and a few more | Did not respond |
| HOWOGE | Its JSON endpoint is disallowed in robots.txt |
| Gewobag, GESOBAU, Stadt und Land, berlinovo, Deutsche Wohnen, Vonovia, Bonava | Listings are rendered by JavaScript; no readable HTML or sitemap URLs |
| Grossmann & Berger, DAHLER | Listings load by JavaScript; the sitemap has no ad URLs |
| thinkimmo | Client-rendered; data comes from an undocumented API |
| immosuchmaschine, von Poll, WG-Gesucht, immopool, kalaydo | robots.txt disallows `/` |
| nebenan.de | robots.txt disallows `/feed`; neighbour posts are not listings |
| Stonehedge | All its flats are in Strausberg, outside Berlin |
| cohousing-berlin.de | Building-group projects, with no price, size or rooms per flat |
| Wunderflats, Homeday, Hausgold, Heimstaden, Interboden | Not checked in depth (furnished short lets, or no Berlin listings found) |

Not a site problem but also missing: rentals only partly (WBS-only flats and many landlords are not covered), and rental prices are a mix of warm and cold rent depending on the source.

## Price analysis

In the table, a red ▲ next to a price means it is above the local average, a green ▼ means below; no arrow means in line or no benchmark. Hover for the percentage.

The detail view says whether a for-sale apartment is priced below, in line with, or above the local average. It compares the price per m² with the average asking price of existing apartments in the same neighbourhood (`data/market.json`, from guthmann.estate Market Intelligence; refresh with `npm run fetch:market`). In line means within 10%; above is up to 25% over; well above is more. Houses, new builds, rentals (the sources quote warm rent, the benchmark is net cold rent) and neighbourhoods without data get no verdict.

## How to contribute

Contributions are welcome through pull requests. You don't need write access: fork the repo, work on a branch, and open a PR.

1. **Fork** [anksv/HomeFinder](https://github.com/anksv/HomeFinder) with the Fork button on GitHub, then clone your fork:
   ```bash
   git clone https://github.com/<your-username>/HomeFinder.git
   cd HomeFinder
   git remote add upstream https://github.com/anksv/HomeFinder.git
   ```
2. **Branch** from an up-to-date `main`, with a short descriptive name:
   ```bash
   git fetch upstream && git checkout -b add-<site>-source upstream/main
   ```
3. **Make your change** and run the app (`npm start`) to check it in the browser. There is no build step and no dependencies to install.
4. **Commit** with a clear message, then push to your fork:
   ```bash
   git commit -am "Add <site> source"
   git push -u origin add-<site>-source
   ```
5. **Open a pull request** against `anksv/HomeFinder` `main` (GitHub offers a button after you push). Say what you changed and why, and for a new source include a screenshot or the number of listings it adds. Keep a PR to one change, so it is easy to review. If you hit a merge conflict, rebase on `upstream/main` and push again.

For a bigger idea, open an issue first so we can agree on the approach before you spend time on it.

### Good first contributions

- **A new data source.** Copy a script in `scripts/` (`fetch-rasmussen.js` is the smallest), write the listings to `data/<source>.json` in the shared shape (`id, title, address, district, type, mode, size, rooms, price, floor, available, source, url, description`), add the file to `SOURCES` in `data/provider.js`, an `npm run fetch:<x>` script in `package.json`, and a line in the Data section above.
- A source from the "Websites not covered" list that now allows access (for example a landlord site with a public JSON feed).
- Better district matching, more rented-status detection, UI fixes, or a missing benchmark in the price analysis.

### Rules for scrapers

- Only scrape sites whose `robots.txt` allows it. Never bypass a CAPTCHA, a login or other bot protection, and don't use an endpoint the site disallows.
- Be polite: identify as `HomeFinderBot/0.1 (personal project)`, wait about 2.5 s between requests, and read each page once.
- Collect listing data only (address, size, rooms, price and so on). No personal data about private people, such as names or contact details of sellers or searchers.
- Keep it dependency-free (Node 18+ built-ins, `fetch`) and make the script leave existing data untouched if nothing was fetched.
- Escape scraped text before putting it into the page (`esc()` in `public/app.js`).
- Never commit secrets, tokens or personal links (some alert links contain a token).

### Before you submit

- `npm start` loads without errors and your listings show in the table and the detail view.
- If you changed a fetcher, run it once and commit only the JSON of the source you changed, not a refresh of every source.
- Update this README when you add a source, or when a site turns out not to be usable.
