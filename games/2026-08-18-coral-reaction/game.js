window.GAME = {
  meta: {
    "title": "Coral Reaction",
    "tagline": "How long can you last?",
    "description": "Coral Reaction — a coral reef color-target tap test game. Tap the glowing rings before they fade. Never tap a crossed one, and don't let too many good ones slip away.",
    "instructions": "Tap the glowing rings before they fade. Never tap a crossed one, and don't let too many good ones slip away. Tap / Click the good rings.",
    "controls": "Tap / Click the good rings",
    "accent": "#e879f9",
    "accent2": "#38bdf8",
    "bg": "#0a0416",
    "width": 480,
    "height": 720,
    "genre": "reflex",
    "mechanic": "color-target tap test",
    "theme": "coral reef",
    "tags": [
      "reflex",
      "reflex",
      "arcade",
      "meditative"
    ],
    "emoji": "🎯"
  },
  create: function (engine) {
    var P = {"tr":34,"life":1.7,"spawn":0.8,"badChance":0.28,"maxMiss":5,"accent":"#e879f9","accent2":"#38bdf8","hazard":"#ff5d73"};
    var build = function buildReflex(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var targets, spawnT, t, misses;
  function reset() { targets = []; spawnT = 0.3; t = 0; misses = 0; }
  function spawn() { var r = P.tr; targets.push({ x: engine.rand(r + 12, W - r - 12), y: engine.rand(r + 12, H - r - 12), r: r, bad: engine.chance(P.badChance), life: P.life, age: 0, pop: 0 }); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(0.32, P.spawn - t * 0.02); }
      var tapped = input.pointer.justDown, tx = input.pointer.x, ty = input.pointer.y;
      for (var i = targets.length - 1; i >= 0; i--) {
        var g = targets[i]; g.age += dt; if (g.pop < 1) g.pop = Math.min(1, g.pop + dt * 6);
        if (tapped && engine.dist(tx, ty, g.x, g.y) < g.r) {
          tapped = false;
          if (g.bad) { S.hit(); engine.shake(16); engine.particles.burst(g.x, g.y, { count: 26, color: P.hazard, speed: 180, life: 0.5, gravity: 80 }); engine.gameOver(); return; }
          engine.addScore(3); S.coin(); engine.particles.burst(g.x, g.y, { count: 14, color: P.accent, speed: 150, life: 0.5, gravity: 40 }); targets.splice(i, 1); continue;
        }
        if (g.age >= g.life) { targets.splice(i, 1); if (!g.bad) { misses++; S.blip(); if (misses >= P.maxMiss) { engine.shake(14); engine.gameOver(); return; } } }
      }
    },
    render: function (ctx) {
      for (var i = 0; i < targets.length; i++) {
        var g = targets[i], c = g.bad ? P.hazard : P.accent, k = 1 - g.age / g.life;
        ctx.save(); ctx.translate(g.x, g.y); ctx.scale(g.pop, g.pop); ctx.globalAlpha = 0.35 + 0.6 * k;
        ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 0.16; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, g.r, 0, 6.283); ctx.fill();
        if (g.bad) { ctx.globalAlpha = 0.9; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-g.r * 0.4, -g.r * 0.4); ctx.lineTo(g.r * 0.4, g.r * 0.4); ctx.moveTo(g.r * 0.4, -g.r * 0.4); ctx.lineTo(-g.r * 0.4, g.r * 0.4); ctx.stroke(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      for (var m = 0; m < P.maxMiss; m++) { ctx.fillStyle = m < misses ? P.hazard : "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(16 + m * 18, H - 16, 6, 0, 6.283); ctx.fill(); }
    }
  };
};
    return build(engine, P);
  }
};
