# Game Studio — Engine API (contract for every game)

Every game is **one file**, `game.js`, that assigns a single global:

```js
window.GAME = {
  meta: { /* see below */ },
  create: function (engine) {
    // ...set up closures/state here...
    return {
      setup: function () {},        // called ONCE after create (build persistent state)
      reset: function () {},        // called on every (re)start — reset to a fresh run
      update: function (dt) {},     // called ~60x/sec while playing. dt = seconds (<=0.05)
      render: function (ctx) {},    // called every frame. Draw in logical W x H coordinates
      onResize: function (w, h) {}  // optional
    };
  }
};
```

The build step wraps this in a premium shell (HUD, menus, background, buttons) and inlines it
into a single self-contained `index.html`. **Do not** write HTML/CSS or create DOM — the shell owns it.

## meta (all fields plain values, no browser APIs at top level)
- `title` (string), `tagline` (short string), `description` (1 sentence), `instructions` (how to play)
- `controls` (e.g. `"Tap / Space to flip"`)
- `accent`, `accent2`, `bg` (hex colors — theme the whole shell)
- `width`, `height` (logical canvas size, e.g. 480 x 720 portrait or 640 x 480 landscape)
- `genre`, `mechanic`, `theme` (strings, for novelty tracking), `tags` (string[]), `emoji` (one emoji)

## engine (passed to create)
Rendering / size:
- `engine.width`, `engine.height` (a.k.a. `W`, `H`) — logical pixels; always draw within these.
- `engine.canvas`, `engine.ctx` — the 2D canvas + context (context also passed to `render`).

Score / lifecycle:
- `engine.score` (number, read), `engine.addScore(n)`, `engine.setScore(n)`
- `engine.gameOver()` — end the run (shows the game-over panel, records best score).

Input (works for keyboard AND touch/mouse — always support both):
- `engine.input.dir()` -> `{x, y}` each in {-1,0,1} from arrows/WASD.
- `engine.input.isDown(name)` / `engine.input.justPressed(name)` — names: `left,right,up,down,action,action2`.
- `engine.input.pointer` -> `{x, y, down, justDown, justUp, dx, dy}` in logical coords.
- `engine.input.consumeSwipe()` -> `"left"|"right"|"up"|"down"|null` (one-shot).

Juice:
- `engine.particles.burst(x, y, {count, color, speed, life, size, gravity, angle, spread})`
- `engine.shake(intensity)`
- `engine.sound` -> `blip() hit() coin() power() jump() over() tick()` and `tone(freq,dur,type,vol,slideTo)`

Helpers (use these instead of `Math.random` so runs are reproducible-friendly):
- `engine.rand(a,b)`, `engine.randInt(a,b)`, `engine.chance(p)`, `engine.pick(array)`, `engine.rng()`
- `engine.clamp(v,a,b)`, `engine.lerp(a,b,t)`, `engine.dist(x1,y1,x2,y2)`

## Hard rules
1. Output **only** the contents of `game.js`. No markdown, no HTML, no comments-as-explanation outside code.
2. No external resources at all: no imports, no `fetch`, no CDNs, no web fonts, no images/audio files.
3. Never throw: guard array access; the game must run for minutes without a console error.
4. Draw everything with canvas primitives; use `meta.accent/accent2/bg` for a cohesive premium look.
5. Support keyboard **and** touch. Provide a clear fail state that calls `engine.gameOver()`.
6. `meta` top level must be static data only (no `engine`, no DOM) so it can be read at build time.
