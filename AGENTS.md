# Game Studio — generation contract

This repository ships **one brand-new, self-contained, premium micro-game every hour**,
fully automatically. This file is the contract that both the automated pipeline and any
human (or agent) contributor must follow so that quality and novelty stay high.

## The golden rules

1. **One folder per game.** Every game lives in `games/YYYY-MM-DD-<slug>/` and *all* of its
   code stays inside that folder. Nothing game-specific is scattered elsewhere.
2. **Self-contained single page.** The playable artifact is `games/<slug>/index.html` with
   **inline** CSS + JS and **zero** network/CDN dependencies. It must work offline and open
   directly from disk.
3. **Premium or nothing.** Cohesive dark theme + accent gradient, glass panels, smooth
   motion, particles/juice on key events, screen shake on impact, sound cues, start screen,
   pause, game-over with score + best (localStorage), responsive layout, keyboard **and**
   touch controls. The shared engine already provides all of this — use it.
4. **Genuinely new every time.** Each game must differ from every prior entry in `games.json`
   across **genre AND core mechanic AND theme** — not a reskin. Read the manifest first.
5. **It must actually run.** No console errors; the core loop and game-over must be reachable.
   The pipeline enforces this with an automated headless smoke test before any PR is opened.

## How a game is built (engine-based)

To keep every game premium *and* keep AI output small and reliable, games are **not** written
as raw HTML. Instead:

- There is a fixed, high-quality engine in [`engine/`](engine/) (`engine.js`, `shell.html`,
  `shell.css`). It handles the canvas, game loop, scenes, input, audio, particles, score/best,
  and the whole premium UI shell.
- A game is a single **`game.js`** module that implements a small interface against that engine.
  The full contract is in [`engine/api.md`](engine/api.md) — read it before writing a game.
- `scripts/build-game.mjs` inlines `engine + game + shell` into one self-contained
  `games/<slug>/index.html`.

### `game.js` shape (see `engine/api.md` for the authoritative spec)

```js
window.GAME = {
  meta: {
    title: "…", tagline: "…", description: "…",
    instructions: "…", controls: "…",
    accent: "#…", accent2: "#…", bg: "#…",
    width: 960, height: 600,
    genre: "…", mechanic: "…", theme: "…",
    tags: ["…"], emoji: "🎮"
  },
  create(engine) {
    // engine: { input, audio, particles, shake, rng, width, height, score, best,
    //           addScore(n), gameOver(), emit(...), ... }
    return {
      setup() {},              // build initial state
      reset() {},              // restart (optional; defaults to setup)
      update(dt) {},           // advance by dt seconds; call engine.gameOver() to end
      render(ctx) {},          // draw a frame (2D canvas)
      onResize(w, h) {}        // optional
    };
  }
};
```

**Important:** `meta` is read in a sandbox (no browser APIs), so the top level of `game.js`
must be static data + a `create()` function only. Do all game logic inside `create()`.

## The hourly pipeline (`scripts/generate-game.mjs`)

1. Read `games.json` and build a **fresh creative brief** (`scripts/lib/ideas.mjs`) that avoids
   past genres/themes and mixes in a rotating seed so consecutive hours diverge.
2. Ask **GitHub Models** (`scripts/lib/llm.mjs`) to write a `game.js` for that brief.
3. Build it (`build-game.mjs`) → **smoke-test** it headlessly (`scripts/lib/smoke.mjs`).
4. If it errors, ask the model to **repair** it (up to 3 tries). Only a clean game ships.
5. Register it in `games.json`, write `meta.json`, and the workflow opens a **Pull Request**.

You review the PR (preview locally), then **merge to publish** — GitHub Pages redeploys and the
game appears on the gallery homepage.

## Manifest (`games.json`)

Append the newest game to the front of `games`. Each entry:

```json
{ "id", "slug", "title", "tagline", "description", "genre", "mechanic", "theme",
  "tags": [], "accent", "accent2", "bg", "emoji", "date" }
```

## Tuning / pausing

- Change cadence or disable: edit / disable `.github/workflows/hourly-game.yml` (`cron`).
- Change the model: workflow input `model`, or repo secrets `GS_LLM_KEY` / `GS_LLM_ENDPOINT` /
  `GS_MODEL` to use any OpenAI-compatible provider instead of GitHub Models.
- Raise the bar: tighten `engine/api.md`, `scripts/lib/ideas.mjs` (idea pools), or the prompt
  in `scripts/lib/llm.mjs`.
