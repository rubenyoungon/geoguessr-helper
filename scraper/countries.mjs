// The most commonly seen countries in GeoGuessr's world maps, with a rough
// relative frequency weight (used as the prior when ranking guesses) and a few
// fundamentals that are curated by hand because they are rarely stated
// explicitly in the guides (e.g. right-hand traffic is assumed, not written).
//
// weight: approximate share of world-map rounds (higher = more common).
// drive:  "left" | "right"
// script: primary writing system(s) seen on signs
// hemi:   "north" | "south" | "equator" (straddles / near the equator)
// lang:   Latin-script languages on signs, most prominent first (ids match
//         the language question in scraper/features.mjs)
// plate:  licence plate style on ordinary private cars, most common first:
//         "uk" (white front, yellow rear), "yellow", "eu" (white, blue strip
//         on the left), "mercosur" (white, blue band on top), "white", "black"
// temp:   [lo, hi] range of how hot the covered areas look, 0 (frozen) to
//         100 (tropical heat)
// wet:    [lo, hi] range of how wet / green they look, 0 (bare desert) to
//         100 (rainforest)
// road:   [lo, hi] range of road quality on covered roads, 0 (dirt track /
//         broken) to 100 (pristine)
// stop:   word on stop signs: "stop", "alto", "pare", "arret", "local"
//         (non-Latin script), "other" (another word or a symbol)
// centre: centre line colour on two-way roads, most common first
// redsoil: optional, how much of the coverage shows red / orange soil:
//         "widespread", "common" or "regional". Unlisted countries fall back
//         to whether their Plonk It guide mentions red soil at all.
// warn:   warning sign style, most common first: "diamond" (yellow diamond),
//         "whitetri" (red-bordered triangle, white inside), "yellowtri"
//         (red-bordered triangle, yellow inside)
// tuktuk, moto, carts, yellowedge, kerbs: optional prevalence (like redsoil)
//         of tuk-tuks, heavy motorbike traffic, animal carts, yellow edge
//         lines and painted kerbs
// snow, palms, rice: optional prevalence of visible snow, palm trees and
//         rice paddies; unlisted countries count as rare
// chevblueyellow, chevbluewhite: optional prevalence of blue curve chevrons
//         with yellow / white arrows
// cyr:    Cyrillic-script countries: language whose letters show on signs
// indic:  Indic-script countries: scripts on signs, most common first

export const COUNTRIES = [
  // North America
  { slug: "united-states", weight: 10, drive: "right", script: ["latin"], hemi: "north", lang: ["en"], plate: ["white"], temp: [30, 85], wet: [10, 80], road: [45, 90], stop: ["stop"], centre: ["yellow"], redsoil: "regional", warn: ["diamond"], yellowedge: "regional", snow: "regional", palms: "regional", rice: "regional" },
  { slug: "canada", weight: 6, drive: "right", script: ["latin"], hemi: "north", lang: ["en", "fr"], plate: ["white"], temp: [15, 55], wet: [35, 75], road: [40, 85], stop: ["stop", "arret"], centre: ["yellow"], warn: ["diamond"], yellowedge: "regional", snow: "common" },
  { slug: "mexico", weight: 4, drive: "right", script: ["latin"], hemi: "north", lang: ["es"], plate: ["white"], temp: [55, 90], wet: [10, 80], road: [25, 75], stop: ["alto"], centre: ["yellow"], redsoil: "regional", warn: ["diamond"], tuktuk: "regional", moto: "regional", kerbs: "regional", palms: "common" },
  { slug: "guatemala", weight: 1, drive: "right", script: ["latin"], hemi: "north", lang: ["es"], plate: ["white"], temp: [60, 90], wet: [55, 90], road: [15, 60], stop: ["alto"], centre: ["yellow"], warn: ["diamond"], tuktuk: "common", moto: "regional", palms: "common" },
  { slug: "dominican-republic", weight: 0.7, drive: "right", script: ["latin"], hemi: "north", lang: ["es"], plate: ["white"], temp: [80, 95], wet: [50, 85], road: [25, 65], stop: ["pare"], centre: ["yellow"], warn: ["diamond"], moto: "common", palms: "widespread" },
  { slug: "panama", weight: 0.5, drive: "right", script: ["latin"], hemi: "north", lang: ["es"], plate: ["white"], temp: [85, 95], wet: [70, 95], road: [35, 75], stop: ["pare"], centre: ["yellow", "white"], redsoil: "regional", warn: ["diamond"], palms: "widespread", rice: "regional" },
  { slug: "costa-rica", weight: 0.5, drive: "right", script: ["latin"], hemi: "north", lang: ["es"], plate: ["white"], temp: [75, 95], wet: [70, 95], road: [30, 70], stop: ["alto"], centre: ["yellow"], warn: ["diamond"], palms: "widespread", rice: "regional" },
  { slug: "puerto-rico", weight: 0.5, drive: "right", script: ["latin"], hemi: "north", lang: ["es", "en"], plate: ["white"], temp: [85, 95], wet: [60, 90], road: [40, 75], stop: ["pare"], centre: ["yellow"], warn: ["diamond"], palms: "widespread" },

  // South America
  { slug: "brazil", weight: 8, drive: "right", script: ["latin"], hemi: "south", lang: ["pt"], plate: ["mercosur"], temp: [60, 95], wet: [45, 95], road: [25, 80], stop: ["pare"], centre: ["yellow"], redsoil: "widespread", warn: ["diamond"], moto: "regional", kerbs: "regional", palms: "common", rice: "regional" },
  { slug: "argentina", weight: 4, drive: "right", script: ["latin"], hemi: "south", lang: ["es"], plate: ["mercosur"], temp: [25, 75], wet: [15, 65], road: [20, 80], stop: ["pare"], centre: ["yellow", "white"], redsoil: "regional", warn: ["diamond"], snow: "regional", palms: "regional" },
  { slug: "chile", weight: 3, drive: "right", script: ["latin"], hemi: "south", lang: ["es"], plate: ["white"], temp: [20, 65], wet: [5, 70], road: [30, 85], stop: ["pare"], centre: ["white", "yellow"], warn: ["diamond"], snow: "regional" },
  { slug: "colombia", weight: 2.5, drive: "right", script: ["latin"], hemi: "equator", lang: ["es"], plate: ["yellow"], temp: [50, 95], wet: [55, 95], road: [25, 75], stop: ["pare"], centre: ["yellow"], redsoil: "regional", warn: ["diamond"], tuktuk: "regional", moto: "common", palms: "common", rice: "regional" },
  { slug: "peru", weight: 2.5, drive: "right", script: ["latin"], hemi: "south", lang: ["es"], plate: ["white"], temp: [35, 90], wet: [5, 90], road: [15, 70], stop: ["pare"], centre: ["yellow"], warn: ["diamond"], tuktuk: "common", moto: "regional", snow: "regional", palms: "regional", rice: "regional" },
  { slug: "ecuador", weight: 1.5, drive: "right", script: ["latin"], hemi: "equator", lang: ["es"], plate: ["white"], temp: [50, 95], wet: [50, 95], road: [30, 80], stop: ["pare"], centre: ["yellow"], warn: ["diamond"], tuktuk: "regional", moto: "regional", snow: "regional", palms: "common", rice: "regional" },
  { slug: "bolivia", weight: 1.5, drive: "right", script: ["latin"], hemi: "south", lang: ["es"], plate: ["white"], temp: [30, 85], wet: [10, 80], road: [5, 55], stop: ["pare"], centre: ["yellow"], redsoil: "common", warn: ["diamond"], moto: "regional", snow: "regional", palms: "regional" },
  { slug: "uruguay", weight: 1, drive: "right", script: ["latin"], hemi: "south", lang: ["es"], plate: ["mercosur"], temp: [50, 65], wet: [55, 70], road: [35, 75], stop: ["pare"], centre: ["yellow", "white"], redsoil: "common", warn: ["diamond"], palms: "regional", rice: "regional" },

  // Europe
  { slug: "russia", weight: 8, drive: "right", script: ["cyrillic"], hemi: "north", lang: [], plate: ["white"], temp: [10, 55], wet: [35, 65], road: [15, 65], stop: ["stop"], centre: ["white"], warn: ["whitetri"], cyr: ["ru"], kerbs: "common", snow: "common" },
  { slug: "france", weight: 3, drive: "right", script: ["latin"], hemi: "north", lang: ["fr"], plate: ["eu"], temp: [45, 65], wet: [45, 70], road: [60, 90], stop: ["stop"], centre: ["white"], warn: ["whitetri"], chevbluewhite: "widespread", snow: "regional", palms: "regional" },
  { slug: "spain", weight: 2.5, drive: "right", script: ["latin"], hemi: "north", lang: ["es"], plate: ["eu"], temp: [50, 75], wet: [15, 60], road: [55, 90], stop: ["stop"], centre: ["white"], redsoil: "regional", warn: ["whitetri"], chevbluewhite: "common", snow: "regional", palms: "regional", rice: "regional" },
  { slug: "united-kingdom", weight: 2.5, drive: "left", script: ["latin"], hemi: "north", lang: ["en"], plate: ["uk"], temp: [40, 50], wet: [65, 80], road: [55, 85], stop: ["stop"], centre: ["white"], warn: ["whitetri"] },
  { slug: "italy", weight: 2.5, drive: "right", script: ["latin"], hemi: "north", lang: ["it"], plate: ["eu"], temp: [45, 75], wet: [30, 65], road: [45, 80], stop: ["stop"], centre: ["white"], warn: ["whitetri"], snow: "regional", palms: "regional", rice: "regional" },
  { slug: "germany", weight: 1.5, drive: "right", script: ["latin"], hemi: "north", lang: ["de"], plate: ["eu"], temp: [40, 50], wet: [55, 70], road: [65, 95], stop: ["stop"], centre: ["white"], warn: ["whitetri"], snow: "regional" },
  { slug: "poland", weight: 2, drive: "right", script: ["latin"], hemi: "north", lang: ["pl"], plate: ["eu"], temp: [35, 50], wet: [50, 65], road: [50, 90], stop: ["stop"], centre: ["white"], warn: ["yellowtri"], carts: "regional", snow: "regional" },
  { slug: "turkey", weight: 2.5, drive: "right", script: ["latin"], hemi: "north", lang: ["tr"], plate: ["eu"], temp: [40, 75], wet: [20, 60], road: [40, 85], stop: ["other"], centre: ["white", "yellow"], warn: ["whitetri"], kerbs: "regional", snow: "regional", palms: "regional" },
  { slug: "norway", weight: 2, drive: "right", script: ["latin"], hemi: "north", lang: ["dano"], plate: ["eu"], temp: [15, 45], wet: [55, 85], road: [55, 90], stop: ["stop"], centre: ["yellow"], warn: ["yellowtri"], snow: "common" },
  { slug: "sweden", weight: 2, drive: "right", script: ["latin"], hemi: "north", lang: ["sv"], plate: ["eu"], temp: [20, 45], wet: [50, 70], road: [50, 85], stop: ["stop"], centre: ["white"], warn: ["yellowtri"], chevblueyellow: "widespread", snow: "common" },
  { slug: "finland", weight: 2, drive: "right", script: ["latin"], hemi: "north", lang: ["fi", "sv"], plate: ["eu"], temp: [15, 35], wet: [50, 70], road: [45, 85], stop: ["stop"], centre: ["yellow"], warn: ["yellowtri"], snow: "common" },
  { slug: "romania", weight: 1.5, drive: "right", script: ["latin"], hemi: "north", lang: ["ro"], plate: ["eu"], temp: [40, 55], wet: [45, 65], road: [35, 75], stop: ["stop"], centre: ["white"], warn: ["whitetri"], carts: "common", snow: "regional" },
  { slug: "ukraine", weight: 1, drive: "right", script: ["cyrillic"], hemi: "north", lang: [], plate: ["eu"], temp: [35, 55], wet: [40, 60], road: [10, 55], stop: ["stop"], centre: ["white"], warn: ["whitetri"], cyr: ["uk"], carts: "regional", kerbs: "common", snow: "regional" },
  { slug: "portugal", weight: 1, drive: "right", script: ["latin"], hemi: "north", lang: ["pt"], plate: ["eu"], temp: [55, 70], wet: [30, 65], road: [50, 85], stop: ["stop"], centre: ["white"], warn: ["whitetri"], palms: "regional", rice: "regional" },
  { slug: "netherlands", weight: 1, drive: "right", script: ["latin"], hemi: "north", lang: ["nl"], plate: ["yellow", "eu"], temp: [42, 50], wet: [60, 72], road: [75, 98], stop: ["stop"], centre: ["white"], warn: ["whitetri"] },
  { slug: "belgium", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["nl", "fr"], plate: ["eu"], temp: [42, 50], wet: [60, 72], road: [55, 85], stop: ["stop"], centre: ["white"], warn: ["whitetri"] },
  { slug: "ireland", weight: 1, drive: "left", script: ["latin"], hemi: "north", lang: ["en"], plate: ["eu"], temp: [40, 48], wet: [70, 85], road: [50, 80], stop: ["stop"], centre: ["white"], warn: ["diamond"], yellowedge: "common" },
  { slug: "denmark", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["dano"], plate: ["eu"], temp: [38, 46], wet: [58, 70], road: [65, 92], stop: ["stop"], centre: ["white"], warn: ["whitetri"] },
  { slug: "austria", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["de"], plate: ["eu"], temp: [30, 50], wet: [55, 75], road: [65, 95], stop: ["stop"], centre: ["white"], warn: ["whitetri"], snow: "regional" },
  { slug: "switzerland", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["de", "fr", "it"], plate: ["white"], temp: [30, 50], wet: [60, 80], road: [75, 98], stop: ["stop"], centre: ["white"], warn: ["whitetri"], snow: "regional" },
  { slug: "czechia", weight: 1, drive: "right", script: ["latin"], hemi: "north", lang: ["cs"], plate: ["eu"], temp: [38, 50], wet: [50, 65], road: [50, 85], stop: ["stop"], centre: ["white"], warn: ["whitetri"], snow: "regional" },
  { slug: "hungary", weight: 1, drive: "right", script: ["latin"], hemi: "north", lang: ["hu"], plate: ["eu"], temp: [45, 58], wet: [40, 55], road: [40, 80], stop: ["stop"], centre: ["white"], warn: ["whitetri"] },
  { slug: "greece", weight: 1.2, drive: "right", script: ["greek"], hemi: "north", lang: [], plate: ["eu"], temp: [60, 75], wet: [20, 50], road: [40, 75], stop: ["stop"], centre: ["white", "yellow"], warn: ["yellowtri"], palms: "regional" },
  { slug: "bulgaria", weight: 1, drive: "right", script: ["cyrillic"], hemi: "north", lang: [], plate: ["eu"], temp: [45, 60], wet: [40, 60], road: [20, 65], stop: ["stop"], centre: ["white"], warn: ["whitetri"], cyr: ["bg"], carts: "common", snow: "regional" },
  { slug: "serbia", weight: 0.8, drive: "right", script: ["cyrillic", "latin"], hemi: "north", lang: ["sh"], plate: ["eu"], temp: [45, 58], wet: [45, 60], road: [35, 70], stop: ["stop"], centre: ["white"], warn: ["whitetri", "yellowtri"], cyr: ["sr"], carts: "regional" },
  { slug: "croatia", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["sh"], plate: ["eu"], temp: [45, 70], wet: [40, 70], road: [50, 85], stop: ["stop"], centre: ["white"], warn: ["whitetri"] },

  // Asia
  { slug: "japan", weight: 4, drive: "left", script: ["japanese"], hemi: "north", lang: [], plate: ["white", "yellow"], temp: [35, 75], wet: [70, 90], road: [70, 98], stop: ["local"], centre: ["white", "yellow"], warn: ["diamond"], snow: "regional", rice: "common" },
  { slug: "indonesia", weight: 3, drive: "left", script: ["latin"], hemi: "equator", lang: ["ms"], plate: ["black", "white"], temp: [85, 98], wet: [70, 98], road: [20, 70], stop: ["stop"], centre: ["white"], redsoil: "common", warn: ["diamond"], tuktuk: "regional", moto: "widespread", kerbs: "common", palms: "widespread", rice: "common" },
  { slug: "thailand", weight: 2.5, drive: "left", script: ["thai"], hemi: "north", lang: [], plate: ["white"], temp: [85, 98], wet: [55, 85], road: [45, 85], stop: ["local"], centre: ["yellow"], redsoil: "regional", warn: ["diamond"], tuktuk: "common", moto: "widespread", kerbs: "common", palms: "widespread", rice: "common" },
  { slug: "india", weight: 2, drive: "left", script: ["indic", "latin"], hemi: "north", lang: ["en"], plate: ["white"], temp: [60, 98], wet: [15, 90], road: [15, 70], stop: ["stop"], centre: ["white"], redsoil: "common", warn: ["whitetri"], indic: ["devanagari", "other", "tamil", "bengali"], tuktuk: "widespread", moto: "common", carts: "regional", kerbs: "common", snow: "regional", palms: "common", rice: "common" },
  { slug: "malaysia", weight: 1.5, drive: "left", script: ["latin"], hemi: "equator", lang: ["ms", "en"], plate: ["black"], temp: [88, 98], wet: [85, 98], road: [50, 90], stop: ["other"], centre: ["white"], redsoil: "common", warn: ["diamond"], moto: "common", kerbs: "widespread", palms: "widespread", rice: "common" },
  { slug: "philippines", weight: 1.5, drive: "right", script: ["latin"], hemi: "north", lang: ["en"], plate: ["white"], temp: [85, 98], wet: [70, 95], road: [30, 75], stop: ["stop"], centre: ["white", "yellow"], warn: ["diamond", "whitetri"], tuktuk: "widespread", moto: "common", kerbs: "regional", palms: "widespread", rice: "common" },
  { slug: "south-korea", weight: 1, drive: "right", script: ["korean"], hemi: "north", lang: [], plate: ["white"], temp: [40, 60], wet: [60, 80], road: [70, 95], stop: ["local", "stop"], centre: ["yellow"], warn: ["yellowtri"], snow: "regional", rice: "common" },
  { slug: "taiwan", weight: 1, drive: "right", script: ["chinese"], hemi: "north", lang: [], plate: ["white"], temp: [70, 90], wet: [75, 95], road: [65, 92], stop: ["local"], centre: ["yellow"], warn: ["whitetri"], moto: "widespread", yellowedge: "regional", kerbs: "regional", palms: "common", rice: "common" },
  { slug: "kazakhstan", weight: 1, drive: "right", script: ["cyrillic"], hemi: "north", lang: [], plate: ["white"], temp: [25, 65], wet: [5, 40], road: [10, 60], stop: ["stop"], centre: ["white"], redsoil: "regional", warn: ["whitetri"], cyr: ["kk", "ru"], yellowedge: "regional", kerbs: "common", snow: "common" },
  { slug: "mongolia", weight: 0.8, drive: "right", script: ["cyrillic"], hemi: "north", lang: [], plate: ["white"], temp: [10, 45], wet: [5, 35], road: [0, 50], stop: ["stop", "local"], centre: ["white"], warn: ["whitetri"], cyr: ["mn"], kerbs: "regional", snow: "common" },
  { slug: "israel-west-bank", weight: 0.8, drive: "right", script: ["hebrew", "arabic"], hemi: "north", lang: [], plate: ["yellow"], temp: [65, 85], wet: [10, 45], road: [60, 90], stop: ["other"], centre: ["white"], warn: ["whitetri"], yellowedge: "common", kerbs: "common", palms: "common" },
  { slug: "vietnam", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["vi"], plate: ["white"], temp: [70, 95], wet: [70, 95], road: [30, 75], stop: ["stop"], centre: ["white", "yellow"], redsoil: "regional", warn: ["yellowtri"], moto: "widespread", kerbs: "regional", palms: "common", rice: "widespread" },
  { slug: "bangladesh", weight: 0.8, drive: "left", script: ["indic"], hemi: "north", lang: [], plate: ["white"], temp: [85, 95], wet: [80, 98], road: [10, 50], stop: ["stop"], centre: ["white"], warn: ["whitetri"], indic: ["bengali"], tuktuk: "widespread", moto: "regional", carts: "regional", palms: "common", rice: "widespread" },
  { slug: "sri-lanka", weight: 0.6, drive: "left", script: ["indic"], hemi: "north", lang: [], plate: ["uk"], temp: [85, 98], wet: [65, 95], road: [35, 75], stop: ["stop"], centre: ["white"], redsoil: "common", warn: ["yellowtri", "whitetri", "diamond"], indic: ["sinhala", "tamil"], tuktuk: "widespread", moto: "common", kerbs: "regional", palms: "widespread", rice: "common" },
  { slug: "cambodia", weight: 0.6, drive: "right", script: ["khmer"], hemi: "north", lang: [], plate: ["white"], temp: [88, 98], wet: [50, 85], road: [10, 60], stop: ["stop", "local"], centre: ["yellow", "white"], redsoil: "widespread", warn: ["diamond", "whitetri"], tuktuk: "widespread", moto: "widespread", carts: "regional", palms: "widespread", rice: "widespread" },
  { slug: "oman", weight: 0.6, drive: "right", script: ["arabic", "latin"], hemi: "north", lang: ["en"], plate: ["yellow"], temp: [75, 98], wet: [0, 30], road: [20, 90], stop: ["stop", "local"], centre: ["white"], redsoil: "regional", warn: ["whitetri"], yellowedge: "widespread", kerbs: "common", palms: "common" },

  // Africa
  { slug: "south-africa", weight: 4, drive: "left", script: ["latin"], hemi: "south", lang: ["en", "af"], plate: ["white"], temp: [50, 75], wet: [15, 65], road: [40, 85], stop: ["stop"], centre: ["white"], redsoil: "common", warn: ["whitetri"], carts: "regional", yellowedge: "widespread", palms: "regional" },
  { slug: "kenya", weight: 1.5, drive: "left", script: ["latin"], hemi: "equator", lang: ["en", "sw"], plate: ["uk"], temp: [60, 90], wet: [20, 80], road: [10, 65], stop: ["stop"], centre: ["yellow"], redsoil: "common", warn: ["whitetri"], tuktuk: "common", moto: "common", carts: "regional", yellowedge: "common", kerbs: "regional", palms: "regional" },
  { slug: "nigeria", weight: 1, drive: "right", script: ["latin"], hemi: "north", lang: ["en"], plate: ["white"], temp: [80, 98], wet: [30, 90], road: [5, 50], stop: ["stop"], centre: ["white", "yellow"], redsoil: "widespread", warn: ["whitetri"], tuktuk: "common", moto: "common", palms: "widespread", rice: "regional" },
  { slug: "botswana", weight: 1, drive: "left", script: ["latin"], hemi: "south", lang: ["en"], plate: ["uk"], temp: [65, 90], wet: [5, 35], road: [20, 75], stop: ["stop"], centre: ["white", "yellow"], redsoil: "common", warn: ["whitetri"], carts: "regional", yellowedge: "widespread", kerbs: "regional" },
  { slug: "ghana", weight: 0.8, drive: "right", script: ["latin"], hemi: "north", lang: ["en"], plate: ["white"], temp: [85, 98], wet: [50, 90], road: [10, 60], stop: ["stop"], centre: ["white", "yellow"], redsoil: "widespread", warn: ["whitetri"], tuktuk: "regional", moto: "regional", palms: "widespread" },
  { slug: "senegal", weight: 0.6, drive: "right", script: ["latin"], hemi: "north", lang: ["fr"], plate: ["white"], temp: [80, 98], wet: [10, 50], road: [10, 60], stop: ["stop"], centre: ["white"], redsoil: "common", warn: ["whitetri"], moto: "regional", carts: "common", palms: "common", rice: "regional" },
  { slug: "uganda", weight: 0.6, drive: "left", script: ["latin"], hemi: "equator", lang: ["en"], plate: ["uk"], temp: [75, 90], wet: [65, 90], road: [5, 55], stop: ["stop"], centre: ["yellow"], redsoil: "widespread", warn: ["whitetri"], moto: "common", kerbs: "regional", palms: "regional" },
  { slug: "tunisia", weight: 0.5, drive: "right", script: ["arabic", "latin"], hemi: "north", lang: ["fr"], plate: ["black"], temp: [65, 85], wet: [10, 45], road: [30, 70], stop: ["stop", "local"], centre: ["white"], warn: ["whitetri"], carts: "regional", kerbs: "common", palms: "common" },

  // Oceania
  { slug: "australia", weight: 7, drive: "left", script: ["latin"], hemi: "south", lang: ["en"], plate: ["white"], temp: [45, 95], wet: [5, 80], road: [30, 90], stop: ["stop"], centre: ["white"], redsoil: "common", warn: ["diamond"], palms: "regional" },
  { slug: "new-zealand", weight: 2, drive: "left", script: ["latin"], hemi: "south", lang: ["en"], plate: ["white"], temp: [35, 55], wet: [60, 85], road: [50, 88], stop: ["stop"], centre: ["white", "yellow"], warn: ["diamond"], snow: "regional" },
];
