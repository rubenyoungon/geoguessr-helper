import { rank, nextQuestion, optionLikelihood, bestOption, hasEvidence, isVisible, asArray, missLikelihood, isSliderReading, prevalenceLevel, isNoneAnswer, noneLikelihood, seeProbability, LIKELIHOOD } from "./scoring.js";

const STORAGE_KEY = "plonk-helper-state-v1";
const TOP_N = 15;

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) node.append(c.nodeType ? c : document.createTextNode(c));
  return node;
};

let db;
// history: question ids in the order they were answered or skipped (for Back).
const freshState = () => ({ answers: {}, skipped: [], clues: [], confidence: {}, history: [], focus: null });
let state = freshState();
// Selections on the question card are drafts until Next commits them.
// draftFor is the question they belong to; showing another question resets them.
let draftFor = null;
let draftSingle = null;
let draftMulti = new Set();
let draftSliders = {}; // axis id -> 0-100

// ---------- persistence ----------

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) state = { ...state, ...saved, focus: null };
  } catch {}
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ---------- helpers ----------

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Plonk It tips are light markdown: **bold**, *italic*, [links](url), "- " bullets.
function md(line) {
  let html = escapeHtml(line.trim());
  html = html.replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\*\*/g, "");
  return html;
}

function renderTipText(lines) {
  const wrap = el("div", { class: "tip-text" });
  let list = null;
  for (const raw of lines) {
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      const bullet = line.match(/^\s*-\s+(.*)/);
      if (bullet) {
        if (!list) wrap.append((list = el("ul")));
        const li = el("li");
        li.innerHTML = md(bullet[1]);
        list.append(li);
      } else {
        list = null;
        const p = el("p", { class: /^\s*NOTE/i.test(line) ? "note" : null });
        p.innerHTML = md(line);
        wrap.append(p);
      }
    }
  }
  return wrap;
}

// Flag emoji don't render on Windows, so show the ISO code as a badge.
const flag = (code) => (code || "??").slice(0, 2);

const questionById = (id) => db.questions.find((q) => q.id === id);
const optionLabel = (q, oid) => q.options.find((o) => o.id === oid)?.label ?? oid;
const tipById = (slug, id) => db.tips[slug]?.find((t) => t.id === id);
const currentRank = () => rank(db, state.answers, state.clues, state.confidence);

function describeConfidence(c) {
  if (c <= 20) return "just a hunch";
  if (c <= 50) return "somewhat sure";
  if (c <= 80) return "fairly sure";
  return "certain";
}

// "How sure are you?" slider. Dragging re-ranks live without re-rendering
// the slider itself, so the drag isn't interrupted.
function confidenceSlider(q) {
  const value = state.confidence[q.id] ?? q.confidence.default;
  const readout = el("span", { class: "confidence-value" }, `${value}% · ${describeConfidence(value)}`);
  const input = el("input", {
    type: "range",
    min: "0",
    max: "100",
    step: "5",
    value: String(value),
    "aria-label": `How sure are you? (${q.text})`,
    oninput: (e) => {
      const v = Number(e.target.value);
      state.confidence[q.id] = v;
      readout.textContent = `${v}% · ${describeConfidence(v)}`;
      if (q.id in state.answers) renderRanking(currentRank());
    },
    onchange: save,
  });
  return el("label", { class: "confidence" }, el("span", { class: "confidence-label" }, "How sure are you?", readout), input);
}

const SLIDER_DEFAULT = 50;

function describeAxis(axis, v) {
  return axis.words[Math.min(axis.words.length - 1, Math.floor((v / 100) * axis.words.length))];
}

const describeReading = (q, reading) => q.axes.map((a) => describeAxis(a, reading[a.id])).join(" · ");

// One axis of a slider question ("Cold ... Hot"). onInput gets the new value;
// the slider updates its own readout so it isn't re-rendered mid-drag.
function axisSlider(axis, value, onInput, onChange) {
  const readout = el("span", { class: "axis-value" }, describeAxis(axis, value));
  const input = el("input", {
    type: "range",
    min: "0",
    max: "100",
    step: "1",
    value: String(value),
    "aria-label": `${axis.left} to ${axis.right}`,
    oninput: (e) => {
      const v = Number(e.target.value);
      readout.textContent = describeAxis(axis, v);
      onInput(v);
    },
    onchange: onChange,
  });
  return el("div", { class: `axis axis-${axis.id}` },
    el("div", { class: "axis-ends" }, el("span", {}, axis.left), readout, el("span", {}, axis.right)),
    input,
  );
}

// ---------- actions ----------

// Changing an earlier answer keeps its original place in the order.
function recordStep(qid) {
  if (!state.history.includes(qid)) state.history.push(qid);
}

// Keep history to questions that are still answered or skipped, adding any
// that predate it (e.g. state saved before history existed).
function syncHistory() {
  const done = (id) => id in state.answers || state.skipped.includes(id);
  const kept = (state.history || []).filter(done);
  const missing = [...Object.keys(state.answers), ...state.skipped].filter((id) => !kept.includes(id));
  state.history = [...kept, ...missing];
}

// The question Back returns to: the one answered before the question on screen.
function backTarget() {
  const idx = state.focus ? state.history.indexOf(state.focus) : -1;
  return state.history[(idx === -1 ? state.history.length : idx) - 1] ?? null;
}

function answer(qid, value) {
  state.answers[qid] = value;
  state.skipped = state.skipped.filter((id) => id !== qid);
  // Hidden follow-ups (e.g. language after a non-Latin script) are dropped.
  for (const q of db.questions) if (q.id in state.answers && !isVisible(q, state.answers)) delete state.answers[q.id];
  recordStep(qid);
  syncHistory();
  state.focus = null;
  draftFor = null;
  update();
}

function skip(qid) {
  if (!state.skipped.includes(qid)) state.skipped.push(qid);
  delete state.answers[qid];
  recordStep(qid);
  state.focus = null;
  draftFor = null;
  update();
}

function removeAnswer(qid) {
  delete state.answers[qid];
  state.skipped = state.skipped.filter((id) => id !== qid);
  syncHistory();
  update();
}

function focusQuestion(qid) {
  state.focus = qid;
  draftFor = null;
  update();
  $("#questionCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ---------- rendering ----------

function backButton() {
  const target = backTarget();
  return el("button", {
    class: "btn ghost",
    type: "button",
    disabled: !target,
    title: target ? `Back to: ${questionById(target).text}` : "Nothing to go back to",
    onclick: () => focusQuestion(target),
  }, "← Back");
}

function startOver() {
  state = freshState();
  draftFor = null;
  $("#searchInput").value = "";
  $("#searchResults").replaceChildren();
  update();
}

function renderQuestion(ranked) {
  const card = $("#questionCard");
  card.replaceChildren();

  let q = state.focus ? questionById(state.focus) : null;
  let gain = null;
  if (!q) {
    const best = nextQuestion(db, state.answers, state.skipped, ranked);
    q = best?.question;
    gain = best?.gain;
  }

  if (!q) {
    card.append(
      el("p", { class: "eyebrow" }, "All done"),
      el("h2", { class: "q-text" }, "No more questions to ask."),
      el("p", { class: "muted" }, "Check the ranking, open a country to compare its Plonk It clues, or search the guides for something specific you spotted."),
    );
    const actions = el("div", { class: "q-actions" },
      el("button", { class: "btn danger", type: "button", onclick: startOver }, "Start new round"),
      backButton(),
    );
    if (state.skipped.length) {
      actions.append(el("button", { class: "btn ghost", type: "button", onclick: () => { state.skipped = []; syncHistory(); update(); } }, "Revisit skipped questions"));
    }
    card.append(actions);
    return;
  }

  if (draftFor !== q.id) {
    const prev = state.answers[q.id];
    draftFor = q.id;
    draftSingle = typeof prev === "string" ? prev : null;
    draftMulti = new Set(q.multiple ? asArray(prev) : Array.isArray(prev) ? prev : []);
    draftSliders = isSliderReading(q, prev) ? { ...prev } : {};
  }

  const answeredCount = Object.keys(state.answers).length;
  const totalCount = db.questions.filter((x) => isVisible(x, state.answers)).length;
  const sourceBadge = q.source === "plonkit"
    ? el("span", { class: "badge plonk", title: "Matched against Plonk It guide text" }, "From Plonk It guides")
    : el("span", { class: "badge core", title: "Curated fundamentals" }, q.badge || "Core fact");

  card.append(
    el("div", { class: "q-head" },
      el("p", { class: "eyebrow" }, q.id in state.answers ? "Editing answer" : `Question ${answeredCount + state.skipped.length + 1} of ${totalCount}${gain != null ? " · suggested" : ""}`),
      sourceBadge,
    ),
    el("h2", { class: "q-text" }, q.text),
  );
  if (q.help) card.append(el("p", { class: "muted" }, q.help));

  const opts = el("div", { class: `options ${q.options.length > 6 ? "grid" : ""}` });
  if (q.type === "sliders") {
    opts.className = "axes";
    for (const axis of q.axes) {
      draftSliders[axis.id] ??= SLIDER_DEFAULT;
      opts.append(axisSlider(axis, draftSliders[axis.id], (v) => (draftSliders[axis.id] = v)));
    }
  } else if (q.type === "single" && !q.multiple) {
    for (const o of q.options) {
      const selected = draftSingle === o.id;
      opts.append(el("button", {
        class: `option ${selected ? "selected" : ""}`,
        type: "button",
        "aria-pressed": String(selected),
        onclick: () => {
          draftSingle = o.id;
          renderQuestion(ranked);
        },
      }, o.label));
    }
  } else {
    for (const o of q.options) {
      const on = draftMulti.has(o.id);
      opts.append(
        el("button", {
          class: `option check ${on ? "selected" : ""}`,
          type: "button",
          "aria-pressed": String(on),
          onclick: () => {
            on ? draftMulti.delete(o.id) : draftMulti.add(o.id);
            renderQuestion(ranked);
          },
        }, el("span", { class: "box", "aria-hidden": "true" }, on ? "✓" : ""), o.label),
      );
    }
  }
  // Sliders read best as "set the axes, then say how sure you are".
  if (q.type === "sliders") card.append(opts);
  if (q.confidence) card.append(confidenceSlider(q));
  if (q.type !== "sliders") card.append(opts);

  const draft = q.type === "sliders" ? { ...draftSliders }
    : q.type === "multi" || q.multiple ? (draftMulti.size ? [...draftMulti] : null)
    : draftSingle;
  const actions = el("div", { class: "q-actions" },
    backButton(),
    el("button", {
      class: "btn",
      type: "button",
      disabled: draft == null,
      title: draft == null ? (q.type === "multi" ? "Tick what you see first" : "Pick an answer first") : null,
      onclick: () => answer(q.id, draft),
    }, "Next →"),
  );
  if (q.type === "multi" && q.none) {
    actions.append(el("button", {
      class: "btn ghost",
      type: "button",
      title: "You could see clearly and none of these are there",
      onclick: () => answer(q.id, []),
    }, "None of these"));
  }
  actions.append(el("button", { class: "btn ghost", type: "button", onclick: () => skip(q.id) }, q.type === "multi" ? "Can't tell" : "Skip / can't tell"));

  const others = db.questions.filter((x) => x.id !== q.id && !(x.id in state.answers) && isVisible(x, state.answers));
  if (others.length) {
    const select = el("select", { class: "jump", "aria-label": "Jump to another question", onchange: (e) => e.target.value && focusQuestion(e.target.value) },
      el("option", { value: "" }, "Jump to question…"),
      others.map((x) => el("option", { value: x.id }, x.text)),
    );
    actions.append(select);
  }
  if (state.focus) actions.append(el("button", { class: "btn ghost", type: "button", onclick: () => { state.focus = null; update(); } }, "Cancel"));
  card.append(actions);
}

function renderAnswers() {
  const list = $("#answers");
  list.replaceChildren();
  const entries = Object.entries(state.answers);
  for (const [qid, ans] of entries) {
    const q = questionById(qid);
    if (!q) continue;
    const label = el("span", { class: "answer-a" }, q.type === "sliders" ? describeReading(q, ans)
      : isNoneAnswer(q, ans) ? "None of these"
      : asArray(ans).map((a) => optionLabel(q, a)).join(", "));
    const sliders = q.type === "sliders"
      ? el("div", { class: "axes compact" }, q.axes.map((axis) => axisSlider(axis, ans[axis.id], (v) => {
          ans[axis.id] = v;
          label.textContent = describeReading(q, ans);
          renderRanking(currentRank());
        }, save)))
      : null;
    list.append(el("li", { class: "answer" },
      el("div", {},
        el("span", { class: "answer-q" }, q.text),
        label,
        sliders,
        q.confidence ? confidenceSlider(q) : null,
      ),
      el("div", { class: "answer-actions" },
        el("button", { class: "icon-btn", type: "button", title: "Change", onclick: () => focusQuestion(qid) }, "✎"),
        el("button", { class: "icon-btn", type: "button", title: "Remove", onclick: () => removeAnswer(qid) }, "✕"),
      ),
    ));
  }
  state.clues.forEach((clue, i) => {
    list.append(el("li", { class: "answer" },
      el("div", {},
        el("span", { class: "answer-q" }, "Searched clue"),
        el("span", { class: "answer-a" }, `“${clue.phrase}” · ${Object.keys(clue.slugs).length} countries`),
      ),
      el("div", { class: "answer-actions" },
        el("button", { class: "icon-btn", type: "button", title: "Remove", onclick: () => { state.clues.splice(i, 1); update(); } }, "✕"),
      ),
    ));
  });
  for (const qid of state.skipped) {
    const q = questionById(qid);
    if (!q) continue;
    list.append(el("li", { class: "answer skipped" },
      el("div", {}, el("span", { class: "answer-q" }, q.text), el("span", { class: "answer-a" }, "Skipped")),
      el("div", { class: "answer-actions" },
        el("button", { class: "icon-btn", type: "button", title: "Ask again", onclick: () => removeAnswer(qid) }, "↺"),
      ),
    ));
  }
  $("#answersEmpty").hidden = entries.length + state.clues.length + state.skipped.length > 0;

  // Follow-up questions (e.g. Cyrillic letters) only count once they apply.
  const visible = db.questions.filter((q) => isVisible(q, state.answers));
  const answered = visible.filter((q) => q.id in state.answers).length;
  const skipped = visible.filter((q) => state.skipped.includes(q.id)).length;
  $("#answersMeta").textContent = `${answered} of ${visible.length} answered` + (skipped ? ` · ${skipped} skipped` : "");
}

function renderRanking(ranked) {
  const list = $("#ranking");
  list.replaceChildren();
  const top = ranked.slice(0, TOP_N);
  const max = top[0]?.prob || 1;
  for (const { country, prob } of top) {
    list.append(el("li", {},
      el("button", { class: "rank-row", type: "button", onclick: () => openCountry(country.slug) },
        el("span", { class: "flag", "aria-hidden": "true" }, flag(country.code)),
        el("span", { class: "rank-name" }, country.title, el("small", {}, country.continent)),
        el("span", { class: "bar" }, el("span", { class: "fill", style: `width:${(prob / max) * 100}%` })),
        el("span", { class: "pct" }, `${(prob * 100).toFixed(prob < 0.1 ? 1 : 0)}%`),
      ),
    ));
  }
  const plausible = ranked.filter((r) => r.prob >= 0.01).length;
  $("#candidateMeta").textContent = `${plausible} of ${ranked.length} still plausible`;
}

// ---------- country detail ----------

function tipCard(slug, tip) {
  const img = tip.image
    // Stays collapsed until it loads; Plonk It may refuse hotlinked images.
    ? el("img", {
        src: tip.image,
        alt: "",
        class: "pending",
        loading: "lazy",
        referrerpolicy: "no-referrer",
        onload: (e) => e.target.classList.remove("pending"),
        onerror: (e) => e.target.remove(),
      })
    : null;
  return el("div", { class: "tip" },
    img,
    el("div", {},
      tip.heading || tip.step ? el("p", { class: "tip-heading" }, [tip.step, tip.heading].filter(Boolean).join(" · ")) : null,
      renderTipText(tip.text),
      tip.link ? el("a", { class: "tip-link", href: tip.link, target: "_blank", rel: "noopener" }, "Example on Street View ↗") : null,
    ),
  );
}

const PREVALENCE_VERDICT = {
  widespread: { cls: "yes", sym: "✓" },
  common: { cls: "yes", sym: "✓" },
  // The country has it, just not everywhere: still a fit. The row's text
  // says "regional", and the score boost is smaller than for widespread.
  regional: { cls: "yes", sym: "✓" },
  none: { cls: "no", sym: "✗" },
};

function verdictFor(likelihood) {
  if (likelihood >= LIKELIHOOD.minedHit) return { cls: "yes", sym: "✓" };
  if (likelihood <= LIKELIHOOD.minedSiblingOnly) return { cls: "no", sym: "✗" };
  return { cls: "maybe", sym: "~" };
}

function openCountry(slug) {
  const country = db.countries.find((c) => c.slug === slug);
  const tips = db.tips[slug] || [];
  const body = $("#countryBody");
  body.replaceChildren();

  body.append(el("div", { class: "dialog-head" },
    el("span", { class: "flag big", "aria-hidden": "true" }, flag(country.code)),
    el("div", {},
      el("h2", {}, country.title),
      el("p", { class: "muted small" }, `${country.continent} · drives on the ${country.drive} · ${tips.length} Plonk It tips`),
    ),
    el("div", { class: "dialog-actions" },
      el("a", { class: "btn", href: country.url, target: "_blank", rel: "noopener" }, "Open Plonk It guide ↗"),
      el("button", { class: "icon-btn", type: "button", title: "Close", onclick: () => $("#countryDialog").close() }, "✕"),
    ),
  ));

  // Why it matches: one row per answered option, with Plonk It evidence.
  const why = el("section", { class: "why" }, el("h3", {}, "How it fits your answers"));
  let any = false;
  for (const [qid, ans] of Object.entries(state.answers)) {
    const q = questionById(qid);
    if (!q) continue;
    if (q.type === "sliders") {
      if (!isSliderReading(q, ans)) continue;
      any = true;
      // ✓ inside the country's range on every axis, ~ just outside, ✗ well outside.
      const within = (margin) => q.axes.every((a) => ans[a.id] >= country[a.field][0] - margin && ans[a.id] <= country[a.field][1] + margin);
      const v = within(5) ? { cls: "yes", sym: "✓" } : within(20) ? { cls: "maybe", sym: "~" } : { cls: "no", sym: "✗" };
      const row = el("details", { class: `why-row ${v.cls}` },
        el("summary", {}, el("span", { class: "verdict" }, v.sym), `${q.text} — ${describeReading(q, ans)}`),
      );
      const ranges = q.axes.map((a) => {
        const [lo, hi] = country[a.field];
        const lw = describeAxis(a, lo), hw = describeAxis(a, hi);
        return lw === hw ? lw : `${lw} to ${hw}`;
      });
      row.append(el("p", { class: "muted small" }, `${country.title}: ${ranges.join(" · ")} (${q.note || "hand-entered"}).`));
      (db.evidence[`${q.id}.all`]?.[slug] || []).map((id) => tipById(slug, id)).filter(Boolean).slice(0, 4).forEach((t) => row.append(tipCard(slug, t)));
      why.append(row);
      continue;
    }
    if (isNoneAnswer(q, ans)) {
      any = true;
      const lik = noneLikelihood(db, country, q);
      // Every option keeps a small chance of showing up anywhere, so even a
      // perfect fit lands around 0.8 on a four-option question.
      const v = lik >= 0.7 ? { cls: "yes", sym: "✓" } : lik >= 0.45 ? { cls: "maybe", sym: "~" } : { cls: "no", sym: "✗" };
      const row = el("details", { class: `why-row ${v.cls}` },
        el("summary", {}, el("span", { class: "verdict" }, v.sym), `${q.text} — None of these`),
      );
      // Name the options you'd most expect to see here.
      const likely = q.options
        .map((o) => ({ o, p: seeProbability(db, country, q, o) }))
        .filter((x) => x.p >= 0.25) // hand-entered common / widespread only
        .sort((a, b) => b.p - a.p)
        .map((x) => x.o.label.toLowerCase());
      row.append(el("p", { class: "muted small" }, likely.length
        ? `In ${country.title} you'd often expect: ${likely.join(", ")}.`
        : `None of these are especially common in ${country.title}.`));
      why.append(row);
      continue;
    }
    // Several picks on a "multiple" question: only the best fit counts, so show that one.
    const oids = q.multiple ? [bestOption(db, country, q, ans, state.confidence[qid])?.option.id] : asArray(ans);
    for (const oid of oids) {
      const opt = q.options.find((o) => o.id === oid);
      if (!opt) continue;
      any = true;
      const lik = optionLikelihood(db, country, q, opt, state.confidence[qid]);
      const level = opt.prevalence ? prevalenceLevel(db, country, q, opt) : null;
      const v = level ? PREVALENCE_VERDICT[level]
        : q.source !== "curated" ? verdictFor(lik)
        : lik >= 1 ? { cls: "yes", sym: "✓" }
        : lik > missLikelihood(q, state.confidence[qid]) ? { cls: "maybe", sym: "~" }
        : { cls: "no", sym: "✗" };
      const row = el("details", { class: `why-row ${v.cls}` },
        el("summary", {}, el("span", { class: "verdict" }, v.sym), `${q.text} — ${opt.label}`),
      );
      let ids = db.evidence[`${q.id}.${opt.id}`]?.[slug] || [];
      if (q.source === "curated") {
        const own = asArray(country[opt.match.field]);
        // Short form: "Tropical — lush, dense green…" becomes "Tropical".
        const ownLabels = own.map((val) => (q.options.find((o) => o.match.value === val)?.label ?? val).split(" — ")[0]);
        if (opt.match.field !== "hemi") {
          row.append(el("p", { class: "muted small" }, `${country.title}: ${ownLabels.join(", then ") || "n/a"} (${q.note || "hand-entered"}).`));
        }
        // No tips for the chosen option? Show what the guide says about the country's own one.
        if (!ids.length && own.length) ids = db.evidence[`${q.id}.${own[0]}`]?.[slug] || [];
      } else if (level) {
        const source = country[opt.prevalence] ? "hand-entered" : ids.length ? "only mentioned in the guide" : "not mentioned in the guide";
        row.append(el("p", { class: "muted small" }, `${country.title}: ${opt.label.toLowerCase()} ${level === "none" ? "rare" : level} (${source}).`));
      } else if (!ids.length) {
        const siblings = q.options.filter((o) => o.id !== opt.id && hasEvidence(db, q.id, o.id, slug));
        row.append(el("p", { class: "muted small" }, siblings.length
          ? `The guide mentions ${siblings.map((o) => o.label.toLowerCase()).join(", ")} instead.`
          : "The guide doesn't mention this — weak evidence either way."));
      }
      ids.map((id) => tipById(slug, id)).filter(Boolean).forEach((t) => row.append(tipCard(slug, t)));
      why.append(row);
    }
  }
  for (const clue of state.clues) {
    any = true;
    const ids = clue.slugs[slug] || [];
    const row = el("details", { class: `why-row ${ids.length ? "yes" : "maybe"}` },
      el("summary", {}, el("span", { class: "verdict" }, ids.length ? "✓" : "~"), `Search: “${clue.phrase}”`),
    );
    ids.map((id) => tipById(slug, id)).filter(Boolean).forEach((t) => row.append(tipCard(slug, t)));
    why.append(row);
  }
  if (!any) why.append(el("p", { class: "muted small" }, "Answer a few questions to see how this country matches."));
  body.append(why);

  // Browse all tips by category.
  const cats = [...new Set(tips.flatMap((t) => t.cats))].sort();
  const tipList = el("div", { class: "tips" });
  let active = "all";
  const renderTips = () => {
    tipList.replaceChildren(...tips.filter((t) => active === "all" || t.cats.includes(active)).map((t) => tipCard(slug, t)));
  };
  const chips = el("div", { class: "chips" });
  const renderChips = () => {
    chips.replaceChildren(...["all", ...cats].map((c) =>
      el("button", { class: `chip ${c === active ? "on" : ""}`, type: "button", onclick: () => { active = c; renderChips(); renderTips(); } }, c),
    ));
  };
  renderChips();
  renderTips();
  body.append(el("section", {}, el("h3", {}, "All Plonk It tips"), chips, tipList));

  $("#countryDialog").showModal();
  body.scrollTop = 0;
}

// ---------- tip search ----------

function searchTips(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = {};
  if (!words.length) return results;
  for (const [slug, tips] of Object.entries(db.tips)) {
    for (const tip of tips) {
      const text = tip.text.join(" ").toLowerCase();
      if (words.every((w) => text.includes(w))) (results[slug] ??= []).push(tip.id);
    }
  }
  return results;
}

function renderSearch(query) {
  const out = $("#searchResults");
  out.replaceChildren();
  const results = searchTips(query);
  const slugs = Object.keys(results);
  if (!query.trim()) return;
  if (!slugs.length) {
    out.append(el("p", { class: "muted small" }, `No tips mention “${query}”. Try fewer or simpler words.`));
    return;
  }
  const already = state.clues.some((c) => c.phrase === query);
  out.append(el("div", { class: "search-head" },
    el("span", { class: "small" }, `${slugs.length} countries mention “${query}”`),
    el("button", {
      class: "btn small",
      type: "button",
      disabled: already,
      onclick: () => { state.clues.push({ phrase: query, slugs: results }); update(); renderSearch(query); },
    }, already ? "Added as clue" : "Add as clue"),
  ));
  const byName = slugs.map((s) => db.countries.find((c) => c.slug === s)).sort((a, b) => results[b.slug].length - results[a.slug].length);
  const list = el("ul", { class: "search-list" });
  for (const c of byName) {
    const first = tipById(c.slug, results[c.slug][0]);
    const snippet = first.text.join(" ").replace(/[*_]|\[|\]\([^)]*\)/g, "").slice(0, 140);
    list.append(el("li", {},
      el("button", { class: "search-row", type: "button", onclick: () => openCountry(c.slug) },
        el("span", { class: "flag", "aria-hidden": "true" }, flag(c.code)),
        el("span", {}, el("strong", {}, c.title), ` · ${results[c.slug].length} tip${results[c.slug].length > 1 ? "s" : ""}`, el("small", {}, snippet + "…")),
      ),
    ));
  }
  out.append(list);
}

// ---------- main ----------

function update() {
  save();
  const ranked = currentRank();
  renderQuestion(ranked);
  renderAnswers();
  renderRanking(ranked);
}

async function main() {
  try {
    db = await (await fetch("data/db.json")).json();
  } catch {
    $("#dataStamp").textContent = "Could not load data/db.json — run “npm run update” first.";
    return;
  }
  const tipCount = Object.values(db.tips).reduce((n, t) => n + t.length, 0);
  $("#dataStamp").textContent = `${db.countries.length} countries · ${tipCount.toLocaleString()} Plonk It tips · built ${new Date(db.generatedAt).toLocaleDateString()}`;

  load();
  // Drop anything that no longer exists in a rebuilt database.
  for (const [qid, ans] of Object.entries(state.answers)) {
    const q = questionById(qid);
    if (!q || (q.type === "sliders" && !isSliderReading(q, ans))) {
      delete state.answers[qid];
    } else if (q.type !== "sliders") {
      // Drop options that no longer exist (e.g. landscape "dirt" moved to roads).
      if (isNoneAnswer(q, ans) && q.none) continue;
      const kept = asArray(ans).filter((oid) => q.options.some((o) => o.id === oid));
      if (!kept.length) delete state.answers[qid];
      else if (Array.isArray(ans)) state.answers[qid] = kept;
    }
  }
  syncHistory();

  $("#resetBtn").addEventListener("click", startOver);
  $("#searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    renderSearch($("#searchInput").value.trim());
  });
  $("#countryDialog").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  update();
}

main();
