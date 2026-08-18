window.GAME = {
  meta: {
    "title": "Quantum Diner Rush",
    "tagline": "Chase the high score.",
    "description": "Quantum Diner Rush — a circuit board short-order grill timing game. You're on the grill during service. Pull each patty in its window — too early is raw, too late is burnt. Three ruined and service is over.",
    "instructions": "You're on the grill during service. Pull each patty in its window — too early is raw, too late is burnt. Three ruined and service is over. Tap a grill slot / Arrow keys.",
    "controls": "Tap a grill slot / Arrow keys",
    "accent": "#6ee7ff",
    "accent2": "#a78bfa",
    "bg": "#070b1a",
    "width": 480,
    "height": 720,
    "genre": "simulation",
    "mechanic": "short-order grill timing",
    "theme": "circuit board",
    "tags": [
      "simulation",
      "grill",
      "arcade",
      "cheerful"
    ],
    "emoji": "🍔"
  },
  create: function (engine) {
    var P = {"slots":5,"cook":2.759,"window":0.456,"spawn":2.032,"pattyR":20,"maxStrikes":3,"accent":"#6ee7ff","accent2":"#a78bfa","hazard":"#ff5d73"};
    var build = function buildGrill(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var slots, strikes, t, spawnT, pops;
  function slotRect(i) {
    var n = P.slots, gap = 12, bw = (W - gap * (n + 1)) / n;
    return { x: gap + i * (bw + gap), y: H * 0.34, w: bw, h: Math.min(160, H * 0.34) };
  }
  function reset() {
    slots = []; for (var i = 0; i < P.slots; i++) slots.push(null);
    strikes = 0; t = 0; spawnT = 0.4; pops = [];
  }
  function fail(x, y, msg) {
    strikes++; S.hit(); engine.shake(15);
    engine.particles.burst(x, y, { count: 18, color: P.hazard, speed: 170, life: 0.5, gravity: 90 });
    pops.push({ x: x, y: y, life: 0.6, txt: msg, ok: 0 });
  }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      var tap = -1;
      if (input.pointer.justDown) {
        for (var i = 0; i < P.slots; i++) {
          var r = slotRect(i);
          if (input.pointer.x >= r.x && input.pointer.x <= r.x + r.w) tap = i;
        }
      }
      if (input.justPressed("left")) tap = 0;
      if (input.justPressed("up") || input.justPressed("action")) tap = Math.min(1, P.slots - 1);
      if (input.justPressed("right")) tap = Math.min(2, P.slots - 1);
      if (input.justPressed("down")) tap = Math.min(3, P.slots - 1);

      if (tap >= 0 && slots[tap]) {
        var r2 = slotRect(tap), cx = r2.x + r2.w / 2, cy = r2.y + r2.h / 2, it = slots[tap];
        if (it.p >= 1) {
          var bonus = Math.max(1, Math.round((1 - (it.p - 1) / P.window) * 10));
          engine.addScore(10 + bonus); S.coin();
          engine.particles.burst(cx, cy, { count: 16, color: P.accent, speed: 160, life: 0.5, gravity: -20 });
          pops.push({ x: cx, y: cy, life: 0.6, txt: "+" + (10 + bonus), ok: 1 });
          slots[tap] = null;
        } else { fail(cx, cy, "RAW"); slots[tap] = null; }
      }

      for (var j = 0; j < P.slots; j++) {
        var s = slots[j];
        if (!s) continue;
        s.p += dt / P.cook;
        if (s.p > 1 + P.window) {
          var rr = slotRect(j);
          fail(rr.x + rr.w / 2, rr.y + rr.h / 2, "BURNT");
          slots[j] = null;
        }
      }
      if (strikes >= P.maxStrikes) { S.over(); engine.gameOver(); return; }

      spawnT -= dt;
      if (spawnT <= 0) {
        var free = [];
        for (var k = 0; k < P.slots; k++) if (!slots[k]) free.push(k);
        if (free.length) { slots[free[engine.randInt(0, free.length - 1)]] = { p: 0 }; S.blip(); }
        spawnT = Math.max(0.7, P.spawn - t * 0.02);
      }
      for (var q = pops.length - 1; q >= 0; q--) { pops[q].life -= dt; if (pops[q].life <= 0) pops.splice(q, 1); }
    },
    render: function (ctx) {
      ctx.fillStyle = "rgba(255,255,255,.04)";
      var pad = 8, top = H * 0.34 - pad;
      ctx.beginPath(); ctx.rect(pad / 2, top, W - pad, Math.min(160, H * 0.34) + pad * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1;
      for (var g = 0; g < 7; g++) {
        var gy = top + 10 + g * ((Math.min(160, H * 0.34) + pad * 2 - 20) / 6);
        ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke();
      }
      for (var i = 0; i < P.slots; i++) {
        var r = slotRect(i), s = slots[i], cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        var ready = s && s.p >= 1;
        ctx.save();
        ctx.strokeStyle = ready ? "#4ade80" : "rgba(255,255,255,.16)";
        ctx.lineWidth = ready ? 3 : 2;
        if (ready) { ctx.shadowColor = "#4ade80"; ctx.shadowBlur = 18; }
        ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.stroke();
        ctx.restore();
        if (!s) continue;
        var raw = Math.min(1, s.p);
        var col = ready ? (s.p > 1 + P.window * 0.6 ? "#7c4a21" : "#b5651d") : "#e08a9b";
        ctx.save(); ctx.translate(cx, cy);
        ctx.shadowColor = ready ? "#ffb703" : "transparent"; ctx.shadowBlur = ready ? 16 : 0;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, P.pattyR, 0, 6.283); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = ready ? "#4ade80" : P.accent; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, P.pattyR + 10, -1.5708, -1.5708 + 6.283 * raw); ctx.stroke();
        if (ready) {
          var over = (s.p - 1) / P.window;
          ctx.strokeStyle = over > 0.6 ? P.hazard : "#ffb703"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, P.pattyR + 18, -1.5708, -1.5708 + 6.283 * (1 - over)); ctx.stroke();
        }
        ctx.restore();
      }
      for (var p = 0; p < pops.length; p++) {
        var o = pops[p];
        ctx.globalAlpha = Math.max(0, o.life * 1.6);
        ctx.fillStyle = o.ok ? P.accent : P.hazard; ctx.textAlign = "center";
        ctx.font = "bold 18px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(o.txt, o.x, o.y - 40 - (0.6 - o.life) * 26);
        ctx.globalAlpha = 1;
      }
      for (var st = 0; st < P.maxStrikes; st++) {
        ctx.strokeStyle = st < strikes ? P.hazard : "rgba(255,255,255,.18)"; ctx.lineWidth = 3;
        var sx = W - 26 - st * 22, sy = 22;
        ctx.beginPath(); ctx.moveTo(sx - 6, sy - 6); ctx.lineTo(sx + 6, sy + 6);
        ctx.moveTo(sx + 6, sy - 6); ctx.lineTo(sx - 6, sy + 6); ctx.stroke();
      }
    }
  };
};
    return build(engine, P);
  }
};
