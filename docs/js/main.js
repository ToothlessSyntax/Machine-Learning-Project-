/* main.js — ES 335 HAR project. Every number shown comes from docs/data/*.json, written by analysis.ipynb. */
"use strict";

const ACTS = ["WALKING", "WALKING_UPSTAIRS", "WALKING_DOWNSTAIRS", "SITTING", "STANDING", "LAYING"];
const NICE = { WALKING: "Walking", WALKING_UPSTAIRS: "Upstairs", WALKING_DOWNSTAIRS: "Downstairs",
               SITTING: "Sitting", STANDING: "Standing", LAYING: "Laying" };
const COLOR = { WALKING: "#2563eb", WALKING_UPSTAIRS: "#0891b2", WALKING_DOWNSTAIRS: "#7c3aed",
                SITTING: "#dc2626", STANDING: "#d97706", LAYING: "#16a34a" };
const SHORT_MODEL = { "Majority Class (Baseline)": "Baseline", "Logistic Regression": "Log. reg.",
                      "Random Forest": "Random forest", "SVM (RBF)": "SVM", "k-Nearest Neighbours": "k-NN" };

const $ = id => document.getElementById(id);
const f3 = x => Number(x).toFixed(3);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function loadJSON(name) {
  // data/data.js (written by the notebook) puts every result file in window.HAR_DATA, so the page
  // works even when opened directly from disk; fetch() is only a fallback.
  if (window.HAR_DATA && window.HAR_DATA[name]) return window.HAR_DATA[name];
  const r = await fetch(`data/${name}`);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  return r.json();
}

/* Horizontal bar rows (used for several charts) */
function barRows(el, rows, { max, fmt = v => v, labelWidth = 150 } = {}) {
  const m = max ?? Math.max(...rows.map(r => r.value));
  el.innerHTML = rows.map(r => `
    <div class="hbar-row" ${r.title ? `title="${esc(r.title)}"` : ""}>
      <span class="hbar-label" style="width:${labelWidth}px">${esc(r.label)}</span>
      <div class="hbar-track">${(r.parts || [{ value: r.value, color: r.color }]).map(p =>
        `<div class="hbar-fill" style="width:${(p.value / m) * 100}%;background:${p.color}"></div>`).join("")}</div>
      <span class="hbar-val">${r.text ?? fmt(r.value)}</span>
    </div>`).join("");
}

/* ── Navbar, counters, scroll fade ── */
function initChrome() {
  const links = $("navLinks");
  $("navBurger")?.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));

  const counterObs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target, target = +el.dataset.target;
      let cur = 0; const step = Math.ceil(target / 50);
      const t = setInterval(() => { cur = Math.min(cur + step, target); el.textContent = cur.toLocaleString(); if (cur >= target) clearInterval(t); }, 20);
      counterObs.unobserve(el);
    }
  }, { threshold: 0.5 });
  document.querySelectorAll("[data-target]").forEach(el => counterObs.observe(el));

  const fadeObs = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("visible"); fadeObs.unobserve(e.target); }
  }, { threshold: 0.05 });
  document.querySelectorAll(".card, .stat-card").forEach(el => { el.classList.add("animate-on-scroll"); fadeObs.observe(el); });
}

/* ── Data section ── */
function renderClassDist(d) {
  const max = Math.max(...d.train_counts);
  $("classDistChart").innerHTML = d.labels.map((l, i) => `
    <div class="hbar-row"><span class="hbar-label" style="width:95px">${NICE[l]}</span>
      <div class="hbar-track double">
        <div class="hbar-fill" style="width:${d.train_counts[i] / max * 100}%;background:${COLOR[l]}"></div>
        <div class="hbar-fill" style="width:${d.test_counts[i] / max * 100}%;background:${COLOR[l]}55"></div></div>
      <span class="hbar-val" style="width:80px">${d.train_counts[i]} / ${d.test_counts[i]}</span></div>`).join("");
}

function renderFeatureGroups() {
  // Counted from features.txt (see notebook Step 2b)
  const groups = [
    ["Body acceleration (t, f, jerk)", 40 + 40 + 79 + 79], ["Gyroscope (t, f, jerk)", 40 + 40 + 79],
    ["Gravity acceleration (t)", 40], ["Signal magnitudes (t, f)", 13 * 9], ["Angles between vectors", 7],
  ];
  barRows($("featureGroups"), groups.map(([l, v]) => ({ label: l, value: v, color: "#2563eb" })), { labelWidth: 190 });
}

function renderPCA(d) {
  const c = $("pcaCanvas"), ctx = c.getContext("2d"), W = c.width, H = c.height, pad = 46;
  const [x0, x1] = [Math.min(...d.pc1), Math.max(...d.pc1)], [y0, y1] = [Math.min(...d.pc2), Math.max(...d.pc2)];
  const X = x => pad + (x - x0) / (x1 - x0) * (W - 2 * pad - 140), Y = y => H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad);
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.lineTo(W - pad - 140, H - pad); ctx.stroke();
  d.pc1.forEach((v, i) => { ctx.fillStyle = COLOR[d.activity[i]] + "99"; ctx.beginPath(); ctx.arc(X(v), Y(d.pc2[i]), 2.4, 0, 7); ctx.fill(); });
  ctx.font = "12px Inter, sans-serif"; ctx.textAlign = "left";
  ACTS.forEach((a, i) => { ctx.fillStyle = COLOR[a]; ctx.fillRect(W - 150, 30 + i * 22, 11, 11); ctx.fillStyle = "#333"; ctx.fillText(NICE[a], W - 133, 40 + i * 22); });
  ctx.fillStyle = "#666"; ctx.textAlign = "center";
  ctx.fillText(`PC1 (${(d.explained_variance[0] * 100).toFixed(1)}% of variance)`, (W - 140) / 2, H - 12);
  ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`PC2 (${(d.explained_variance[1] * 100).toFixed(1)}%)`, 0, 0); ctx.restore();
  $("pcaNote").textContent = `${d.pc1.length.toLocaleString()} sampled training windows. PC1 + PC2 explain ${((d.explained_variance[0] + d.explained_variance[1]) * 100).toFixed(1)}% of the variance.`;
}

/* ── Evaluation: leakage chart ── */
function renderLeak(rows) {
  $("leakChart").innerHTML = rows.map(r => `
    <div class="leak-row">
      <div class="leak-name">${esc(SHORT_MODEL[r.Model] || r.Model)}</div>
      <div class="leak-bars">
        ${[["Random K-fold", r["Random window K-fold"], "#cbd5e1"], ["Grouped by person", r["Subject-grouped K-fold"], "#2563eb"]].map(([l, v, col]) => `
          <div class="hbar-row"><span class="hbar-label" style="width:130px">${l}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${((v - 0.8) / 0.2) * 100}%;background:${col}"></div></div>
            <span class="hbar-val">${f3(v)}</span></div>`).join("")}
      </div>
      <div class="leak-gap">+${(r.Inflation * 100).toFixed(1)} pts</div>
    </div>`).join("") + `<p class="axis-note">Bars start at 0.80 macro-F1 to make the gap visible.</p>`;
}

/* ── Results table ── */
function renderResults(rows) {
  const sel = rows.find(r => r.Selected);
  $("resultsTableBody").innerHTML = rows.map(r => `
    <tr class="${r.Selected ? "best-row" : ""}">
      <td>${esc(r.Model)}${r.Selected ? ' <span class="tag-selected">selected by CV</span>' : ""}</td>
      <td>${f3(r["CV Macro-F1 (mean)"])} <span class="muted-small">± ${f3(r["CV Macro-F1 (std)"])}</span></td>
      <td><strong>${f3(r["Test Macro-F1"])}</strong></td>
      <td><div class="ci"><div class="ci-bar" style="left:${r["CI low"] * 100}%;width:${(r["CI high"] - r["CI low"]) * 100}%"></div>
          <div class="ci-dot" style="left:${r["Test Macro-F1"] * 100}%"></div></div>
          <span class="muted-small">${f3(r["CI low"])}–${f3(r["CI high"])}</span></td>
      <td>${f3(r["Test Accuracy"])}</td>
      <td>${f3(r["Train Macro-F1"])}</td>
    </tr>`).join("");
  $("heroResult").innerHTML = `Selected model: <strong>${esc(sel.Model)}</strong> · test macro-F1 <strong>${f3(sel["Test Macro-F1"])}</strong>
    on 9 unseen people (95% interval ${f3(sel["CI low"])}–${f3(sel["CI high"])}) · baseline ${f3(rows[0]["Test Macro-F1"])}`;
}

/* ── Confusion matrix explorer ── */
let CM = null, cmModel = null;
function initCM(cm, selectedModel) {
  CM = cm; cmModel = selectedModel;
  const sel = $("modelSelect");
  sel.innerHTML = Object.keys(cm).map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
  sel.value = cmModel;
  sel.addEventListener("change", () => { cmModel = sel.value; renderCM(); });
  renderCM();
}
function renderCM() {
  const { labels, matrix } = CM[cmModel], grid = $("cmGrid");
  const short = { WALKING: "WALK", WALKING_UPSTAIRS: "UP", WALKING_DOWNSTAIRS: "DOWN", SITTING: "SIT", STANDING: "STAND", LAYING: "LAY" };
  grid.style.gridTemplateColumns = `64px repeat(${labels.length}, var(--cm-cell))`;
  let html = `<div class="cm-corner">true ↓</div>` + labels.map(l => `<div class="cm-head">${short[l]}</div>`).join("");
  matrix.forEach((row, ri) => {
    const tot = row.reduce((a, b) => a + b, 0);
    html += `<div class="cm-rowhead">${short[labels[ri]]}</div>`;
    row.forEach((v, ci) => {
      const share = tot ? v / tot : 0;
      const bg = ri === ci ? `rgba(37,99,235,${0.12 + share * 0.75})` : v ? `rgba(220,38,38,${Math.min(0.9, 0.12 + share * 4)})` : "rgba(0,0,0,0.03)";
      const fg = (ri === ci && share > 0.5) || (ri !== ci && share > 0.15) ? "#fff" : "#1a1917";
      html += `<button class="cm-cell" style="background:${bg};color:${fg}" data-ri="${ri}" data-ci="${ci}"
                aria-label="true ${labels[ri]}, predicted ${labels[ci]}: ${v}">${v}</button>`;
    });
  });
  grid.innerHTML = html;
  grid.querySelectorAll(".cm-cell").forEach(cell => cell.addEventListener("click", () => {
    grid.querySelectorAll(".cm-cell").forEach(c => c.classList.remove("selected"));
    cell.classList.add("selected");
    showCell(+cell.dataset.ri, +cell.dataset.ci);
  }));
}
function showCell(ri, ci) {
  const { labels, matrix, report } = CM[cmModel];
  const t = labels[ri], p = labels[ci], v = matrix[ri][ci], tot = matrix[ri].reduce((a, b) => a + b, 0);
  const across = Object.entries(CM).filter(([n]) => !n.startsWith("Majority")).map(([n, d]) => ({ label: SHORT_MODEL[n], value: d.matrix[ri][ci], color: n === cmModel ? "#2563eb" : "#94a3b8" }));
  const rep = a => `P ${f3(report[a].precision)} · R ${f3(report[a].recall)} · F1 ${f3(report[a]["f1-score"])}`;
  let why;
  if (ri === ci) why = `Recall for ${NICE[t]} is ${(v / tot * 100).toFixed(1)}%.`;
  else if ((t === "SITTING" && p === "STANDING") || (t === "STANDING" && p === "SITTING"))
    why = "Both are still postures, so the main cue is phone orientation relative to gravity, and that overlaps between people (see the Errors section).";
  else if (t.startsWith("WALKING") && p.startsWith("WALKING"))
    why = "Walking on flat ground and on stairs produce similar periodic motion in a 2.56 s window.";
  else if (t === "LAYING") why = "Rare for most models: laying has a very different gravity direction. Compare the models below.";
  else why = "An uncommon mix-up. Compare the models below to see if it is systematic.";
  $("cmDetail").innerHTML = `
    <h4>${ri === ci ? "Correct" : "Mistake"}: true ${NICE[t]} → predicted ${NICE[p]}</h4>
    <div class="cm-stat">${v}</div>
    <p class="muted-small">windows, ${(v / tot * 100).toFixed(1)}% of all true ${NICE[t]} windows (${esc(cmModel)})</p>
    <p style="font-size:0.85rem;margin:0.7rem 0">${why}</p>
    <p class="muted-small"><strong>${NICE[t]}</strong>: ${rep(t)}${ri !== ci ? `<br><strong>${NICE[p]}</strong>: ${rep(p)}` : ""}</p>
    <p class="muted-small" style="margin-top:0.8rem"><strong>Same cell in every model:</strong></p>
    <div id="cellAcross" class="bar-chart"></div>`;
  barRows($("cellAcross"), across, { labelWidth: 100, max: Math.max(1, ...across.map(a => a.value)) });
}

/* ── Feature importance ── */
let FI = null;
function initFI(fi) {
  FI = fi;
  document.querySelectorAll("[data-fi]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-fi]").forEach(x => x.classList.toggle("active", x === b));
    renderFI(...b.dataset.fi.split("|"));
  }));
  renderFI("Random Forest", "top");
}
function renderFI(model, view) {
  const el = $("fiChart"), note = $("fiNote");
  if (view === "groups") {
    const names = Object.keys(FI["Random Forest"].groups);
    el.innerHTML = names.map(g => {
      const rf = FI["Random Forest"].groups[g], lr = FI["Logistic Regression"].groups[g] ?? 0;
      return `<div class="hbar-row"><span class="hbar-label" style="width:190px">${esc(g)}</span>
        <div class="hbar-track double"><div class="hbar-fill" style="width:${rf / 0.4 * 100}%;background:#2563eb"></div>
        <div class="hbar-fill" style="width:${lr / 0.4 * 100}%;background:#d97706"></div></div>
        <span class="hbar-val">${(rf * 100).toFixed(0)}% / ${(lr * 100).toFixed(0)}%</span></div>`;
    }).join("") + `<p class="axis-note"><span style="color:#2563eb">■</span> random forest &nbsp; <span style="color:#d97706">■</span> logistic regression (share of total |weight|)</p>`;
    note.textContent = "Both models lean heavily on gravity (phone orientation) and frequency-domain features. Logistic regression spreads more weight onto gyroscope features.";
    return;
  }
  const { features, importance } = FI[model];
  barRows(el, features.map((f, i) => ({ label: f, value: importance[i], color: f.startsWith("tGravity") || f.startsWith("angle") ? "#16a34a" : f.startsWith("f") ? "#7c3aed" : "#2563eb" })),
    { labelWidth: 230, fmt: v => v.toFixed(3) });
  note.innerHTML = `<span style="color:#16a34a">■</span> gravity / angle &nbsp; <span style="color:#7c3aed">■</span> frequency domain &nbsp; <span style="color:#2563eb">■</span> other time domain. ` +
    (model === "Random Forest" ? "All of the random forest's top 10 are gravity or angle features (mean decrease in impurity)." :
      "Mean absolute weight across the 6 classes, on standardised features.");
}

/* ── Errors ── */
function renderErrorPairs(e) {
  barRows($("errorPairs"), e.top_pairs.map(p => ({ label: `${NICE[p.true]} → ${NICE[p.pred]}`, value: p.n, color: COLOR[p.true],
    text: `${p.n} (${Math.round(p.n / e.n_errors * 100)}%)` })), { labelWidth: 170 });
}
function renderSubjects(ps) {
  const errs = Object.fromEntries(ps.errors.map(r => [r.subject, r]));
  const totalSS = ps.errors.reduce((a, r) => a + r.sit_stand, 0);
  $("subjChart").innerHTML = ps.rows.map(r => {
    const h = Math.max(4, (r["Macro-F1"] - 0.75) / 0.25 * 100);
    return `<button class="subj-bar" data-s="${r.Subject}" title="Subject ${r.Subject}: ${f3(r["Macro-F1"])}">
      <span class="subj-val">${r["Macro-F1"].toFixed(2)}</span>
      <span class="subj-fill" style="height:${h}%;background:${r["Macro-F1"] < 0.9 ? "#dc2626" : "#2563eb"}"></span>
      <span class="subj-id">${r.Subject}</span></button>`;
  }).join("") + `<p class="axis-note" style="grid-column:1/-1">Test person ID · bars start at 0.75</p>`;
  $("subjChart").querySelectorAll(".subj-bar").forEach(b => b.addEventListener("click", () => {
    $("subjChart").querySelectorAll(".subj-bar").forEach(x => x.classList.toggle("selected", x === b));
    const r = ps.rows.find(x => x.Subject === +b.dataset.s), e = errs[r.Subject];
    $("subjDetail").innerHTML = `<strong>Subject ${r.Subject}</strong>: ${r.Windows} windows, macro-F1 ${f3(r["Macro-F1"])}, accuracy ${f3(r.Accuracy)}.
      ${e.error} errors, of which ${e.sit_stand} are sitting ↔ standing (${totalSS ? Math.round(e.sit_stand / totalSS * 100) : 0}% of all such confusions).`;
  }));
}
let HIST = null, histOn = null;
function initHist(e) {
  HIST = e;
  const cols = { "SITTING, correct": "#dc2626", "SITTING -> predicted STANDING": "#f9a8d4", "STANDING, correct": "#d97706", "STANDING -> predicted SITTING": "#fcd34d" };
  HIST.colors = cols;
  histOn = new Set(["SITTING, correct", "SITTING -> predicted STANDING", "STANDING, correct"]);
  $("histToggles").innerHTML = Object.keys(cols).map(k => `<button class="btn-toggle ${histOn.has(k) ? "active" : ""}" data-h="${esc(k)}">
    <span style="color:${cols[k]}">■</span> ${esc(k.replace("->", "→"))} (n=${e.hist[k].reduce((a, b) => a + b, 0)})</button>`).join("");
  $("histToggles").querySelectorAll("[data-h]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.h; histOn.has(k) ? histOn.delete(k) : histOn.add(k); b.classList.toggle("active"); drawHist();
  }));
  drawHist();
}
function drawHist() {
  const c = $("histCanvas"), ctx = c.getContext("2d"), W = c.width, H = c.height, pad = 40;
  const edges = HIST.bin_edges, nb = edges.length - 1;
  // focus on the populated range
  const used = Object.values(HIST.hist).reduce((acc, h) => h.map((v, i) => acc[i] + v), new Array(nb).fill(0));
  let lo = used.findIndex(v => v > 0), hi = nb - 1 - [...used].reverse().findIndex(v => v > 0);
  lo = Math.max(0, lo - 1); hi = Math.min(nb - 1, hi + 1);
  const dens = {}; let ymax = 0;
  for (const k of histOn) { const h = HIST.hist[k], n = h.reduce((a, b) => a + b, 0) || 1; dens[k] = h.map(v => v / n); ymax = Math.max(ymax, ...dens[k]); }
  ctx.clearRect(0, 0, W, H);
  const X = i => pad + (i - lo) / (hi - lo + 1) * (W - 2 * pad), bw = (W - 2 * pad) / (hi - lo + 1);
  for (const k of histOn) {
    ctx.fillStyle = HIST.colors[k] + "aa";
    for (let i = lo; i <= hi; i++) { const h = dens[k][i] / (ymax || 1) * (H - 2 * pad); ctx.fillRect(X(i) + 1, H - pad - h, bw - 2, h); }
  }
  ctx.strokeStyle = "#999"; ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - pad, H - pad); ctx.stroke();
  ctx.fillStyle = "#666"; ctx.font = "11px Inter, sans-serif"; ctx.textAlign = "center";
  for (let i = lo; i <= hi + 1; i += 3) ctx.fillText(edges[i].toFixed(2), X(i), H - pad + 15);
  ctx.fillText(`${HIST.key_feature} (share of each group's windows per bin)`, W / 2, H - 6);
  // medians
  ctx.setLineDash([4, 3]);
  for (const k of histOn) {
    const m = HIST.medians[k], pos = pad + (m - edges[lo]) / (edges[hi + 1] - edges[lo]) * (W - 2 * pad);
    ctx.strokeStyle = HIST.colors[k]; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pos, pad - 10); ctx.lineTo(pos, H - pad); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineWidth = 1;
  ctx.textAlign = "left"; ctx.fillStyle = "#666"; ctx.fillText("dashed lines = group medians", pad, pad - 16);
}

/* ── Demo: real logistic regression ── */
let DM = null;
const DEMO_LABELS = {
  "tBodyAcc-std()-X": "Body acc X · std (shake)", "tBodyAccMag-mean()": "Body acc magnitude · mean",
  "tGravityAcc-mean()-X": "Gravity X · mean (upright?)", "tGravityAcc-mean()-Y": "Gravity Y · mean (tilt)",
  "tGravityAcc-mean()-Z": "Gravity Z · mean (tilt)", "tBodyAccJerk-std()-Z": "Jerk Z · std",
  "tBodyGyro-std()-Y": "Gyro Y · std (rotation)", "fBodyAccMag-meanFreq()": "Acc magnitude · mean frequency",
};
const sid = f => "sl_" + f.replace(/[^a-z0-9]/gi, "_");
function initDemo(dm) {
  DM = dm;
  $("demoF1").textContent = f3(dm.test_f1);
  $("slidersGrid").innerHTML = dm.features.map((f, i) => `
    <div class="slider-item">
      <label for="${sid(f)}">${esc(DEMO_LABELS[f] || f)} <span class="slider-val" id="v_${sid(f)}"></span></label>
      <input type="range" id="${sid(f)}" min="${dm.ranges[i][0]}" max="${dm.ranges[i][1]}" step="0.01" value="${dm.presets.STANDING[i]}">
      <div class="slider-code">${esc(f)}</div>
    </div>`).join("");
  dm.features.forEach(f => $(sid(f)).addEventListener("input", () => { $("windowInfo").hidden = true; $("windowSelect").value = ""; predict(); }));
  $("presetButtons").innerHTML = ACTS.map(a => `<button class="btn-preset" data-p="${a}">${NICE[a]}</button>`).join(" ");
  $("presetButtons").querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => { setVals(dm.presets[b.dataset.p]); $("windowInfo").hidden = true; $("windowSelect").value = ""; }));
  const opt = (w, i, withTrue) => `<option value="${i}">${w.full_model_pred !== w.true ? "✗ " : ""}${withTrue ? `${NICE[w.true]} → predicted ${NICE[w.full_model_pred]} · ` : ""}Subject ${w.subject} · row ${w.row}</option>`;
  const all = dm.windows.map((w, i) => [w, i]);
  const errs = all.filter(([w]) => w.error_example);
  $("windowSelect").innerHTML = `<option value="">— choose —</option>` +
    (errs.length ? `<optgroup label="Mistakes by the full model (representative errors)">${errs.map(([w, i]) => opt(w, i, true)).join("")}</optgroup>` : "") +
    ACTS.map(a => `<optgroup label="Random ${NICE[a]} windows">` +
      all.filter(([w]) => w.true === a && !w.error_example).map(([w, i]) => opt(w, i, false)).join("") + "</optgroup>").join("");
  $("windowSelect").addEventListener("change", e => e.target.value !== "" && loadWindow(+e.target.value));
  $("randomWindow").addEventListener("click", () => { const i = Math.floor(Math.random() * dm.windows.length); $("windowSelect").value = i; loadWindow(i); });
  setVals(dm.presets.STANDING);
}
function setVals(vals) { DM.features.forEach((f, i) => { $(sid(f)).value = vals[i]; }); predict(); }
function loadWindow(i) {
  const w = DM.windows[i]; setVals(w.values);
  const demoPred = predict();
  const ok = (a, b) => a === b ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>';
  $("windowInfo").hidden = false;
  $("windowInfo").innerHTML = `Real window from test subject ${w.subject} (row ${w.row}). True activity: <strong>${NICE[w.true]}</strong>.
    8-feature demo model says <strong>${NICE[demoPred]}</strong> ${ok(demoPred, w.true)} · full 561-feature model says <strong>${NICE[w.full_model_pred]}</strong> ${ok(w.full_model_pred, w.true)}.
    Now move a slider to see what would change the answer.`;
}
function predict() {
  const x = DM.features.map((f, i) => { const v = +$(sid(f)).value; $("v_" + sid(f)).textContent = v.toFixed(2); return (v - DM.mean[i]) / DM.scale[i]; });
  const logits = DM.coef.map((w, k) => w.reduce((s, wj, j) => s + wj * x[j], DM.intercept[k]));
  const mx = Math.max(...logits), ex = logits.map(l => Math.exp(l - mx)), sum = ex.reduce((a, b) => a + b, 0);
  const probs = DM.classes.map((c, k) => [c, ex[k] / sum]).sort((a, b) => b[1] - a[1]);
  $("predValue").textContent = NICE[probs[0][0]];
  $("predValue").style.color = COLOR[probs[0][0]];
  $("confBars").innerHTML = probs.map(([c, p]) => `
    <div class="conf-bar-row"><div class="conf-bar-label">${NICE[c]}</div>
      <div class="conf-bar-track"><div class="conf-bar-fill" style="width:${p * 100}%;background:${COLOR[c]}"></div></div>
      <div class="conf-bar-pct">${(p * 100).toFixed(0)}%</div></div>`).join("");
  return probs[0][0];
}

/* ── Init ── */
document.addEventListener("DOMContentLoaded", async () => {
  initChrome();
  renderFeatureGroups();
  try {
    const [cls, pca, cmp, cm, fi, ps, leak, err, dm] = await Promise.all([
      "class_distribution.json", "pca_clusters.json", "model_comparison.json", "confusion_matrices.json",
      "feature_importance.json", "per_subject.json", "cv_leakage.json", "error_analysis.json", "demo_model.json"].map(loadJSON));
    renderClassDist(cls); renderPCA(pca); renderLeak(leak); renderResults(cmp);
    initCM(cm, cmp.find(r => r.Selected).Model); initFI(fi);
    renderErrorPairs(err); renderSubjects(ps); initHist(err); initDemo(dm);
  } catch (e) {
    console.error(e);
    $("loadError").hidden = false;
    $("heroResult").textContent = "Results not loaded (see the note at the top of the page).";
  }
});
