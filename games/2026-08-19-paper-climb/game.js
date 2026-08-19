window.GAME = {
  meta: {
    "title": "Paper Climb",
    "tagline": "Just one more try.",
    "description": "Paper Climb — a zen garden precision block stacking game. Tap to drop each block on the one below. Overhang gets sliced off — miss completely and the tower falls.",
    "instructions": "Tap to drop each block on the one below. Overhang gets sliced off — miss completely and the tower falls. Tap / Space to drop.",
    "controls": "Tap / Space to drop",
    "accent": "#e879f9",
    "accent2": "#38bdf8",
    "bg": "#0a0416",
    "width": 480,
    "height": 720,
    "genre": "timing",
    "mechanic": "precision block stacking",
    "theme": "zen garden",
    "tags": [
      "timing",
      "stacker",
      "arcade",
      "playful"
    ],
    "emoji": "🏗️"
  },
  create: function (engine) {
    var P = {"startW":174,"bh":30,"speed":199,"rampPx":9,"accent":"#e879f9","accent2":"#38bdf8","hazard":"#ff5d73"};
    var build = function buildStacker(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var stack, cur, dir, t, camY, dead;
  function spawnNext() { var prev = stack[stack.length - 1]; cur = { x: dir < 0 ? W - prev.w : 0, w: prev.w }; }
  function reset() { var bw = P.startW; dir = 1; stack = [{ x: (W - bw) / 2, w: bw }]; spawnNext(); t = 0; camY = 0; dead = false; }
  function drop() {
    var prev = stack[stack.length - 1];
    var left = Math.max(cur.x, prev.x), right = Math.min(cur.x + cur.w, prev.x + prev.w), ov = right - left;
    if (ov <= 0) { S.hit(); engine.shake(18); dead = true; engine.gameOver(); return; }
    stack.push({ x: left, w: ov }); engine.addScore(1); S.coin();
    engine.particles.burst((left + right) / 2, H - stack.length * P.bh + camY, { count: 12, color: P.accent, speed: 120, life: 0.4, gravity: 40 });
    dir = -dir; spawnNext();
  }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      if (dead) return;
      t += dt;
      if (input.pointer.justDown || input.justPressed("action") || input.justPressed("up")) return drop();
      var sp = P.speed + stack.length * P.rampPx;
      cur.x += dir * sp * dt;
      if (cur.x < 0) { cur.x = 0; dir = 1; } if (cur.x + cur.w > W) { cur.x = W - cur.w; dir = -1; }
      var targetCam = Math.max(0, stack.length * P.bh - H * 0.5);
      camY += (targetCam - camY) * Math.min(1, dt * 4);
    },
    render: function (ctx) {
      function yOf(i) { return H - (i + 1) * P.bh + camY; }
      for (var i = 0; i < stack.length; i++) { var b = stack[i]; ctx.fillStyle = i % 2 ? P.accent : P.accent2; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fillRect(b.x, yOf(i), b.w, P.bh - 2); }
      ctx.shadowBlur = 0;
      if (!dead) { ctx.globalAlpha = 0.92; ctx.fillStyle = "#ffffff"; ctx.fillRect(cur.x, yOf(stack.length), cur.w, P.bh - 2); ctx.globalAlpha = 1; }
    }
  };
};
    return build(engine, P);
  }
};
