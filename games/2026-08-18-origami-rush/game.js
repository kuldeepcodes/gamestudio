window.GAME = {
  meta: {
    "title": "Origami Rush",
    "tagline": "Chase the high score.",
    "description": "Origami Rush — a origami paper lane-switch dodge & collect game. Swipe or use arrows to switch lanes. Grab the orbs, dodge the spikes.",
    "instructions": "Swipe or use arrows to switch lanes. Grab the orbs, dodge the spikes. Swipe / Arrows to switch lanes.",
    "controls": "Swipe / Arrows to switch lanes",
    "accent": "#5eead4",
    "accent2": "#fca5a5",
    "bg": "#04140f",
    "width": 480,
    "height": 720,
    "genre": "arcade",
    "mechanic": "lane-switch dodge & collect",
    "theme": "origami paper",
    "tags": [
      "arcade",
      "lane",
      "arcade",
      "meditative"
    ],
    "emoji": "🛣️"
  },
  create: function (engine) {
    var P = {"lanes":3,"pr":22,"slide":16,"itemR":18,"fall":230,"ramp":12,"spawn":0.85,"badChance":0.5,"accent":"#5eead4","accent2":"#fca5a5","hazard":"#ff5d73"};
    var build = function buildLane(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var lanes = P.lanes, lane, px, py = Math.round(H * 0.82), items, spawnT, t;
  function laneX(i) { return W * (i + 0.5) / lanes; }
  function reset() { lane = Math.floor(lanes / 2); px = laneX(lane); items = []; spawnT = 0.4; t = 0; }
  function move(d) { lane = engine.clamp(lane + d, 0, lanes - 1); S.blip(); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      var sw = input.consumeSwipe(); if (sw === "left") move(-1); else if (sw === "right") move(1);
      if (input.justPressed("left")) move(-1); if (input.justPressed("right")) move(1);
      px += (laneX(lane) - px) * Math.min(1, dt * P.slide);
      spawnT -= dt; if (spawnT <= 0) { var li = engine.randInt(0, lanes - 1); items.push({ l: li, y: -30, bad: engine.chance(P.badChance), r: P.itemR, rot: engine.rand(0, 6) }); spawnT = Math.max(0.3, P.spawn - t * 0.012); }
      var sp = P.fall + t * P.ramp;
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i]; it.y += sp * dt; it.rot += dt * 3;
        if (it.y > H + 30) { if (it.bad) engine.addScore(1); items.splice(i, 1); continue; }
        if (Math.abs(laneX(it.l) - px) < it.r + P.pr - 6 && Math.abs(it.y - py) < it.r + P.pr - 6) {
          if (it.bad) { S.hit(); engine.shake(16); engine.particles.burst(px, py, { count: 30, color: P.hazard, speed: 200, life: 0.6, gravity: 120 }); engine.gameOver(); return; }
          engine.addScore(5); S.coin(); engine.particles.burst(laneX(it.l), it.y, { count: 14, color: P.accent, speed: 150, life: 0.5, gravity: 40 }); items.splice(i, 1);
        }
      }
    },
    render: function (ctx) {
      ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 2;
      for (var i = 1; i < lanes; i++) { ctx.beginPath(); ctx.moveTo(W * i / lanes, 0); ctx.lineTo(W * i / lanes, H); ctx.stroke(); }
      for (var j = 0; j < items.length; j++) {
        var it = items[j]; var x = laneX(it.l); var c = it.bad ? P.hazard : P.accent; ctx.save(); ctx.translate(x, it.y); ctx.rotate(it.rot); ctx.shadowColor = c; ctx.shadowBlur = 14; ctx.fillStyle = c;
        if (it.bad) { ctx.beginPath(); for (var k = 0; k < 3; k++) { var a = k * 2.094; var fn = k ? "lineTo" : "moveTo"; ctx[fn](Math.cos(a) * it.r, Math.sin(a) * it.r); } ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(0, 0, it.r, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.save(); ctx.translate(px, py); ctx.shadowColor = P.accent2; ctx.shadowBlur = 18;
      var g = ctx.createLinearGradient(0, -P.pr, 0, P.pr); g.addColorStop(0, P.accent2); g.addColorStop(1, P.accent); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -P.pr); ctx.lineTo(P.pr, P.pr); ctx.lineTo(-P.pr, P.pr); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };
};
    return build(engine, P);
  }
};
