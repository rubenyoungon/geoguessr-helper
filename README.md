# Plonk Helper

A GeoGuessr study aid that narrows down where a Street View image is, using the
country guides from [Plonk It](https://www.plonkit.net). Answer a few questions
about what you see and it ranks 68 commonly seen countries, showing the
Plonk It tips behind each match.

No dependencies — just Node 20.11+.

```bash
npm start            # serve the app at http://localhost:5173
npm run update       # re-download the guides and rebuild the database
```

## How it works

1. **Scrape** (`scraper/scrape.mjs`) — each Plonk It guide page embeds its full
   content as JSON; the scraper saves it to `data/raw/<slug>.json`. Cached files
   are skipped (`--force` re-downloads), and it backs off when rate-limited.
2. **Build** (`scraper/build.mjs`) — flattens every tip (text, image, Street View
   link, category) and matches the questionnaire's patterns against the guide
   text sentence by sentence. Matching tips become the evidence for that clue.
   Output: `public/data/db.json`.
3. **Rank** (`public/scoring.js`) — each country starts with a prior weight
   (how often it appears in world maps), multiplied by the likelihood of every
   answer:
   - **Core facts** (driving side, script, language, hemisphere) are curated in
     `scraper/countries.mjs` because guides rarely state them; a mismatch nearly
     rules a country out.
   - **Plonk It clues** (road lines, plates, Google car, landscape, poles,
     chevrons) are soft: a guide not mentioning something is weak evidence.
   - **Search clues** — search all tips for anything you spotted ("red
     reflector", "ladder pole") and add it as an extra clue.
4. **Ask** — the suggested next question is the one with the highest expected
   information gain per unit of effort, so it adapts to what's still plausible.

## Customising

- Add or reweight countries in `scraper/countries.mjs`, then `npm run update`.
- Add questions or tune patterns in `scraper/features.mjs`, then `npm run build`.
- Tune how strongly answers count in `LIKELIHOOD` in `public/scoring.js`.

Tip images are loaded straight from plonkit.net and are hidden if they don't load.
All guide content belongs to Plonk It and its contributors.
