# 🎮 Game Studio

**A new, self-contained, premium micro-game — invented and built automatically every hour.**

Live site → **https://kuldeepcodes.github.io/gamestudio/**

Every hour a GitHub Actions workflow dreams up a fresh idea (a distinct genre + mechanic +
theme, never a reskin), implements it against a polished shared game engine, **smoke-tests it
headlessly**, and opens a **Pull Request**. You review it and merge to publish — the game then
appears on the gallery homepage.

---

## How it works

```
┌ every hour (GitHub Actions cron) ─────────────────────────────────────────────┐
│  ideas.mjs   → fresh creative brief (avoids past genres/themes, rotating seed)  │
│  procgen.mjs → picks & parameterizes a premium game archetype for that brief    │
│                (or your own model authors it, if you set GS_LLM_KEY)            │
│  build-game  → inlines engine + game + UI shell → one self-contained index.html │
│  smoke.mjs   → headless (jsdom) test: loads, starts, takes input, 100+ frames   │
│  retry/repair→ if it errors, try another variant (or ask the model); clean-only │
│  manifest    → register in games.json + write meta.json                         │
│  → opens a Pull Request  ──►  you review & merge  ──►  GitHub Pages redeploys    │
└────────────────────────────────────────────────────────────────────────────────┘
```

The default generator is **local and free**: a library of hand-crafted, pre-tested premium game
archetypes combined with the idea engine (theme × palette × orientation × tuning) to yield
thousands of distinct, guaranteed-working games — no API key, no network. (GitHub Models, the
original AI backend, was retired 2026-07-30.) Prefer an LLM to author games? Set a repo secret
`GS_LLM_KEY` (see below) and it takes over, with the procedural generator as an automatic fallback.

The pool spans two flavours:

- **Real-world simulations** — a recycling sorting line, an elevator dispatcher, a road junction
  you signal, a café order bar. Small slices of everyday work, with real failure modes
  (missorts, lost patience, collisions, walked customers).
- **Arcade classics** — dodge, flap, lane-run, brick-breaker, stack, reflex.

**How repeats are avoided.** Three mechanisms keep consecutive drops feeling fresh:

1. *Strict least-recently-used archetype rotation* — each archetype is ranked by how long since it
   last shipped and the most overdue one wins, so all 10 cycle before any repeats.
2. *Collision-free naming* — titles are checked against the entire gallery before use, and taglines
   avoid the last six used.
3. *Per-archetype parameter jitter* — speeds, sizes and layouts are re-rolled within safe bounds, so
   even two games of the same archetype play differently.

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

## Run it yourself

**Trigger a game now:** Actions → *Hourly game drop* → **Run workflow** (optionally pass a
`model` or `seed`). It opens a PR you can review.

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
  workflow from the Actions tab. Hourly can mean up to ~24 PRs/day — dial back anytime.
- **More variety:** add archetypes or tweak tuning in `scripts/lib/procgen.mjs`, and widen the
  idea pools in `scripts/lib/ideas.mjs`.
- **Use your own AI model (optional):** set repo secrets `GS_LLM_KEY` (+ optional `GS_LLM_ENDPOINT`,
  `GS_MODEL`) to have an OpenAI-compatible model author games; the procedural generator stays as a
  fallback. (GitHub Models is no longer available — it was retired 2026-07-30.)

## Requirements for the automation to run

- **Pages:** enabled, deploy from `main` (root). Site: `https://kuldeepcodes.github.io/gamestudio/`.
- **Actions → General → Workflow permissions:** *Read and write* **and** *Allow GitHub Actions
  to create and approve pull requests* (so the hourly job can open PRs with the built-in token).
- **No AI key required** — the default generator runs entirely on the Actions runner.
- **No personal access token required.** The workflow authenticates with `${{ github.token }}`, the
  short-lived token GitHub mints for each run. Nothing runs on, or is needed from, your own machine.

> **Note on scheduling:** GitHub runs `schedule` triggers on a best-effort basis and deprioritises
> the top of the hour, so this workflow fires at `:23`. A newly added or changed schedule often
> skips its first tick, and runs can be delayed under load. To force one immediately, use
> **Actions → Hourly game drop → Run workflow**.

---

Built with vanilla JS, a lot of "juice", and a fresh idea every hour.
