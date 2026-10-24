# StudyNest — HCI study app

A between-subjects study of whether **iOS-style vs Android-style presentation of the same deceptive free-trial offer** changes users' trust, their detection of the hidden terms, and what they actually do.

Team: Fatima Irfan (29294), Sumaiya Batool (29295), Zainab Irfan Ansari (29091). Slot 101623, 2:30 pm.
Extends: Li, W., Flatla, D. R., & Arndt, F. (2025). *Divergent deceptions: comparative analysis of Deceptive Patterns in iOS and Android apps.* Behaviour & Information Technology, 44(16), 3879–3908. https://doi.org/10.1080/0144929X.2025.2452359

Participants open one link on their phone. The app collects consent and background answers, randomly assigns iOS or Android styling, shows the fictional StudyNest app with a deceptive paywall, logs every interaction, asks trust and recall questions, and debriefs them. A researcher panel shows results, exports data and runs an equivalence check.

---

## How the two conditions stay identical

Both conditions are rendered by **one component tree** (`src/studynest/`). It gets `mode: "ios" | "md"`, and the only thing `mode` changes is a CSS class on the app root (`.sn-app.ios` / `.sn-app.md`).

| Shared, identical in both modes | Varies by platform |
|---|---|
| All text, prices and dates (`src/studynest/copy.ts`) | Typeface |
| Element order and app logic | Control shapes (radio, check box, buttons) |
| Font size, colour and spacing of the three deceptive elements (`src/styles/app-common.css` only) | Navigation chrome (status bar, header, tab bar) |
| Paywall column layout and 14px gap | Purchase-sheet layout |

The three deceptive elements are **visual interference** (`.disc`, 11px `#8E8E93`, 3.26:1 contrast), **preselection** (`.pw-check`, ticked by default) and **confirmshaming** (`.pw-decline`). They are styled only in `app-common.css`. `app-ios.css` and `app-md.css` must never touch them.

Three checks enforce this. The unit test `paywall.test.tsx` and E2E test 7 assert identical paywall text in both modes. E2E test 5 asserts that the same path produces the same `data-id` and event sequence. The researcher **Equivalence check** tab measures the deceptive elements live.

The StudyNest app area is always light (`#FFFFFF` paywall) regardless of system dark mode, so contrast is held constant. The study shell and researcher panel use a dark theme.

### Deviations from the build spec

* **No Ionic.** Ionic's `mode` is global and fixed at start-up. Its theme would also restyle fonts and sizes that must stay fixed. The spec's own fallback, hand-written `.ios` / `.md` CSS classes on one component tree, is used instead. It also keeps the bundle small (≈ 61 KB gzipped, plus 155 KB Firebase loaded only when configured).
* **Extra event type `scroll`** (`{ pct }`), logged when the paywall's max scroll depth increases. This keeps `paywall_max_scroll_pct` a pure function of the event list, like every other metric.
* The sheet's dimmed area has `data-id="sheet-scrim"` so taps on it are attributed.

---

## Setup

Requires Node 20+ (tested on Node 24) and, for the analysis, Python 3.11+ (tested on 3.14).

```bash
npm install
npx playwright install chromium     # for end-to-end tests
cp .env.example .env                # optional: Firebase keys (see below)
npm run dev                         # http://localhost:5173
```

Without Firebase keys the app runs fully on `localStorage`. That is fine for piloting on one device. For real data collection across phones, configure Firebase.

### Firebase (recommended for the real study)

1. Create a Firebase project. Add a **Web app** and copy its config into `.env` as `VITE_FIREBASE_*`.
2. **Authentication → Sign-in method**: enable **Anonymous** (participants) and **Email/Password** (researchers). Create one email/password user per researcher.
3. **Firestore**: create a database. In `firestore.rules`, replace the placeholder emails in `isResearcher()` with the researchers' sign-in emails.
4. Deploy the rules: `npx firebase-tools deploy --only firestore:rules`.

Data layout: `sessions/{id}` (events inline, or in `sessions/{id}/events/chunkN` when there are more than 800), `config/blocks` (assignment queues, updated in a transaction), `config/settings`. Every session is also mirrored to `localStorage["sn_sessions_v1"]`, and the researcher panel shows the union of both.

---

## Tests

```bash
npm test             # Vitest unit tests: assignment, metrics, contrast, export, copy, paywall parity
npm run e2e          # Playwright, 390×844 touch viewport (starts the dev server itself)
npm run build        # type-check + production build
```

---

## Deploying

The app must be served over HTTPS for phones. Both options serve `dist/`.

**Firebase Hosting**
```bash
npm run build
npx firebase-tools login
npx firebase-tools use --add          # pick your project
npx firebase-tools deploy --only hosting,firestore:rules
```

**Netlify**: connect the repo. `netlify.toml` already sets `npm run build` → `dist`. Add the `VITE_FIREBASE_*` variables under *Site settings → Environment variables*.

---

## Running a session

1. Before the study, open **`/?researcher=1`** (or the small *Research team* link on the welcome page). Then:
   * **Setup**: check that assignment is *Automatic* and demo mode is *Off*.
   * **Equivalence check**: every "within 10%" row must be green.
2. Send participants the plain link (no query string). Assignment is stratified block randomisation (block size 2) within each own-phone group.
3. Participants cannot use the browser back button to move between steps. Reloading mid-session starts a new session and marks the old one `abandoned`.
4. For walkthroughs, use **Setup → Run iOS version / Run Android version**, or `/?v=ios` / `/?v=md`. These sessions are marked demo and excluded.

Debug route (used by the analysis): `/?v=ios&shot=paywall` renders the paywall alone, with no session and no logging.

## Exporting

**Researcher panel → Sessions → Download summary CSV / Download full JSON.** If the download is blocked, the panel copies to the clipboard, and failing that shows a selectable text box. Prefer the **full JSON**: it has every event, so metrics can be re-computed and tap heatmaps drawn.

---

## Analysis (`/analysis`)

```bash
cd analysis
python -m venv .venv
.venv/Scripts/activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python -m playwright install chromium

python make_fake_data.py          # 40 synthetic sessions so everything runs before real data exists
python load_data.py data/fake_sessions.json
jupyter notebook analysis.ipynb   # or: pip install jupyter
```

| File | Purpose |
|---|---|
| `screenshots.py` | Screenshots both paywalls via `?v=…&shot=paywall` at 390×844 @2x and saves the `#pw-disc` box. Start the app first: `npm run build && npm run preview` (port 4173). |
| `saliency.py` | Spectral-residual saliency share of the disclosure box and sampled WCAG contrast. **Exits 1** if the iOS and Android shares differ by more than 10%. Writes heatmaps to `out/`. |
| `load_data.py` | Loads a JSON or CSV export, or Firestore (`--firestore`, needs `GOOGLE_APPLICATION_CREDENTIALS`). Applies exclusions (demo, not complete, `task_total_ms` < 15 s, `pilot_ids.txt`) and re-computes metrics from events with a Python mirror of `metrics.ts`. |
| `analysis.ipynb` | H1–H5 (Mann–Whitney U + rank-biserial r with bootstrap CI, Fisher's exact + Wilson CIs + odds ratio, logistic regression), run on manipulation-check passes and then on all complete sessions, plus descriptives and tap heatmaps. |
| `detection_coding.csv` | `id, coder1, coder2, final` (`detected` / `partly` / `not`). Two team members code the recall answers independently. The notebook reports percent agreement. |
| `pilot_ids.txt` | Pilot participant IDs to exclude. |

**Before real analysis:** delete the synthetic `data/fake_*`, `detection_coding.csv` and `pilot_ids.txt`. Then point `DATA` in the notebook at your export, and fill in `detection_coding.csv` from the real recall answers.

---

## Ethics and scope

No real payments, accounts, Apple or Google names or logos. No names, emails, phone numbers or locations are collected from participants. Deceptive design is not mentioned anywhere before the debrief, and participants do not see their condition until then. The debrief shows each participant's ID so they can ask for their data to be removed.
