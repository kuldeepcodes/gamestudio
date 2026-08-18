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
│  llm.mjs     → GitHub Models writes a compact game.js for that brief            │
│  build-game  → inlines engine + game + UI shell → one self-contained index.html │
│  smoke.mjs   → headless (jsdom) test: loads, starts, takes input, 100+ frames   │
│  repair loop → if it errors, ask the model to fix it (up to 3×); clean-only     │
│  manifest    → register in games.json + write meta.json                         │
│  → opens a Pull Request  ──►  you review & merge  ──►  GitHub Pages redeploys    │
└────────────────────────────────────────────────────────────────────────────────┘
```

Why an engine + a small `game.js` (instead of raw HTML per game)? It keeps every game
**premium and consistent**, keeps the AI's output small and reliable, and still gives you a
true **single self-contained HTML page** in **its own folder** per game.

## Repository layout

```
index.html              Premium gallery homepage (reads games.json)
assets/                 gallery.css, gallery.js  (homepage only)
games.json              Manifest of every game
games/<date-slug>/      ONE FOLDER PER GAME — index.html (self-contained) + game.js + meta.json
engine/                 Shared engine: engine.js, shell.html, shell.css, api.md (the contract)
scripts/                generate-game.mjs (orchestrator), build-game.mjs, lib/ (ideas, llm, smoke, manifest)
.github/workflows/      hourly-game.yml (the scheduler)
AGENTS.md               Full generation contract (read this to contribute/tune)
```

## Run it yourself

**Trigger a game now:** Actions → *Hourly game drop* → **Run workflow** (optionally pass a
`model` or `seed`). It opens a PR you can review.

**Local pipeline test (no model call):**
```bash
cd scripts && npm install
cd .. && GS_FAKE=1 node scripts/generate-game.mjs      # rebuilds the seed game through the full pipeline
```

**Build / test a single game:**
```bash
node scripts/build-game.mjs games/<slug>             # assemble index.html
node scripts/lib/smoke.mjs games/<slug>/index.html   # headless smoke test (exit 0 = OK)
```

## Tuning & pausing

- **Cadence / pause:** edit the `cron` in `.github/workflows/hourly-game.yml`, or disable the
  workflow from the Actions tab. Hourly can mean up to ~24 PRs/day — dial back anytime.
- **Model:** workflow input `model`, or set repo secrets `GS_LLM_KEY` (+ `GS_LLM_ENDPOINT`,
  `GS_MODEL`) to use any OpenAI-compatible provider instead of GitHub Models.
- **Creativity / quality:** tune the idea pools in `scripts/lib/ideas.mjs`, the prompt in
  `scripts/lib/llm.mjs`, and the engine contract in `engine/api.md`.

## Requirements for the automation to run

- **Pages:** enabled, deploy from `main` (root). Site: `https://kuldeepcodes.github.io/gamestudio/`.
- **Actions → General → Workflow permissions:** *Read and write* **and** *Allow GitHub Actions
  to create and approve pull requests* (so the hourly job can open PRs with the built-in token).
- **GitHub Models:** granted to the workflow via `permissions: models: read` (already in the YAML).

---

Built with vanilla JS, a lot of "juice", and a fresh idea every hour.
