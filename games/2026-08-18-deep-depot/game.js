window.GAME = {
  meta: {
    "title": "Deep Depot",
    "tagline": "Deceptively simple.",
    "description": "Deep Depot — a deep-space recycling line sorting game. You're running the sorting line at a recycling plant. Steer each item down the chute into the matching bin — three missorts and the line shuts down.",
    "instructions": "You're running the sorting line at a recycling plant. Steer each item down the chute into the matching bin — three missorts and the line shuts down. Tap a bin / Arrows to steer the chute.",
    "controls": "Tap a bin / Arrows to steer the chute",
    "accent": "#8ab4ff",
    "accent2": "#b388ff",
    "bg": "#05070f",
    "width": 480,
    "height": 720,
    "genre": "simulation",
    "mechanic": "recycling line sorting",
    "theme": "deep-space",
    "tags": [
      "simulation",
      "sorter",
      "arcade",
      "meditative"
    ],
    "emoji": "♻️"
  },
  create: function (engine) {
    var P = {"fall":123,"ramp":7,"steer":9,"spawn":1.023,"itemR":15,"maxStrikes":3,"cats":[{"n":"PAPER","c":"#8ab4ff"},{"n":"GLASS","c":"#b388ff"},{"n":"METAL","c":"#f6c453"}],"accent":"#8ab4ff","accent2":"#b388ff","hazard":"#ff5d73"};
    var build = function buildSorter(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var items, sel, strikes, t, spawnT, pops;
  var binH = 92, binY = H - binH - 26;
  function bin(i) { var bw = (W - 32) / P.cats.length; return { x: 16 + i * bw + 4, y: binY, w: bw - 8, h: binH }; }
  function reset() { items = []; sel = P.cats.length >> 1; strikes = 0; t = 0; spawnT = 0.5; pops = []; }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      if (input.justPressed("left")) { sel = (sel + P.cats.length - 1) % P.cats.length; S.blip(); }
      if (input.justPressed("right")) { sel = (sel + 1) % P.cats.length; S.blip(); }
      var sw = input.consumeSwipe();
      if (sw === "left") { sel = (sel + P.cats.length - 1) % P.cats.length; S.blip(); }
      else if (sw === "right") { sel = (sel + 1) % P.cats.length; S.blip(); }
      if (input.pointer.justDown) {
        for (var b = 0; b < P.cats.length; b++) {
          var r = bin(b);
          if (input.pointer.x >= r.x && input.pointer.x <= r.x + r.w && input.pointer.y >= r.y - 40) { sel = b; S.blip(); }
        }
      }
      var speed = P.fall + t * P.ramp;
      var target = bin(sel);
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.x += ((target.x + target.w / 2) - it.x) * Math.min(1, dt * P.steer);
        it.y += speed * dt; it.rot += it.spin * dt;
        if (it.y >= binY + 8) {
          if (it.cat === sel) {
            engine.addScore(10); S.coin();
            engine.particles.burst(it.x, binY, { count: 16, color: P.cats[it.cat].c, speed: 170, life: 0.5, gravity: 120 });
            pops.push({ x: it.x, y: binY, life: 0.5, ok: 1 });
          } else {
            strikes++; S.hit(); engine.shake(14);
            engine.particles.burst(it.x, binY, { count: 20, color: P.hazard, speed: 190, life: 0.55, gravity: 140 });
            pops.push({ x: it.x, y: binY, life: 0.5, ok: 0 });
          }
          items.splice(i, 1);
          if (strikes >= P.maxStrikes) { S.over(); engine.gameOver(); return; }
        }
      }
      spawnT -= dt;
      if (spawnT <= 0) { items.push({ x: W / 2, y: -34, cat: engine.randInt(0, P.cats.length - 1), rot: 0, spin: engine.rand(-1.5, 1.5) }); spawnT = Math.max(0.42, P.spawn - t * 0.012); }
      for (var p = pops.length - 1; p >= 0; p--) { pops[p].life -= dt; if (pops[p].life <= 0) pops.splice(p, 1); }
    },
    render: function (ctx) {
      ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.lineWidth = 2;
      for (var g = 0; g < 8; g++) {
        var gy = ((t * 70 + g * 58) % (binY + 60)) - 30;
        ctx.beginPath(); ctx.moveTo(W / 2 - 74, gy); ctx.lineTo(W / 2 + 74, gy); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,.16)";
      ctx.beginPath(); ctx.moveTo(W / 2 - 78, -10); ctx.lineTo(W / 2 - 78, binY - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2 + 78, -10); ctx.lineTo(W / 2 + 78, binY - 40); ctx.stroke();
      for (var b = 0; b < P.cats.length; b++) {
        var r = bin(b), c = P.cats[b].c, on = b === sel;
        ctx.save();
        ctx.shadowColor = c; ctx.shadowBlur = on ? 22 : 0;
        ctx.fillStyle = on ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.04)";
        ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = on ? 4 : 2; ctx.stroke();
        ctx.restore();
        ctx.fillStyle = c; ctx.textAlign = "center";
        ctx.font = "bold 14px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(P.cats[b].n, r.x + r.w / 2, r.y + r.h / 2 + 5);
      }
      for (var i = 0; i < items.length; i++) {
        var it = items[i], cc = P.cats[it.cat];
        ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
        ctx.shadowColor = cc.c; ctx.shadowBlur = 16; ctx.fillStyle = cc.c;
        ctx.beginPath(); ctx.rect(-P.itemR, -P.itemR, P.itemR * 2, P.itemR * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.textAlign = "center";
        ctx.font = "bold 13px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(cc.n.charAt(0), 0, 5);
        ctx.restore();
      }
      for (var p = 0; p < pops.length; p++) {
        var q = pops[p];
        ctx.globalAlpha = Math.max(0, q.life * 2);
        ctx.fillStyle = q.ok ? P.accent : P.hazard; ctx.textAlign = "center";
        ctx.font = "bold 20px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(q.ok ? "+10" : "MISSORT", q.x, q.y - 26 - (0.5 - q.life) * 30);
        ctx.globalAlpha = 1;
      }
      for (var s = 0; s < P.maxStrikes; s++) {
        ctx.strokeStyle = s < strikes ? P.hazard : "rgba(255,255,255,.18)"; ctx.lineWidth = 3;
        var sx = W - 26 - s * 22, sy = 22;
        ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6);
        ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6); ctx.stroke();
      }
    }
  };
};
    return build(engine, P);
  }
};
