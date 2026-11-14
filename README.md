# Human Activity Recognition from Smartphone Sensors (ES 335, 2026)

Can a 2.56-second window of waist-worn phone accelerometer and gyroscope data tell which of six activities a **new, unseen person** is doing? We compare a majority-class baseline, logistic regression, random forest, an RBF-kernel SVM and k-NN on the UCI HAR dataset, using subject-grouped cross-validation for tuning and model selection and a held-out set of 9 people for the final test.

**Website:** https://toothlesssyntax.github.io/Machine-Learning-Project-/

## Main result

| Model | CV macro-F1 (grouped by person) | Test macro-F1 | 95% interval (bootstrap over test people) |
|---|---|---|---|
| Majority class | 0.054 | 0.051 | 0.050–0.053 |
| **Logistic regression (selected)** | **0.934** | **0.950** | 0.915–0.976 |
| Random forest | 0.918 | 0.923 | 0.890–0.954 |
| SVM (RBF) | 0.932 | 0.956 | 0.932–0.974 |
| k-NN | 0.873 | 0.883 | 0.851–0.911 |

Logistic regression was selected by CV before the test set was used. The SVM's slightly higher test score is within noise (paired difference −0.006, 95% interval [−0.021, +0.003]).

## Repository layout

```
analysis.ipynb      full analysis: data checks, grouped CV tuning, test evaluation, error analysis, exports
results/            figures and the model comparison table written by the notebook
docs/               the website (served by GitHub Pages from /docs)
  data/             JSON files written by the notebook; the site reads only these
requirements.txt
```

## Reproduce

```bash
git clone https://github.com/ToothlessSyntax/Machine-Learning-Project-.git
cd Machine-Learning-Project-
pip install -r requirements.txt

# Download the dataset (https://archive.ics.uci.edu/dataset/240) and unzip it here,
# so that "UCI HAR Dataset/" sits next to analysis.ipynb. Both the plain and the
# double-nested "UCI HAR Dataset/UCI HAR Dataset/" layouts work.

jupyter nbconvert --to notebook --execute --inplace analysis.ipynb   # ~6-7 min on 2 cores

open docs/index.html                                                 # or double-click it
```

The notebook writes each result to `docs/data/*.json` and also bundles them into `docs/data/data.js`, which the page loads directly. That is why the site works both from disk and on GitHub Pages.

**Split:** the dataset's own subject-disjoint split (train people 1, 3, 5, 6, 7, 8, 11, 14, 15, 16, 17, 19, 21, 22, 23, 25, 26, 27, 28, 29, 30; test people 2, 4, 9, 10, 12, 13, 18, 20, 24). **CV:** `GroupKFold(5)` by person on the training set only. **Seed:** 42.

## Data and licence

UCI HAR Dataset, Anguita et al. (2013), distributed by the UCI Machine Learning Repository under CC BY 4.0. It is not committed to this repo; download it from the link above.

## AI tools disclosure

- **Gemini / Google Antigravity:** proposal drafting, initial code structure and the first version of the website.
- **Claude (Anthropic):** reviewing the project against the rubric; rewriting the evaluation (subject-grouped CV, grid search, test-set bootstrap), the error analysis and the demo model; rebuilding the website text and interactions; editing.

We checked the outputs against the notebook, re-ran the full analysis, and are responsible for every result.
