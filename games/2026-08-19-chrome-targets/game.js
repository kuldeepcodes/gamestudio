window.GAME = {
  meta: {
    "title": "Chrome Targets",
    "tagline": "Simple. Ruthless.",
    "description": "Chrome Targets — a molten lava color-target tap test game. Tap the glowing rings before they fade. Never tap a crossed one, and don't let too many good ones slip away.",
    "instructions": "Tap the glowing rings before they fade. Never tap a crossed one, and don't let too many good ones slip away. Tap / Click the good rings.",
    "controls": "Tap / Click the good rings",
    "accent": "#8ab4ff",
    "accent2": "#b388ff",
    "bg": "#05070f",
    "width": 480,
    "height": 720,
    "genre": "reflex",
    "mechanic": "color-target tap test",
    "theme": "molten lava",
    "mods": [
      "chains"
    ],
    "tags": [
      "reflex",
      "reflex",
      "arcade",
      "playful"
    ],
    "emoji": "🎯"
  },
  create: function (engine) {
    var P = {"tr":33,"life":1.484,"spawn":0.725,"badChance":0.273,"maxMiss":4,"accent":"#8ab4ff","accent2":"#b388ff","hazard":"#ff5d73","mods":["chains"],"m_chains":1};
    var build = function buildReflex(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var targets, spawnT, t, misses, combo;
  function reset() { targets = []; spawnT = 0.3; t = 0; misses = 0; combo = 0; }
  function spawn() { var r = P.tr; targets.push({ x: engine.rand(r + 12, W - r - 12), y: engine.rand(r + 12, H - r - 12), r: r, bad: engine.chance(P.badChance), life: P.life, age: 0, pop: 0, vx: engine.rand(-40, 40), vy: engine.rand(-40, 40) }); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(0.32, P.spawn - t * 0.02); }
      var tapped = input.pointer.justDown, tx = input.pointer.x, ty = input.pointer.y;
      for (var i = targets.length - 1; i >= 0; i--) {
        var g = targets[i]; g.age += dt; if (g.pop < 1) g.pop = Math.min(1, g.pop + dt * 6);
        // driftTargets: rings wander instead of sitting still, so you must lead them
        if (P.m_driftTargets) {
          g.x += g.vx * dt; g.y += g.vy * dt;
          if (g.x < g.r || g.x > W - g.r) g.vx = -g.vx;
          if (g.y < g.r || g.y > H - g.r) g.vy = -g.vy;
          g.x = engine.clamp(g.x, g.r, W - g.r); g.y = engine.clamp(g.y, g.r, H - g.r);
        }
        // shrinkTargets: the ring closes as it ages, so late taps need real precision
        var hit = P.m_shrinkTargets ? g.r * (1 - 0.55 * (g.age / g.life)) : g.r;
        if (tapped && engine.dist(tx, ty, g.x, g.y) < hit) {
          tapped = false;
          if (g.bad) { S.hit(); engine.shake(16); engine.particles.burst(g.x, g.y, { count: 26, color: P.hazard, speed: 180, life: 0.5, gravity: 80 }); engine.gameOver(); return; }
          // chains: consecutive hits without a miss escalate the payout
          combo = P.m_chains ? combo + 1 : 1;
          engine.addScore(P.m_chains ? Math.min(15, 3 + combo) : 3);
          S.coin(); engine.particles.burst(g.x, g.y, { count: 14, color: P.accent, speed: 150, life: 0.5, gravity: 40 }); targets.splice(i, 1); continue;
        }
        if (g.age >= g.life) { targets.splice(i, 1); if (!g.bad) { misses++; combo = 0; S.blip(); if (misses >= P.maxMiss) { engine.shake(14); engine.gameOver(); return; } } }
      }
    },
    render: function (ctx) {
      for (var i = 0; i < targets.length; i++) {
        var g = targets[i], c = g.bad ? P.hazard : P.accent, k = 1 - g.age / g.life;
        var rr = P.m_shrinkTargets ? g.r * (1 - 0.55 * (g.age / g.life)) : g.r;
        ctx.save(); ctx.translate(g.x, g.y); ctx.scale(g.pop, g.pop); ctx.globalAlpha = 0.35 + 0.6 * k;
        ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 0.16; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, rr, 0, 6.283); ctx.fill();
        if (g.bad) { ctx.globalAlpha = 0.9; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-rr * 0.4, -rr * 0.4); ctx.lineTo(rr * 0.4, rr * 0.4); ctx.moveTo(rr * 0.4, -rr * 0.4); ctx.lineTo(-rr * 0.4, rr * 0.4); ctx.stroke(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (P.m_chains && combo > 1) {
        ctx.fillStyle = P.accent2; ctx.textAlign = "center";
        ctx.font = "bold 16px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText("x" + combo, W / 2, 28);
      }
      for (var m = 0; m < P.maxMiss; m++) { ctx.fillStyle = m < misses ? P.hazard : "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(16 + m * 18, H - 16, 6, 0, 6.283); ctx.fill(); }
    }
  };
};
    return build(engine, P);
  }
};
