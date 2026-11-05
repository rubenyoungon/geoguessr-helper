// Questionnaire definition.
//
// Every question has options; each option says how a country is matched:
//   - curated: { field, value } compares against scraper/countries.mjs
//   - plonkit: { patterns } regexes searched sentence-by-sentence in the
//     Plonk It guide text; matching tips become the evidence for that option.
//   Curated options may also have patterns: they don't affect the score but
//   the matching tips are shown as supporting evidence.
//   Plonk It options may set `prevalence: "<field>"`: countries with that
//   field in countries.mjs ("widespread" / "common" / "regional") are scored
//   by it; the rest fall back to the guide text.
//
// miss: likelihood when a curated option doesn't match (default near zero).
// confidence: { default } adds a "how sure are you?" slider (0-100%) that
//             scales the mismatch penalty instead of a fixed miss.
// type "single": the player picks one option.
// type "multi":  the player ticks every option they can see; unticked
//                options are not held against any country.
// type "sliders": the player sets each of `axes` on a 0-100 scale; each
//                country has a [lo, hi] range per axis in countries.mjs.
//                Question-level `patterns` collect evidence tips only.
// cost:          relative effort to answer (default 1); the suggested next
//                question maximises information gain per unit of effort.

export const QUESTIONS = [
  {
    id: "continent",
    text: "Which continent does it feel like?",
    help: "Go with your gut — the overall look of roads, buildings, cars and landscape. It counts less than hard clues.",
    type: "single",
    source: "curated",
    note: "Plonk It category",
    badge: "Gut feeling",
    // A vibe can easily be wrong (Russia vs. Eastern Europe, Mexico vs. South
    // America), so the player says how sure they are; 60% ≈ a 0.06 penalty.
    confidence: { default: 60 },
    cost: 0.6, // quickest call to make, so it tends to be asked first
    options: [
      { id: "na", label: "North & Central America (incl. Mexico, Caribbean)", match: { field: "continents", value: "North America" } },
      { id: "sa", label: "South America", match: { field: "continents", value: "South America" } },
      { id: "eu", label: "Europe (incl. Russia)", match: { field: "continents", value: "Europe" } },
      { id: "as", label: "Asia", match: { field: "continents", value: "Asia" } },
      { id: "af", label: "Africa", match: { field: "continents", value: "Africa" } },
      { id: "oc", label: "Oceania", match: { field: "continents", value: "Oceania" } },
    ],
  },
  {
    id: "drive",
    text: "Which side of the road are cars driving on?",
    help: "Look at oncoming traffic, parked cars, or which side the Google car is on.",
    type: "single",
    source: "curated",
    options: [
      { id: "right", label: "Right", match: { field: "drive", value: "right" } },
      { id: "left", label: "Left", match: { field: "drive", value: "left" } },
    ],
  },
  {
    id: "script",
    text: "What writing system is on signs and shops?",
    type: "single",
    source: "curated",
    options: [
      { id: "latin", label: "Latin (abc)", match: { field: "script", value: "latin" } },
      { id: "cyrillic", label: "Cyrillic (жщы)", match: { field: "script", value: "cyrillic" } },
      { id: "greek", label: "Greek (αβγ)", match: { field: "script", value: "greek" } },
      { id: "japanese", label: "Japanese (かな/漢字)", match: { field: "script", value: "japanese" } },
      { id: "korean", label: "Korean (한글)", match: { field: "script", value: "korean" } },
      { id: "chinese", label: "Chinese (漢字 only)", match: { field: "script", value: "chinese" } },
      { id: "thai", label: "Thai (ภาษาไทย)", match: { field: "script", value: "thai" } },
      { id: "khmer", label: "Khmer (ខ្មែរ)", match: { field: "script", value: "khmer" } },
      { id: "indic", label: "Indic (हिन्दी, বাংলা, සිංහල)", match: { field: "script", value: "indic" } },
      { id: "hebrew", label: "Hebrew (עברית)", match: { field: "script", value: "hebrew" } },
      { id: "arabic", label: "Arabic (العربية)", match: { field: "script", value: "arabic" } },
    ],
  },
  {
    id: "cyrillic",
    text: "Which Cyrillic letters can you spot?",
    help: "Pick the most specific match. Kazakh and Mongolian both use ө ү — Kazakh also has ә қ ғ ң.",
    type: "single",
    source: "curated",
    note: "hand-entered",
    showIf: { question: "script", in: ["cyrillic"] },
    miss: 0.02,
    options: [
      { id: "uk", label: "ї є ґ or і (Ukrainian)", match: { field: "cyr", value: "uk" } },
      { id: "kk", label: "ә қ ғ ң ұ (Kazakh)", match: { field: "cyr", value: "kk" } },
      { id: "mn", label: "ө ү but no ә қ (Mongolian)", match: { field: "cyr", value: "mn" } },
      { id: "sr", label: "ђ ћ џ љ њ ј (Serbian)", match: { field: "cyr", value: "sr" } },
      { id: "bg", label: "ъ mid-word, never ы or э (Bulgarian)", match: { field: "cyr", value: "bg" } },
      { id: "ru", label: "ы э, none of the above (Russian)", match: { field: "cyr", value: "ru" } },
    ],
  },
  {
    id: "indic",
    text: "Which Indic script is it?",
    type: "single",
    source: "curated",
    note: "hand-entered",
    showIf: { question: "script", in: ["indic"] },
    miss: 0.02,
    options: [
      { id: "devanagari", label: "Devanagari — flat top line (हिन्दी)", match: { field: "indic", value: "devanagari" } },
      { id: "bengali", label: "Bengali — top line, pointy letters (বাংলা)", match: { field: "indic", value: "bengali" } },
      { id: "sinhala", label: "Sinhala — round and loopy, no top line (සිංහල)", match: { field: "indic", value: "sinhala" } },
      { id: "tamil", label: "Tamil — angular loops (தமிழ்)", match: { field: "indic", value: "tamil" } },
      { id: "other", label: "Other round script (తెలుగు, ಕನ್ನಡ, മലയാളം, ગુજરાતી)", match: { field: "indic", value: "other" } },
    ],
  },
  {
    id: "warning",
    text: "What do the warning signs (curves, crossings, animals) look like?",
    help: "Not the stop/give-way signs — the ones warning of a hazard ahead.",
    type: "single",
    source: "curated",
    note: "hand-entered",
    miss: 0.04,
    options: [
      {
        id: "diamond",
        label: "Yellow diamond",
        match: { field: "warn", value: "diamond" },
        patterns: ["diamond[- ]shaped (yellow )?warning", "yellow diamond"],
      },
      {
        id: "whitetri",
        label: "Triangle, red border, white inside",
        match: { field: "warn", value: "whitetri" },
        patterns: ["triangular warning signs?", "warning signs?[^.]{0,40}white background"],
      },
      {
        id: "yellowtri",
        label: "Triangle, red border, yellow inside",
        match: { field: "warn", value: "yellowtri" },
        patterns: ["warning signs?[^.]{0,60}yellow background", "triangular warning signs? have a yellow"],
      },
    ],
  },
  {
    id: "language",
    cost: 1.5,
    text: "Which language are the signs in?",
    help: "Only for Latin-script text. Look for small words: 'rua' (pt), 'calle' (es), 'straße' (de), 'ul.' (pl).",
    type: "single",
    source: "curated",
    showIf: { question: "script", in: ["latin"] },
    options: [
      { id: "en", label: "English", match: { field: "lang", value: "en" } },
      { id: "es", label: "Spanish", match: { field: "lang", value: "es" } },
      { id: "pt", label: "Portuguese", match: { field: "lang", value: "pt" } },
      { id: "fr", label: "French", match: { field: "lang", value: "fr" } },
      { id: "de", label: "German", match: { field: "lang", value: "de" } },
      { id: "it", label: "Italian", match: { field: "lang", value: "it" } },
      { id: "nl", label: "Dutch", match: { field: "lang", value: "nl" } },
      { id: "sv", label: "Swedish (ä ö å)", match: { field: "lang", value: "sv" } },
      { id: "dano", label: "Danish / Norwegian (æ ø å)", match: { field: "lang", value: "dano" } },
      { id: "fi", label: "Finnish (ää, kk)", match: { field: "lang", value: "fi" } },
      { id: "pl", label: "Polish (ł ż ś)", match: { field: "lang", value: "pl" } },
      { id: "cs", label: "Czech (ř ů ě)", match: { field: "lang", value: "cs" } },
      { id: "hu", label: "Hungarian (ő ű)", match: { field: "lang", value: "hu" } },
      { id: "ro", label: "Romanian (ș ț ă)", match: { field: "lang", value: "ro" } },
      { id: "sh", label: "Croatian / Serbian (č ć đ)", match: { field: "lang", value: "sh" } },
      { id: "tr", label: "Turkish (ğ ı ş)", match: { field: "lang", value: "tr" } },
      { id: "ms", label: "Indonesian / Malay", match: { field: "lang", value: "ms" } },
      { id: "vi", label: "Vietnamese (ư ơ ạ)", match: { field: "lang", value: "vi" } },
      { id: "af", label: "Afrikaans", match: { field: "lang", value: "af" } },
      { id: "sw", label: "Swahili", match: { field: "lang", value: "sw" } },
    ],
  },
  {
    id: "sun",
    cost: 1.3,
    text: "Where is the sun (or the shadows pointing away from it)?",
    help: "Use the compass. Around midday the sun is south of you in the northern hemisphere and north of you in the southern hemisphere.",
    type: "single",
    source: "curated",
    options: [
      { id: "south", label: "Sun in the south → northern hemisphere", match: { field: "hemi", value: "north" } },
      { id: "north", label: "Sun in the north → southern hemisphere", match: { field: "hemi", value: "south" } },
      { id: "overhead", label: "Almost directly overhead → near equator", match: { field: "hemi", value: "equator" } },
    ],
  },
  {
    id: "speed",
    text: "Are speed limits in miles or kilometres?",
    help: "Look for 'MPH' or 'Speed Limit' signs with values like 25, 35, 45, 55 — or a plain number in a red circle (km/h).",
    type: "single",
    source: "curated",
    options: [
      { id: "mph", label: "Miles (mph)", match: { field: "speed", value: "mph" } },
      { id: "kmh", label: "Kilometres (km/h)", match: { field: "speed", value: "kmh" } },
    ],
  },
  {
    id: "stop",
    text: "What does the stop sign say?",
    type: "single",
    source: "curated",
    // Near-knockout; slightly softer than driving side in case of odd signs.
    miss: 0.03,
    options: [
      { id: "stop", label: "STOP", match: { field: "stop", value: "stop" }, patterns: ["stop signs?"] },
      { id: "alto", label: "ALTO", match: { field: "stop", value: "alto" }, patterns: ["\\balto\\b"] },
      { id: "pare", label: "PARE", match: { field: "stop", value: "pare" }, patterns: ["\\bpare\\b"] },
      { id: "arret", label: "ARRÊT", match: { field: "stop", value: "arret" }, patterns: ["arr[êe]t"] },
      { id: "local", label: "Local script only (止まれ, หยุด, 停, 정지)", match: { field: "stop", value: "local" } },
      { id: "other", label: "Another word or a symbol (DUR, BERHENTI, hand)", match: { field: "stop", value: "other" } },
    ],
  },
  {
    id: "centreline",
    text: "What colour is the centre line on two-way roads?",
    help: "Ignore edge lines — South Africa, Ireland and Israel have yellow edges but white centres.",
    type: "single",
    source: "curated",
    note: "hand-entered",
    // Some countries mix both; a mismatch is a strong but not total rule-out.
    miss: 0.04,
    options: [
      {
        id: "yellow",
        label: "Yellow",
        match: { field: "centre", value: "yellow" },
        patterns: ["yellow (centre|center|middle)", "(centre|center|middle) lines? (is|are) (usually |mostly |typically )?yellow", "double yellow", "yellow (road ?)?lines", "all[- ]yellow"],
      },
      {
        id: "white",
        label: "White",
        match: { field: "centre", value: "white" },
        patterns: ["white (centre|center|middle)", "(centre|center|middle) lines? (is|are) (usually |mostly |typically )?white", "white (road ?)?lines", "all[- ]white"],
      },
    ],
  },
  {
    id: "plates",
    text: "What do the licence plates on ordinary cars look like?",
    help: "Ignore taxis, buses and trucks — they often use different colours. Plates are usually blurred, but colour and shape still show.",
    type: "single",
    source: "curated",
    // Softer than other core facts: plates are often blurred, some countries
    // mix styles, and US/Canadian plates vary a lot by state or province.
    miss: 0.08,
    options: [
      {
        id: "uk",
        label: "White front, yellow rear",
        match: { field: "plate", value: "uk" },
        patterns: ["white front.{0,40}yellow (rear|back)", "yellow (rear|back) (licen[cs]e |number )?plates?", "(rear|back) plates? (are|is) yellow"],
      },
      {
        id: "yellow",
        label: "Yellow (front and rear)",
        match: { field: "plate", value: "yellow" },
        patterns: ["yellow (licen[cs]e |number )?plates?", "plates? (are|is) yellow"],
      },
      {
        id: "eu",
        label: "White with a blue strip on the left",
        match: { field: "plate", value: "eu" },
        patterns: ["(eu|european) (blue )?(strip|band)", "(strip|band) on the left", "eu[- ]style plates?"],
      },
      {
        id: "mercosur",
        label: "White with a blue band across the top",
        match: { field: "plate", value: "mercosur" },
        patterns: ["mercosur", "blue (band|strip|stripe|bar) (on|at|across) (the )?top"],
      },
      {
        id: "white",
        label: "Plain white / light",
        match: { field: "plate", value: "white" },
        patterns: ["white (licen[cs]e |number )?plates?"],
      },
      {
        id: "black",
        label: "Black",
        match: { field: "plate", value: "black" },
        patterns: ["black (licen[cs]e |number )?plates?"],
      },
    ],
  },
  {
    id: "car",
    text: "Anything distinctive about the Google car (look down)?",
    help: "Tick everything you can see. Unticked items are not held against any country.",
    type: "multi",
    source: "plonkit",
    options: [
      { id: "snorkel", label: "Snorkel", patterns: ["snorkel"] },
      { id: "rack", label: "Roof rack", patterns: ["roof rack", "\\brack\\b"] },
      { id: "black", label: "Black car", patterns: ["black (google )?car"] },
      { id: "white", label: "White car", patterns: ["white (google )?car"] },
      { id: "follow", label: "Follow / escort car behind", patterns: ["follow(ing)? car", "escort (car|vehicle)", "follow vehicle"] },
      { id: "antenna", label: "Antenna visible", patterns: ["antenna"] },
      { id: "tape", label: "Tape on the car", patterns: ["\\btape\\b"] },
    ],
  },
  {
    id: "climate",
    text: "What's the climate like?",
    help: "Judge it from the vegetation. Season matters: dry season can look arid, winter can look cold.",
    type: "sliders",
    source: "curated",
    note: "hand-entered range",
    badge: "Gut feeling",
    confidence: { default: 60 },
    axes: [
      {
        id: "temp",
        field: "temp",
        left: "Cold",
        right: "Hot",
        words: ["frozen", "cold", "cool", "mild", "warm", "hot", "tropical heat"],
      },
      {
        id: "wet",
        field: "wet",
        left: "Dry",
        right: "Wet",
        words: ["bare desert", "arid", "dry", "moderate", "green", "lush", "rainforest"],
      },
    ],
    // Vegetation tips shown as evidence in the country popup (not scored).
    patterns: [
      "tropical", "jungle", "rainforest", "banana", "desert", "\\barid\\b", "semi-arid",
      "mediterranean", "olive (trees?|groves?)", "deciduous", "conifer", "boreal", "taiga", "tundra", "\\bbirch", "spruce",
    ],
    options: [],
  },
  {
    id: "roads",
    text: "What condition is the road in?",
    help: "Potholes, patching and crumbling edges vs. smooth asphalt with crisp markings. Dirt roads go at the far left.",
    type: "sliders",
    source: "curated",
    note: "hand-entered range",
    badge: "Gut feeling",
    // Road quality varies a lot within a country, so it starts softer than climate.
    confidence: { default: 40 },
    axes: [
      {
        id: "road",
        field: "road",
        left: "Broken / dirt",
        right: "Pristine",
        words: ["dirt track", "broken", "patchy", "average", "decent", "smooth", "pristine"],
      },
    ],
    // Road-condition tips shown as evidence in the country popup (not scored).
    patterns: [
      "dirt roads?", "unpaved", "gravel roads?", "pothole", "poor(ly)? (road |quality|condition|maintained)",
      "well[- ]maintained", "high[- ]quality roads?", "smooth (asphalt|roads?)",
    ],
    options: [],
  },
  {
    id: "landscape",
    text: "What do you see in the landscape?",
    help: "Tick everything that applies.",
    type: "multi",
    source: "plonkit",
    // Desert lives in the climate question and dirt roads in the road question,
    // so they aren't counted twice.
    options: [
      { id: "snow", label: "Snow", patterns: ["\\bsnow"] },
      { id: "palm", label: "Palm trees", patterns: ["palm trees?", "\\bpalms\\b"] },
      {
        id: "redsoil",
        label: "Red soil",
        // Hand-entered prevalence (countries.mjs) outweighs a passing mention.
        prevalence: "redsoil",
        // Also "soil in most of Brazil is distinctly red", "reddish dirt", "bright orange soil".
        patterns: [
          "\\b(red|reddish|orange|red-brown)(-| )(soil|dirt|earth|sand|gravel|clay)",
          "\\b(soil|dirt|earth|clay)\\b[^.]{0,40}\\b(red|reddish|orange)\\b",
        ],
      },
      { id: "rice", label: "Rice paddies", patterns: ["rice (paddies|paddy|fields?)", "paddy fields?"] },
    ],
  },
  {
    id: "poles",
    text: "What are the utility poles made of?",
    type: "multi",
    source: "plonkit",
    options: [
      { id: "wood", label: "Wood", patterns: ["wooden (utility |electricity |power )?poles?"] },
      { id: "concrete", label: "Concrete", patterns: ["concrete (utility |electricity |power )?poles?"] },
      { id: "metal", label: "Metal / steel", patterns: ["(metal|steel|iron|metallic|tubular) (utility |electricity |power )?poles?"] },
    ],
  },
  {
    id: "vehicles",
    text: "Any distinctive vehicles on the road?",
    help: "Tick everything you can see.",
    type: "multi",
    source: "plonkit",
    options: [
      { id: "tuktuk", prevalence: "tuktuk", label: "Tuk-tuks / auto-rickshaws / mototaxis", patterns: ["tuk[- ]?tuks?", "(auto[- ])?rickshaws?", "mototaxis?", "tricycles?", "\\bbajaj\\b", "\\bkeke\\b"] },
      { id: "motorbikes", prevalence: "moto", label: "Lots of motorbikes / scooters", patterns: ["(lots|many|plenty|abundance) of (motorbikes|motorcycles|scooters)", "(motorbikes|motorcycles|scooters) (are )?(very )?(common|everywhere|abundant)"] },
      { id: "carts", prevalence: "carts", label: "Horse, donkey or ox carts", patterns: ["(horse|donkey|ox|animal)[- ](drawn )?(carts?|carriages?|buggies)"] },
    ],
  },
  {
    id: "edges",
    text: "Anything unusual about the road edges?",
    help: "Tick everything you can see.",
    type: "multi",
    source: "plonkit",
    options: [
      { id: "yellowedge", prevalence: "yellowedge", label: "Yellow edge lines", patterns: ["yellow (edge|outer|side|shoulder) ?lines?", "edge lines? (is|are) (usually |mostly |typically )?yellow", "yellow lines? (on|along) the (edges?|sides?)"] },
      { id: "kerbs", prevalence: "kerbs", label: "Painted kerbs (striped colours)", patterns: ["(black|red|yellow|blue)[- ](and|&)[- ](white|yellow|black) (kerbs?|curbs?|kerbstones?)", "(kerbs?|curbs?)[^.]{0,30}painted", "painted (kerbs?|curbs?)"] },
    ],
  },
  {
    id: "chevrons",
    cost: 1.3,
    text: "What colour are the chevron signs on curves?",
    type: "multi",
    source: "plonkit",
    options: [
      { id: "yellowblack", label: "Yellow & black", patterns: ["(yellow|black) (and|&|on|with) (black|yellow) chevrons?", "yellow chevrons?"] },
      { id: "redwhite", label: "Red & white", patterns: ["(red|white) (and|&|on|with) (white|red) chevrons?", "red chevrons?"] },
      { id: "blackwhite", label: "Black & white", patterns: ["black (and|&|on|with) white chevrons?", "white (and|&|on|with) black chevrons?"] },
    ],
  },
];

// Keyword buckets used to label tips when browsing a country's guide.
// Plonk It's own tags are used first; these fill in untagged tips.
export const CATEGORIES = {
  signs: ["\\bsigns?\\b", "chevron"],
  roadlines: ["road ?lines?", "markings", "centre line", "center line"],
  poles: ["\\bpoles?\\b"],
  bollards: ["bollards?"],
  car: ["google car", "\\bcar\\b", "snorkel", "\\brack\\b", "antenna"],
  plates: ["plates?"],
  landscape: ["landscape", "vegetation", "trees?", "\\bsoil\\b", "desert", "mountain", "snow"],
  architecture: ["houses?", "buildings?", "architecture", "roofs?"],
  language: ["language", "spelling", "alphabet", "letters?"],
  coverage: ["coverage", "gen ?[1-4]", "camera"],
};

// Plonk It's own tags, mapped onto the buckets above.
export const TAG_TO_CATEGORY = {
  "chevron/sign": "signs",
  roadline: "roadlines",
  pole: "poles",
  bollard: "bollards",
  "license plates": "plates",
  landscape: "landscape",
  vegetation: "landscape",
  architecture: "architecture",
  language: "language",
  coverage: "coverage",
  "moving info": "car",
  guardrail: "signs",
};
