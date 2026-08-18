window.GAME = {
  meta: {
    "title": "Wild Load Balance",
    "tagline": "Simple. Ruthless.",
    "description": "Wild Load Balance — a volcanic forge power grid balancing game. You're running the control room. Track demand with your generation — drift outside the tolerance band and the grid destabilises into a blackout.",
    "instructions": "You're running the control room. Track demand with your generation — drift outside the tolerance band and the grid destabilises into a blackout. Drag / Up-Down arrows to set output.",
    "controls": "Drag / Up-Down arrows to set output",
    "accent": "#93c5fd",
    "accent2": "#f0abfc",
    "bg": "#060814",
    "width": 480,
    "height": 720,
    "genre": "simulation",
    "mechanic": "power grid balancing",
    "theme": "volcanic forge",
    "tags": [
      "simulation",
      "powergrid",
      "arcade",
      "frantic"
    ],
    "emoji": "⚡"
  },
  create: function (engine) {
    var P = {"w1":0.951,"w2":1.856,"band":0.105,"rate":0.56,"follow":9,"drain":0.304,"recover":0.22,"accent":"#93c5fd","accent2":"#f0abfc","hazard":"#ff5d73"};
    var build = function buildPowerGrid(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var supply, demand, phase, stability, t, hist, surgeT;
  function demandAt(ph) {
    return engine.clamp(0.5 + Math.sin(ph * P.w1) * 0.22 + Math.sin(ph * P.w2 + 1.3) * 0.14, 0.06, 0.94);
  }
  function reset() {
    phase = 0; stability = 1; t = 0; surgeT = 3;
    demand = demandAt(0);
    // start matched to demand, otherwise the run begins already out of band
    supply = demand;
    hist = []; for (var i = 0; i < 60; i++) hist.push({ s: supply, d: demand });
  }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt; phase += dt;
      // demand drifts on layered sine waves, with occasional surges
      demand = demandAt(phase);
      surgeT -= dt;
      if (surgeT <= 0) { surgeT = engine.rand(3.5, 7); demand += engine.chance(0.5) ? 0.16 : -0.16; S.tick(); }
      demand = engine.clamp(demand, 0.06, 0.94);

      var d = input.dir();
      if (d.y) supply -= d.y * P.rate * dt;
      if (input.pointer.down) supply += ((1 - (input.pointer.y / H)) - supply) * Math.min(1, dt * P.follow);
      supply = engine.clamp(supply, 0, 1);

      var err = Math.abs(supply - demand);
      if (err <= P.band) {
        stability = Math.min(1, stability + dt * P.recover);
        engine.addScore(1);
        if (Math.floor(t * 2) % 2 === 0 && err < P.band * 0.35) engine.addScore(1);
      } else {
        // cap the penalty multiplier so a big swing can't wipe the meter instantly
        stability -= dt * P.drain * Math.min(1.25, err / P.band);
        if (stability <= 0) {
          S.hit(); engine.shake(24);
          engine.particles.burst(W / 2, H * (1 - supply), { count: 40, color: P.hazard, speed: 240, life: 0.8 });
          S.over(); engine.gameOver(); return;
        }
      }
      hist.push({ s: supply, d: demand });
      if (hist.length > 70) hist.shift();
    },
    render: function (ctx) {
      var y = function (v) { return H - 70 - v * (H - 150); };
      // tolerance band around demand
      ctx.fillStyle = "rgba(110,231,255,.10)";
      ctx.beginPath();
      ctx.rect(0, y(demand + P.band), W, Math.max(2, y(demand - P.band) - y(demand + P.band)));
      ctx.fill();

      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.beginPath();
      for (var i = 0; i < hist.length; i++) {
        var x = (i / (hist.length - 1)) * W;
        if (i === 0) ctx.moveTo(x, y(hist[i].d)); else ctx.lineTo(x, y(hist[i].d));
      }
      ctx.stroke();

      ctx.lineWidth = 3; ctx.strokeStyle = P.accent;
      ctx.save(); ctx.shadowColor = P.accent; ctx.shadowBlur = 12;
      ctx.beginPath();
      for (var j = 0; j < hist.length; j++) {
        var x2 = (j / (hist.length - 1)) * W;
        if (j === 0) ctx.moveTo(x2, y(hist[j].s)); else ctx.lineTo(x2, y(hist[j].s));
      }
      ctx.stroke(); ctx.restore();

      var inBand = Math.abs(supply - demand) <= P.band;
      ctx.save();
      ctx.shadowColor = inBand ? "#4ade80" : P.hazard; ctx.shadowBlur = 20;
      ctx.fillStyle = inBand ? "#4ade80" : P.hazard;
      ctx.beginPath(); ctx.arc(W - 26, y(supply), 9, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.30)";
      ctx.beginPath(); ctx.arc(W - 26, y(demand), 5, 0, 6.283); ctx.fill();

      // stability meter
      ctx.fillStyle = "rgba(255,255,255,.10)";
      ctx.beginPath(); ctx.rect(22, H - 42, W - 44, 10); ctx.fill();
      ctx.fillStyle = stability < 0.35 ? P.hazard : P.accent2;
      ctx.beginPath(); ctx.rect(22, H - 42, (W - 44) * Math.max(0, stability), 10); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.textAlign = "left";
      ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText("GRID STABILITY", 22, H - 50);
      ctx.textAlign = "right";
      ctx.fillText(inBand ? "BALANCED" : "OUT OF BAND", W - 22, H - 50);
    }
  };
};
    return build(engine, P);
  }
};
