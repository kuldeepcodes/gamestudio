window.GAME = {
  meta: {
    "title": "Turbo Skip",
    "tagline": "One more run.",
    "description": "Turbo Skip — a haunted neon tap-to-flap through gaps game. Tap (or Space) to flap and thread every gap. Touch a wall or the floor and you're done.",
    "instructions": "Tap (or Space) to flap and thread every gap. Touch a wall or the floor and you're done. Tap / Space to flap.",
    "controls": "Tap / Space to flap",
    "accent": "#5eead4",
    "accent2": "#fca5a5",
    "bg": "#04140f",
    "width": 480,
    "height": 720,
    "genre": "reflex",
    "mechanic": "tap-to-flap through gaps",
    "theme": "haunted neon",
    "tags": [
      "reflex",
      "flapper",
      "arcade",
      "frantic"
    ],
    "emoji": "🪽"
  },
  create: function (engine) {
    var P = {"r":15,"grav":1516,"flap":-473,"vmax":620,"scroll":209,"ramp":6,"gap":169,"gapX":246,"wallW":72,"accent":"#5eead4","accent2":"#fca5a5","hazard":"#ff5d73"};
    var build = function buildFlapper(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var bx = Math.round(W * 0.3), y, vy, walls, t, started;
  function addWall(x) { var gy = engine.rand(P.gap * 0.6 + 50, H - P.gap * 0.6 - 50); walls.push({ x: x, gy: gy, scored: false }); }
  function reset() { y = H / 2; vy = 0; walls = []; t = 0; started = false; addWall(W + 40); addWall(W + 40 + P.gapX); addWall(W + 40 + P.gapX * 2); }
  function over() { S.hit(); engine.shake(16); engine.particles.burst(bx, y, { count: 30, color: P.hazard, speed: 200, life: 0.6, gravity: 220 }); engine.gameOver(); }
  function flap() { vy = P.flap; S.jump(); engine.particles.burst(bx, y + P.r, { count: 6, color: P.accent2, speed: 70, life: 0.3, gravity: 60 }); started = true; }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      if (input.pointer.justDown || input.justPressed("action") || input.justPressed("up")) flap();
      if (!started) return;
      t += dt; var sp = P.scroll + t * P.ramp;
      vy += P.grav * dt; if (vy > P.vmax) vy = P.vmax; y += vy * dt;
      if (y > H - P.r) { y = H - P.r; return over(); }
      if (y < P.r) { y = P.r; if (vy < 0) vy = 0; }
      for (var i = walls.length - 1; i >= 0; i--) {
        var wl = walls[i]; wl.x -= sp * dt;
        if (!wl.scored && wl.x + P.wallW < bx - P.r) { wl.scored = true; engine.addScore(1); S.coin(); }
        if (bx + P.r > wl.x && bx - P.r < wl.x + P.wallW && (y - P.r < wl.gy - P.gap / 2 || y + P.r > wl.gy + P.gap / 2)) { return over(); }
        if (wl.x + P.wallW < -20) walls.splice(i, 1);
      }
      var last = walls[walls.length - 1]; if (!last || last.x < W - P.gapX) addWall(W + 40);
    },
    render: function (ctx) {
      for (var i = 0; i < walls.length; i++) {
        var wl = walls[i]; ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 12;
        ctx.fillRect(wl.x, 0, P.wallW, wl.gy - P.gap / 2);
        ctx.fillRect(wl.x, wl.gy + P.gap / 2, P.wallW, H - (wl.gy + P.gap / 2));
      }
      ctx.shadowBlur = 0;
      ctx.save(); ctx.translate(bx, y); ctx.rotate(engine.clamp(Math.atan2(vy, 260), -0.6, 0.9));
      ctx.shadowColor = P.accent2; ctx.shadowBlur = 18; var g = ctx.createLinearGradient(-P.r, -P.r, P.r, P.r); g.addColorStop(0, "#ffffff"); g.addColorStop(1, P.accent2);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, P.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#0b1020"; ctx.beginPath(); ctx.arc(P.r * 0.35, -P.r * 0.2, P.r * 0.18, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };
};
    return build(engine, P);
  }
};
