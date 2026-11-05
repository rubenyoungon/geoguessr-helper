// Turns the raw Plonk It guides in data/raw/ into public/data/db.json:
// country metadata, every tip (text, image, links, categories), and for each
// Plonk It-sourced question option, the tips in each country that match it.
//
// Usage: node scraper/build.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { COUNTRIES } from "./countries.mjs";
import { QUESTIONS, CATEGORIES, TAG_TO_CATEGORY } from "./features.mjs";

const ROOT = join(import.meta.dirname, "..");
const RAW_DIR = join(ROOT, "data", "raw");
const OUT = join(ROOT, "public", "data", "db.json");
const BASE = "https://www.plonkit.net";

// Sentences that talk about *other* countries, or negate a clue, would
// otherwise produce false matches ("Unlike Canada, the US has no ...").
const NEGATION = /\b(no|not|never|rarely|unlike|without|don'?t|doesn'?t|isn'?t|aren'?t|cannot|can'?t)\b/i;
const NOTE_LINE = /^\s*(\*\*)?NOTE/i;

const compile = (patterns) => patterns.map((p) => new RegExp(p, "i"));
const absolute = (url) => (url && url.startsWith("/") ? BASE + url : url || null);
const stripMarkdown = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");

function sentences(textLines) {
  return textLines
    .filter((line) => !NOTE_LINE.test(line))
    .flatMap((line) => stripMarkdown(line).split(/(?<=[.!?])\s+/))
    .filter((s) => !NEGATION.test(s));
}

function flattenTips(guide) {
  const tips = [];
  for (const step of guide.steps) {
    let heading = null;
    for (const item of step.items || []) {
      if (item.kind === "subsection" || item.kind === "divider") heading = item.title;
      if (item.kind !== "tip") continue;
      tips.push({
        id: item.id,
        step: step.title,
        heading,
        text: item.data.text,
        image: absolute(item.data.image?.imageUrl),
        link: item.data.image?.imageLink || null,
        tags: item.tags || [],
      });
    }
  }
  return tips;
}

const categoryMatchers = Object.entries(CATEGORIES).map(([cat, pats]) => [cat, compile(pats)]);

function categorize(tip) {
  const cats = new Set(tip.tags.map((t) => TAG_TO_CATEGORY[t]).filter(Boolean));
  const text = stripMarkdown(tip.text.join(" "));
  for (const [cat, regexes] of categoryMatchers) {
    if (regexes.some((r) => r.test(text))) cats.add(cat);
  }
  return [...cats];
}

async function main() {
  const index = JSON.parse(await readFile(join(RAW_DIR, "_index.json"), "utf8"));
  const indexBySlug = Object.fromEntries(index.map((g) => [g.slug, g]));

  const mined = QUESTIONS.flatMap((q) => [
    ...q.options.filter((o) => o.patterns).map((o) => ({ key: `${q.id}.${o.id}`, regexes: compile(o.patterns) })),
    // Question-level patterns (slider questions): evidence for the whole question.
    ...(q.patterns ? [{ key: `${q.id}.all`, regexes: compile(q.patterns) }] : []),
  ]);

  const countries = [];
  const tips = {};
  const evidence = {}; // "question.option" -> { slug: [tipId, ...] }

  for (const c of COUNTRIES) {
    let guide;
    try {
      guide = JSON.parse(await readFile(join(RAW_DIR, `${c.slug}.json`), "utf8"));
    } catch {
      console.warn(`! ${c.slug}: no raw data, run "npm run scrape" first`);
      continue;
    }

    const countryTips = flattenTips(guide).map((t) => ({ ...t, cats: categorize(t) }));
    tips[c.slug] = countryTips;

    for (const tip of countryTips) {
      const sents = sentences(tip.text);
      for (const { key, regexes } of mined) {
        if (sents.some((s) => regexes.some((r) => r.test(s)))) {
          ((evidence[key] ??= {})[c.slug] ??= []).push(tip.id);
        }
      }
    }

    const continents = guide.cat?.length ? guide.cat : indexBySlug[c.slug]?.cat || [];
    countries.push({
      ...c,
      title: guide.title,
      code: guide.code,
      continent: continents[0] || "",
      continents,
      url: `${BASE}/${c.slug}`,
      hero: absolute(guide.heroImage),
      updatedAt: guide.updatedAt,
      tipCount: countryTips.length,
    });
  }

  const db = {
    generatedAt: new Date().toISOString(),
    source: BASE,
    // Strip regex patterns; the frontend only needs ids and labels.
    questions: QUESTIONS.map(({ options, patterns, ...q }) => ({
      ...q,
      options: options.map(({ patterns, ...o }) => o),
    })),
    countries,
    evidence,
    tips,
  };

  await mkdir(join(ROOT, "public", "data"), { recursive: true });
  const json = JSON.stringify(db);
  await writeFile(OUT, json);

  const tipTotal = Object.values(tips).reduce((n, t) => n + t.length, 0);
  console.log(`Wrote ${OUT}`);
  console.log(`  ${countries.length} countries, ${tipTotal} tips, ${(json.length / 1024).toFixed(0)} KB`);
  for (const { key } of mined) {
    const slugs = Object.keys(evidence[key] || {});
    console.log(`  ${key.padEnd(24)} ${String(slugs.length).padStart(2)} countries`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
