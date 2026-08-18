window.GAME = {
  meta: {
    "title": "Feral Espresso Bar",
    "tagline": "Don't blink.",
    "description": "Feral Espresso Bar — a desert mirage cafe order assembly game. You're on bar during the morning rush. Build each drink by adding its ingredients in the exact order on the ticket, before the customer walks.",
    "instructions": "You're on bar during the morning rush. Build each drink by adding its ingredients in the exact order on the ticket, before the customer walks. Tap the ingredients / Arrow keys.",
    "controls": "Tap the ingredients / Arrow keys",
    "accent": "#5eead4",
    "accent2": "#fca5a5",
    "bg": "#04140f",
    "width": 480,
    "height": 720,
    "genre": "simulation",
    "mechanic": "cafe order assembly",
    "theme": "desert mirage",
    "tags": [
      "simulation",
      "barista",
      "arcade",
      "playful"
    ],
    "emoji": "☕"
  },
  create: function (engine) {
    var P = {"ing":[{"n":"ESPRESSO","c":"#c98a5b"},{"n":"MILK","c":"#f4f1ea"},{"n":"SYRUP","c":"#5eead4"},{"n":"FOAM","c":"#fca5a5"}],"minLen":2,"maxLen":5,"time":2.915,"perItem":1.527,"penalty":0.91,"accent":"#5eead4","accent2":"#fca5a5","hazard":"#ff5d73"};
    var build = function buildBarista(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var order, step, timeLeft, t, done, flash, cupFill;
  function btn(i) {
    var n = P.ing.length, bw = (W - 40) / n;
    return { x: 20 + i * bw + 4, y: H - 118, w: bw - 8, h: 92 };
  }
  function newOrder() {
    var len = engine.randInt(P.minLen, P.maxLen), o = [];
    for (var i = 0; i < len; i++) o.push(engine.randInt(0, P.ing.length - 1));
    order = o; step = 0; timeLeft = P.time + len * P.perItem; cupFill = 0;
  }
  function reset() { t = 0; done = 0; flash = 0; newOrder(); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt; timeLeft -= dt; if (flash > 0) flash -= dt;
      if (timeLeft <= 0) { S.hit(); engine.shake(18); S.over(); engine.gameOver(); return; }
      var hit = -1;
      if (input.pointer.justDown) {
        for (var i = 0; i < P.ing.length; i++) {
          var r = btn(i);
          if (input.pointer.x >= r.x && input.pointer.x <= r.x + r.w && input.pointer.y >= r.y - 10) hit = i;
        }
      }
      if (input.justPressed("left")) hit = 0;
      if (input.justPressed("down")) hit = Math.min(1, P.ing.length - 1);
      if (input.justPressed("right")) hit = Math.min(2, P.ing.length - 1);
      if (input.justPressed("up")) hit = Math.min(3, P.ing.length - 1);
      if (hit < 0) return;
      if (hit === order[step]) {
        step++; S.blip(); cupFill = step / order.length;
        engine.particles.burst(btn(hit).x + btn(hit).w / 2, btn(hit).y, { count: 10, color: P.ing[hit].c, speed: 130, life: 0.4, gravity: -30 });
        if (step >= order.length) {
          done++; engine.addScore(20 + Math.round(Math.max(0, timeLeft) * 2)); S.coin();
          engine.particles.burst(W / 2, H / 2 - 40, { count: 26, color: P.accent, speed: 200, life: 0.7, gravity: 60 });
          newOrder();
        }
      } else {
        S.hit(); engine.shake(12); flash = 0.3; timeLeft -= P.penalty;
        engine.particles.burst(btn(hit).x + btn(hit).w / 2, btn(hit).y, { count: 14, color: P.hazard, speed: 150, life: 0.45 });
      }
    },
    render: function (ctx) {
      ctx.fillStyle = "rgba(255,255,255,.06)";
      ctx.beginPath(); ctx.rect(24, 56, W - 48, 96); ctx.fill();
      ctx.strokeStyle = flash > 0 ? P.hazard : "rgba(255,255,255,.18)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.textAlign = "left";
      ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText("ORDER #" + (done + 1), 38, 78);
      for (var i = 0; i < order.length; i++) {
        var g = P.ing[order[i]], bx = 40 + i * 46, by = 108, on = i < step;
        ctx.save();
        ctx.globalAlpha = on ? 0.35 : 1; ctx.shadowColor = g.c; ctx.shadowBlur = on ? 0 : 12;
        ctx.fillStyle = g.c; ctx.beginPath(); ctx.arc(bx, by, 15, 0, 6.283); ctx.fill();
        ctx.restore();
        if (on) { ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.lineTo(bx - 2, by + 6); ctx.lineTo(bx + 8, by - 6); ctx.stroke(); }
      }
      var frac = Math.max(0, Math.min(1, timeLeft / (P.time + order.length * P.perItem)));
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.beginPath(); ctx.rect(24, 168, W - 48, 8); ctx.fill();
      ctx.fillStyle = frac < 0.25 ? P.hazard : P.accent;
      ctx.beginPath(); ctx.rect(24, 168, (W - 48) * frac, 8); ctx.fill();

      var cupW = 96, cupH = 116, cxx = W / 2 - cupW / 2, cyy = H / 2 - 30;
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.beginPath(); ctx.rect(cxx, cyy, cupW, cupH); ctx.fill();
      ctx.fillStyle = P.accent2; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.rect(cxx + 4, cyy + cupH - 4 - (cupH - 8) * cupFill, cupW - 8, (cupH - 8) * cupFill); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = P.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.rect(cxx, cyy, cupW, cupH); ctx.stroke();
      ctx.beginPath(); ctx.arc(cxx + cupW + 14, cyy + 40, 18, -1.2, 1.2); ctx.stroke();

      for (var b = 0; b < P.ing.length; b++) {
        var r = btn(b), c = P.ing[b].c;
        ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = 14;
        ctx.fillStyle = "rgba(255,255,255,.06)";
        ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.fill();
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(r.x + r.w / 2, r.y + 32, 13, 0, 6.283); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.72)"; ctx.textAlign = "center";
        ctx.font = "600 11px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(P.ing[b].n, r.x + r.w / 2, r.y + 68);
      }
    }
  };
};
    return build(engine, P);
  }
};
