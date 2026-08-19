# 🎮 Game Studio

**A new, self-contained, premium micro-game — invented and built automatically, every few hours.**

Live site → **https://kuldeepcodes.github.io/gamestudio/**

On a schedule a GitHub Actions workflow dreams up a fresh idea (a distinct genre + mechanic +
theme, never a reskin), implements it against a polished shared game engine, **smoke-tests it
headlessly**, and — if it passes — **commits it straight to `main`**. GitHub Pages redeploys and
the game appears on the gallery homepage a minute later. No pull request, no manual step.

---

## How it works

```
┌ every 4 hours (GitHub Actions cron) ──────────────────────────────────────────┐
│  ideas.mjs   → fresh creative brief (avoids past genres/themes, rotating seed)  │
│  procgen.mjs → picks & parameterizes a premium game archetype for that brief    │
│                (or your own model authors it, if you set GS_LLM_KEY)            │
│  build-game  → inlines engine + game + UI shell → one self-contained index.html │
│  smoke.mjs   → headless (jsdom) test: loads, starts, takes input, 100+ frames   │
│  retry/repair→ if it errors, try another variant (or ask the model); clean-only │
│  manifest    → register in games.json + write meta.json                         │
│  → commits straight to main  ──►  GitHub Pages redeploys automatically          │
└────────────────────────────────────────────────────────────────────────────────┘
```

**The smoke test is the gate.** Nothing is committed unless the game loads, starts, accepts input
and survives 100+ frames without a single console error — a game that fails is retried with a
different variant, and if nothing passes the run exits without touching `main`.

The default generator is **local and free**: a library of hand-crafted, pre-tested premium game
archetypes combined with the idea engine (theme × palette × orientation × tuning) to yield
thousands of distinct, guaranteed-working games — no API key, no network. (GitHub Models, the
original AI backend, was retired 2026-07-30.) Prefer an LLM to author games? Set a repo secret
`GS_LLM_KEY` (see below) and it takes over, with the procedural generator as an automatic fallback.

The pool spans two flavours:

- **Real-world simulations** — a recycling sorting line, an elevator dispatcher, a road junction
  you signal, a café order bar, a short-order grill, a wildfire you must contain, and a power grid
  you keep balanced against demand. Small slices of everyday work, with real failure modes
  (missorts, lost patience, collisions, walked customers, burnt food, blackouts).
- **Arcade classics** — dodge, flap, lane-run, brick-breaker, stack, reflex.

**How repeats are avoided.** Three mechanisms keep consecutive drops feeling fresh:

1. *Strict least-recently-used archetype rotation* — each archetype is ranked by how long since it
   last shipped and the most overdue one wins, so all 13 cycle before any repeats. At the default
   4-hourly cadence that is **~52 hours between repeats of a mechanic**.
2. *Collision-free naming* — titles are checked against the entire gallery before use, and taglines
   avoid the last six used.
3. *Per-archetype parameter jitter* — speeds, sizes and layouts are re-rolled within safe bounds, so
   even two games of the same archetype play differently.

**Nothing is ever deleted.** Once every archetype is represented the gallery keeps growing, so a
mechanic does eventually appear twice — separated by ~52 hours and differing in tuning, theme,
palette and name. If you would rather cap it, set `GS_MAX_PER_MECHANIC` (e.g. `"1"`) in the
workflow's `env:`; be aware that **deletes** older games of that mechanic, and since drops now land
on `main` without review there is no pull request in which to notice it.

Every game is a true **single self-contained HTML page** in **its own folder** — premium and
consistent because they all share one polished engine.

## Repository layout

```
index.html              Premium gallery homepage (reads games.json)
assets/                 gallery.css, gallery.js  (homepage only)
games.json              Manifest of every game
games/<date-slug>/      ONE FOLDER PER GAME — index.html (self-contained) + game.js + meta.json
engine/                 Shared engine: engine.js, shell.html, shell.css, api.md (the contract)
scripts/                generate-game.mjs (orchestrator), build-game.mjs, lib/ (ideas, procgen, llm, smoke, manifest)
.github/workflows/      hourly-game.yml (the scheduler)
AGENTS.md               Full generation contract (read this to contribute/tune)
```

## Is there a build step? (and why, for static pages)

**Nothing is built at deploy time.** The site is plain static files. Pages is set to *deploy from a
branch*, so GitHub's own `pages-build-deployment` job — a synthetic workflow, not a file in this
repo — just copies `main` to the CDN when you merge. The only workflow here is
`.github/workflows/hourly-game.yml`, which generates a game and commits it; it never touches Pages.

`scripts/build-game.mjs` is **not** a bundler, minifier or transpiler. It is string substitution that
runs once, when a game is created, inlining `engine.js` + `shell.html` + `shell.css` + that game's
`game.js` into a single `index.html`. The committed `index.html` *is* the final artifact.

That inlining is deliberate: every game must be **one self-contained file** that runs offline, from
`file://`, and can be copied anywhere on its own. The cost is that the ~22 KB engine is duplicated
into each page, and an edit under `engine/` does not reach already-published games until they are
rebuilt — so the generation workflow re-runs `scripts/rebuild-all.mjs` on every drop. That rebuild is
byte-stable, so it produces no diff unless `engine/` genuinely changed.

If you would rather have a smaller site and instant engine updates, point each game at
`../../engine/engine.js` and `../../engine/shell.css` instead — you trade the single-file property
for roughly an 80% smaller `games/` tree and shared browser caching.

## Run it yourself

**Trigger a game now:** Actions → *Game drop* → **Run workflow** (optionally pass a
`model` or `seed`). It commits straight to `main`.

**Local pipeline test (no key, the real production path):**
```bash
cd scripts && npm install
cd .. && node scripts/generate-game.mjs      # invents + builds + smoke-tests a brand-new game
```

**Build / test a single game:**
```bash
node scripts/build-game.mjs games/<slug>             # assemble index.html
node scripts/lib/smoke.mjs games/<slug>/index.html   # headless smoke test (exit 0 = OK)
```

## Tuning & pausing

- **Cadence / pause:** edit the `cron` in `.github/workflows/hourly-game.yml`, or disable the
  workflow from the Actions tab. The default is every 4 hours (~6 PRs/day); hourly is ~24.
- **More variety:** add archetypes or tweak tuning in `scripts/lib/procgen.mjs`, and widen the
  idea pools in `scripts/lib/ideas.mjs`.
- **Use your own AI model (optional):** set repo secrets `GS_LLM_KEY` (+ optional `GS_LLM_ENDPOINT`,
  `GS_MODEL`) to have an OpenAI-compatible model author games; the procedural generator stays as a
  fallback. (GitHub Models is no longer available — it was retired 2026-07-30.)

## Requirements for the automation to run

- **Pages:** enabled, deploy from `main` (root). Site: `https://kuldeepcodes.github.io/gamestudio/`.
- **Actions → General → Workflow permissions:** *Read and write* **and** *Allow GitHub Actions
  * (the job commits to `main` with the built-in token; it no longer needs PR permissions).
- **No AI key required** — the default generator runs entirely on the Actions runner.
- **No personal access token required.** The workflow authenticates with `${{ github.token }}`, the
  short-lived token GitHub mints for each run. Nothing runs on, or is needed from, your own machine.

> **Note on scheduling:** GitHub runs `schedule` triggers on a best-effort basis and deprioritises
> the top of the hour, so this workflow fires at `:23`. A newly added or changed schedule often
> skips its first tick, and runs can be delayed under load. To force one immediately, use
> **Actions → Game drop → Run workflow**.

---

Built with vanilla JS, a lot of "juice", and a fresh idea every few hours.
