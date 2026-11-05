// Downloads Plonk It country guides into data/raw/<slug>.json.
//
// Each guide page embeds its full content as JSON in a
// <script id="__PRELOADED_DATA__"> tag, so no HTML parsing is needed.
//
// Usage: node scraper/scrape.mjs [--force] [slug ...]

import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { COUNTRIES } from "./countries.mjs";

const BASE = "https://www.plonkit.net";
const RAW_DIR = join(import.meta.dirname, "..", "data", "raw");
const DELAY_MS = 2000;
const UA = "geoguessr-helper/1.0 (personal study tool)";

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);

async function fetchText(url, attempt = 0) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  // Plonk It rate-limits bursts; back off and retry instead of failing.
  if (res.status === 429 && attempt < 5) {
    const wait = (Number(res.headers.get("retry-after")) || 10 * 2 ** attempt) * 1000;
    console.log(`  rate limited, waiting ${wait / 1000}s…`);
    await sleep(wait);
    return fetchText(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

function extractPreloaded(html) {
  const m = html.match(/<script id="__PRELOADED_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no __PRELOADED_DATA__ block found");
  const json = JSON.parse(m[1]);
  if (!json.success) throw new Error(json.error || "guide not found");
  return json.data.public;
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });

  const index = JSON.parse(await fetchText(`${BASE}/api/guides`)).data;
  await writeFile(join(RAW_DIR, "_index.json"), JSON.stringify(index, null, 2));
  const known = new Set(index.map((g) => g.slug));

  const slugs = only.length ? only : COUNTRIES.map((c) => c.slug);
  let ok = 0, skipped = 0, failed = 0;

  for (const slug of slugs) {
    const out = join(RAW_DIR, `${slug}.json`);
    if (!known.has(slug)) {
      console.warn(`! ${slug}: not in Plonk It index`);
      failed++;
      continue;
    }
    if (!force && (await exists(out))) {
      skipped++;
      continue;
    }
    try {
      const guide = extractPreloaded(await fetchText(`${BASE}/${slug}`));
      await writeFile(out, JSON.stringify(guide, null, 2));
      console.log(`✓ ${slug}`);
      ok++;
    } catch (err) {
      console.warn(`! ${slug}: ${err.message}`);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} downloaded, ${skipped} cached, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
