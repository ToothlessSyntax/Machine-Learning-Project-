# What changed (14 Nov 2026) and why

This revision fixes problems that would have cost marks under the rubric, mainly in *Evaluation design* (20 pts) and *Results, errors and limitations* (10 pts), and replaces the website demo with a real model.

## Notebook (`analysis.ipynb`)

| Before | Now | Why it matters |
|---|---|---|
| `StratifiedKFold(shuffle=True)` on windows | `GroupKFold(5)` grouped by subject | Random folds put the same person, and overlapping windows, in train and validation. Measured inflation: +5.0 (LR), +5.2 (SVM), +7.9 (k-NN) macro-F1 points. That is why the old CV scores (~0.98) were far above test. |
| Hyperparameters hard-coded (C=0.1, C=10, k=5) but described as "tuned" | `GridSearchCV` with grouped CV for every model | Rubric: tuning separate from final testing. |
| Scaler fit once on all training data, then CV | Scaler inside a `Pipeline` | Re-fit inside every CV fold, so no validation leakage. |
| Best model chosen by **test** F1 | Chosen by **CV** F1, before testing | Rubric: keep test data out of model selection. CV now picks logistic regression (0.934 vs SVM 0.932). |
| `classification_report` without `labels=` | `labels=ACTIVITY_LABELS` | The old per-class table had the class names on the wrong rows (sklearn sorts names alphabetically). |
| No uncertainty | Bootstrap over test **people** (2,000 resamples) plus a paired LR vs SVM comparison | SVM's higher test score (0.956 vs 0.950) is not reliable: difference CI [−0.021, +0.003]. |
| No error inspection | Error pairs, errors per person, and a feature-level look at SITTING↔STANDING errors | Rubric: "inspect representative errors". |
| Hard-coded "key finding" text (some of it wrong) | Text computed from the results | E.g. RF's top features are gravity/angle, not tBodyAcc. |
| Feature importance per feature only | Also summed by signal group | 2,281 feature pairs have \|r\| > 0.95, so single-feature ranks are unreliable. |
| Wrote to `website/` (folder was `website2/`) | Writes to `docs/data/` | GitHub Pages can serve from `/docs`. |

## Website (`docs/`)

- **"Try the classifier" was hand-written if/else rules plus `Math.random()` noise**, labelled as the random forest. Replaced with a real 8-feature logistic regression whose weights come from the notebook (test macro-F1 0.842; the notebook checks the JS arithmetic matches sklearn on 100% of windows). Visitors can also load 90 real test windows and compare the demo model with the full model.
- Removed the hard-coded "fallback" numbers in `main.js`, which differed from the real results and appeared silently whenever the JSON failed to load. The page now shows a warning instead.
- Rewrote every claim to match the results. Claims that were wrong before: baseline "17% macro-F1" (it is 0.05), walking classes "F1 > 0.97" (0.95–0.97), "CV and test within ±2%" (they were 3.5–5.5 points apart), "RF trained at ~99%" (never computed), "tBodyAcc most important" (gravity/angle features are).
- New sections: **Evaluation design** (with the leakage comparison), per-person results, an error histogram, and confidence intervals in the results table.
- The confusion-matrix explorer now shows per-class precision/recall/F1 and the same cell across all models.
- Written as "we". Reproduction steps fixed (`python analysis.ipynb` does not run a notebook).
- The visual design and CSS are the original's, with additions at the end of `style.css`.

## Second pass (14 Nov, after checking against the rubric again)

- Notebook now has cell IDs (format 4.5 requires them; without them Jupyter and GitHub show "invalid notebook").
- Methods: objective and assumptions for every model, on the site and in the notebook (rubric: "explain the objective or core idea, assumptions").
- Results: says plainly that LR and SVM tie in CV, and what the bootstrap interval can and cannot establish (rubric: "explain what [a test] can and cannot establish").
- Demo: the window picker includes 11 real windows the full model got wrong (up to 2 per mix-up, from different people, for the 6 most common mix-ups), so the "representative errors" are on the site, not only in the notebook.
- Navigation: "Errors & limits" and a separate "Reproduction" section, matching the rubric's list of required sections.
- Data section: licence (CC BY 4.0) and the authors' signal preprocessing.
- AI disclosure made specific about who used which tool for what (rubric: "disclose the tools and kinds of assistance used").
- "Team & contributions" card filled in with a draft. **Check it is accurate.**
- The site works when `docs/index.html` is opened straight from disk (data bundled in `docs/data/data.js`).

## Still to do before submitting (17 Nov, 11:59 PM IST)

1. **Team listing.** The proposal says "Individual". Make sure both names are on the course registration.
2. **Roll number:** replace `[roll no.]` in `docs/index.html` and in the notebook's first cell. Read the contributions and AI-disclosure text and correct anything that is not accurate.
3. Check the GitHub URL (`ToothlessSyntax/har-es335`) in the README and on the site, push, enable Pages (Settings → Pages → `main` / `/docs`), and **open the live link** to confirm it works.
4. Delete the old `website2/` folder from the repo so there is only one site.
5. Submit both links (live site and repo) on the submission page.

## Viva prep: things you should each be able to explain

- Why GroupKFold and not a random K-fold (the windows overlap and belong to people; we measured +5–8 points of inflation).
- Why logistic regression is the final model even though the SVM scored higher on test (selected by CV; the test difference is within bootstrap noise; simpler and interpretable).
- What macro-F1 is and why it suits this problem.
- What the bootstrap over people does and why it resamples people rather than windows.
- The main error (sitting→standing; phone-orientation features overlap; concentrated in subjects 10 and 9).
- A limitation (lab data, one phone, 9 test people, authors' pre-scaling).
- A "small change": e.g. what if we used a random split (scores go up, misleadingly); what if we dropped the gravity features (expect sitting/standing/laying to get much worse); what if we smoothed predictions over consecutive windows.
