// Bayesian-style ranking over countries.
//
// posterior(country) ∝ prior weight × Π likelihood(answer | country)
//
// Curated facts (driving side, script, …) are near-certain, so a mismatch
// almost rules a country out. Plonk It-mined clues are soft: a guide not
// mentioning something is weak evidence, since guides don't list everything.

export const LIKELIHOOD = {
  curatedMatch: 1,
  curatedSecondary: 0.35, // e.g. Latin script in India, French in Canada
  curatedMiss: 0.01,
  hemiNearEquator: 0.4, // equatorial country when sun is clearly north/south
  hemiOverheadMiss: 0.15,
  minedHit: 1,
  minedMiss: 0.3,
  minedSiblingOnly: 0.12, // guide mentions a different option but not this one
};

export function asArray(v) {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

function curatedLikelihood(country, question, option, confidence) {
  const { field, value } = option.match;
  if (field === "hemi") {
    if (country.hemi === value) return LIKELIHOOD.curatedMatch;
    if (value === "equator") return LIKELIHOOD.hemiOverheadMiss;
    if (country.hemi === "equator") return LIKELIHOOD.hemiNearEquator;
    return LIKELIHOOD.curatedMiss;
  }
  const values = asArray(country[field]);
  const idx = values.indexOf(value);
  if (idx === 0) return LIKELIHOOD.curatedMatch;
  const miss = missLikelihood(question, confidence);
  if (idx > 0) return Math.max(LIKELIHOOD.curatedSecondary, miss);
  return miss;
}

// Questions with a confidence slider scale the mismatch penalty from none
// (0%) to a near rule-out (100%): miss = curatedMiss ^ confidence.
export function missLikelihood(question, confidence) {
  if (question.confidence) {
    const c = (confidence ?? question.confidence.default) / 100;
    return LIKELIHOOD.curatedMiss ** c;
  }
  return question.miss ?? LIKELIHOOD.curatedMiss;
}

// ---------- slider questions (e.g. climate: cold-hot, dry-wet) ----------

// How far off a player's slider reading can be (on the 0-100 scale).
export const SLIDER_NOISE = 12;

// Standard normal CDF (Abramowitz & Stegun 7.1.26 approximation of erf).
function normalCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496735) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

// Likelihood of a reading v given a country's [lo, hi] range: a uniform
// spread over the range, blurred by reading noise, relative to a uniform
// guess over 0-100. Narrow ranges that contain v score higher than wide ones.
export function axisLikelihood([lo, hi], v) {
  const width = Math.max(hi - lo, 1);
  const p = (normalCdf((v - lo) / SLIDER_NOISE) - normalCdf((v - hi) / SLIDER_NOISE)) / width;
  return p * 100;
}

export function slidersLikelihood(country, question, reading, confidence) {
  const c = (confidence ?? question.confidence?.default ?? 100) / 100;
  const l = question.axes.reduce((prod, axis) => prod * axisLikelihood(country[axis.field], reading[axis.id]), 1);
  // Same curve as missLikelihood: 0% confidence = no effect, 100% = full weight.
  return Math.max(l ** c, LIKELIHOOD.curatedMiss);
}

export const isSliderReading = (q, ans) =>
  q.type === "sliders" && ans != null && typeof ans === "object" && !Array.isArray(ans) &&
  q.axes.every((a) => typeof ans[a.id] === "number");

export function hasEvidence(db, questionId, optionId, slug) {
  return Boolean(db.evidence[`${questionId}.${optionId}`]?.[slug]?.length);
}

// How strongly a ticked clue favours a country, by hand-entered prevalence.
// Unlisted countries: a passing guide mention counts as "regional".
export const PREVALENCE = { widespread: 1, common: 0.6, regional: 0.3, none: 0.1 };

export function prevalenceLevel(db, country, question, option) {
  if (country[option.prevalence]) return country[option.prevalence];
  if (option.guideFallback === false) return "none";
  return hasEvidence(db, question.id, option.id, country.slug) ? "regional" : "none";
}

function minedLikelihood(db, country, question, option) {
  if (option.prevalence) return PREVALENCE[prevalenceLevel(db, country, question, option)];
  if (hasEvidence(db, question.id, option.id, country.slug)) return LIKELIHOOD.minedHit;
  if (question.type === "single") {
    const sibling = question.options.some((o) => o.id !== option.id && hasEvidence(db, question.id, o.id, country.slug));
    if (sibling) return LIKELIHOOD.minedSiblingOnly;
  }
  return LIKELIHOOD.minedMiss;
}

// ---------- "None of these" on multi-choice questions ----------
//
// A multi question answered with an empty list means "I looked and saw none
// of these". Each option has a chance of being visible at a random spot in a
// country, proportional to the likelihood used when it *is* ticked, so ticking
// and not ticking tell the same story. Kept small: one spot shows little.
// A guide mention is often regional ("rice fields in the Ebro delta"), so it
// only implies a small chance of seeing the clue at a random spot.
export const SEE_SCALE = { prevalence: 0.5, mined: 0.1 };

export function seeProbability(db, country, question, option) {
  const scale = option.prevalence ? SEE_SCALE.prevalence : SEE_SCALE.mined;
  return scale * minedLikelihood(db, country, question, option);
}

export const isNoneAnswer = (q, ans) => q.type === "multi" && Array.isArray(ans) && ans.length === 0;

export function noneLikelihood(db, country, question) {
  return question.options.reduce((p, o) => p * (1 - seeProbability(db, country, question, o)), 1);
}

export function optionLikelihood(db, country, question, option, confidence) {
  return question.source === "curated"
    ? curatedLikelihood(country, question, option, confidence)
    : minedLikelihood(db, country, question, option);
}

// Single-choice questions with `multiple: true` let the player pick several
// options when unsure (e.g. two continents). The best-fitting one counts.
export function bestOption(db, country, question, ans, confidence) {
  let best = null;
  for (const oid of asArray(ans)) {
    const option = question.options.find((o) => o.id === oid);
    if (!option) continue;
    const lik = optionLikelihood(db, country, question, option, confidence);
    if (!best || lik > best.lik) best = { option, lik };
  }
  return best;
}

// answers: { [questionId]: optionId | optionId[] | { [axisId]: 0-100 } }
// clues:   [{ phrase, slugs: { [slug]: tipIds[] } }]  (free-text search clues)
// confidence: { [questionId]: 0-100 } for questions with a confidence slider
export function rank(db, answers, clues = [], confidence = {}) {
  const qById = Object.fromEntries(db.questions.map((q) => [q.id, q]));
  const scores = db.countries.map((country) => {
    let p = country.weight;
    for (const [qid, ans] of Object.entries(answers)) {
      const q = qById[qid];
      if (!q) continue;
      if (q.type === "sliders") {
        if (isSliderReading(q, ans)) p *= slidersLikelihood(country, q, ans, confidence[qid]);
        continue;
      }
      if (isNoneAnswer(q, ans)) {
        p *= noneLikelihood(db, country, q);
        continue;
      }
      if (q.multiple) {
        // "Any of these": a country only needs to fit one picked option.
        const best = bestOption(db, country, q, ans, confidence[qid]);
        if (best) p *= best.lik;
        continue;
      }
      for (const oid of asArray(ans)) {
        const opt = q.options.find((o) => o.id === oid);
        if (opt) p *= optionLikelihood(db, country, q, opt, confidence[qid]);
      }
    }
    for (const clue of clues) {
      p *= clue.slugs[country.slug] ? LIKELIHOOD.minedHit : LIKELIHOOD.minedMiss;
    }
    return { country, p };
  });
  const total = scores.reduce((s, x) => s + x.p, 0) || 1;
  return scores.map((s) => ({ ...s, prob: s.p / total })).sort((a, b) => b.prob - a.prob);
}

const entropy = (probs) => -probs.reduce((h, p) => (p > 0 ? h + p * Math.log2(p) : h), 0);

// Expected information gain (bits) from asking a question, given the current
// posterior. Single-choice options are treated as mutually exclusive outcomes.
// Multi-choice questions with a "None" answer are modelled as "you'll tick
// option X" or "you'll see none of them", using the same visibility chances
// the ranking uses; without one, only ticks carry information.
export function informationGain(db, question, ranked) {
  const prior = ranked.map((r) => r.prob);
  const h0 = entropy(prior);

  // Slider questions: approximate the readings with a 5-step grid per axis.
  const grid = [10, 30, 50, 70, 90];
  const readings = question.type === "sliders"
    ? question.axes.reduce((acc, axis) => acc.flatMap((r) => grid.map((v) => ({ ...r, [axis.id]: v }))), [{}])
    : [];

  const outcomes = question.type === "sliders"
    ? [readings.map((reading) => ranked.map((r) => slidersLikelihood(r.country, question, reading)))]
    : question.type === "single"
    ? [question.options.map((o) => ranked.map((r) => optionLikelihood(db, r.country, question, o)))]
    : [[
        ...question.options.map((o) => ranked.map((r) => seeProbability(db, r.country, question, o))),
        // Without a "None" button, seeing nothing is a skip: same for every country.
        ranked.map((r) => (question.none ? noneLikelihood(db, r.country, question) : 1)),
      ]];

  let gain = 0;
  for (const liks of outcomes) {
    // Normalise per country so each country's outcome probabilities sum to 1.
    const norm = prior.map((_, i) => liks.reduce((s, l) => s + l[i], 0));
    let expected = 0;
    for (const l of liks) {
      const joint = prior.map((p, i) => p * (l[i] / norm[i]));
      const pOutcome = joint.reduce((s, x) => s + x, 0);
      if (pOutcome > 0) expected += pOutcome * entropy(joint.map((x) => x / pOutcome));
    }
    gain += h0 - expected;
  }
  // Multi-choice questions are slower to answer and noisier; discount them.
  return question.type === "multi" ? gain * 0.5 : gain;
}

export function isVisible(question, answers) {
  const cond = question.showIf;
  if (!cond) return true;
  return cond.in.includes(answers[cond.question]);
}

export function nextQuestion(db, answers, skipped, ranked) {
  const candidates = db.questions.filter(
    (q) => !(q.id in answers) && !skipped.includes(q.id) && isVisible(q, answers),
  );
  let best = null;
  for (const q of candidates) {
    const gain = informationGain(db, q, ranked) / (q.cost || 1);
    if (!best || gain > best.gain) best = { question: q, gain };
  }
  return best;
}
