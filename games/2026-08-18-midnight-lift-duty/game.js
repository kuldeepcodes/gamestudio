window.GAME = {
  meta: {
    "title": "Midnight Lift Duty",
    "tagline": "Simple. Ruthless.",
    "description": "Midnight Lift Duty — a molten lava elevator dispatch game. You're the lift operator in a busy tower. Collect waiting people and drop them at their floor before anyone's patience runs out.",
    "instructions": "You're the lift operator in a busy tower. Collect waiting people and drop them at their floor before anyone's patience runs out. Up/Down arrows, swipe, or tap above/below the car.",
    "controls": "Up/Down arrows, swipe, or tap above/below the car",
    "accent": "#f9a8d4",
    "accent2": "#c084fc",
    "bg": "#160a1e",
    "width": 480,
    "height": 720,
    "genre": "simulation",
    "mechanic": "elevator dispatch",
    "theme": "molten lava",
    "tags": [
      "simulation",
      "elevator",
      "arcade",
      "frantic"
    ],
    "emoji": "🛗"
  },
  create: function (engine) {
    var P = {"floors":5,"carSpeed":7.725,"capacity":3,"patience":11.9,"spawn":2.618,"maxWaiting":6,"shaftW":74,"accent":"#f9a8d4","accent2":"#c084fc","hazard":"#ff5d73"};
    var build = function buildElevator(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var car, waiting, riders, t, spawnT, served, doorT;
  var top = 70, bot = H - 40;
  function floorY(i) { return bot - (i + 0.5) * ((bot - top) / P.floors); }
  function reset() {
    car = { f: 0, y: floorY(0), moving: 0 }; waiting = []; riders = []; t = 0; spawnT = 0.8; served = 0; doorT = 0;
    for (var i = 0; i < 2; i++) addRider();
  }
  function addRider() {
    var f = engine.randInt(0, P.floors - 1), d = engine.randInt(0, P.floors - 1);
    if (d === f) d = (f + 1) % P.floors;
    waiting.push({ f: f, dest: d, pat: P.patience, max: P.patience });
  }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      var d = input.dir(), want = car.f;
      if (input.justPressed("up") || d.y < 0) want = car.f + 1;
      if (input.justPressed("down") || d.y > 0) want = car.f - 1;
      var sw = input.consumeSwipe();
      if (sw === "up") want = car.f + 1; else if (sw === "down") want = car.f - 1;
      if (input.pointer.justDown) { want = car.f + (input.pointer.y < car.y - 18 ? 1 : (input.pointer.y > car.y + 18 ? -1 : 0)); }
      want = Math.round(engine.clamp(want, 0, P.floors - 1));
      if (want !== car.f && doorT <= 0) { car.f = want; S.blip(); }

      var ty = floorY(car.f);
      car.y += (ty - car.y) * Math.min(1, dt * P.carSpeed);
      var atFloor = Math.abs(car.y - ty) < 4;

      if (atFloor) {
        for (var r = riders.length - 1; r >= 0; r--) {
          if (riders[r].dest === car.f) {
            riders.splice(r, 1); served++; engine.addScore(15); S.coin(); doorT = 0.25;
            engine.particles.burst(W / 2, car.y, { count: 14, color: P.accent, speed: 150, life: 0.5, gravity: 40 });
          }
        }
        for (var w = waiting.length - 1; w >= 0; w--) {
          if (waiting[w].f === car.f && riders.length < P.capacity) {
            riders.push({ dest: waiting[w].dest }); waiting.splice(w, 1); S.power(); doorT = 0.25;
          }
        }
      }
      if (doorT > 0) doorT -= dt;

      for (var i = waiting.length - 1; i >= 0; i--) {
        waiting[i].pat -= dt;
        if (waiting[i].pat <= 0) { S.hit(); engine.shake(16); engine.particles.burst(40, floorY(waiting[i].f), { count: 18, color: P.hazard, speed: 160, life: 0.6 }); S.over(); engine.gameOver(); return; }
      }
      spawnT -= dt;
      if (spawnT <= 0 && waiting.length < P.maxWaiting) { addRider(); spawnT = Math.max(0.9, P.spawn - t * 0.02); }
    },
    render: function (ctx) {
      var shaftX = W / 2 - P.shaftW / 2;
      for (var f = 0; f < P.floors; f++) {
        var y = floorY(f);
        ctx.strokeStyle = "rgba(255,255,255,.10)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(24, y + 26); ctx.lineTo(W - 24, y + 26); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.30)"; ctx.textAlign = "left";
        ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText("L" + (f + 1), 26, y + 4);
      }
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.beginPath(); ctx.rect(shaftX, top - 30, P.shaftW, bot - top + 40); ctx.fill();

      for (var i = 0; i < waiting.length; i++) {
        var p = waiting[i], py = floorY(p.f), px = shaftX - 30 - (i % 3) * 20;
        var frac = Math.max(0, p.pat / p.max);
        ctx.fillStyle = frac < 0.3 ? P.hazard : P.accent2;
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = frac < 0.3 ? P.hazard : P.accent; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, 14, -1.5708, -1.5708 + 6.283 * frac); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.textAlign = "center";
        ctx.font = "bold 10px system-ui, -apple-system, Segoe UI, sans-serif";
        ctx.fillText(String(p.dest + 1), px, py + 3);
      }
      ctx.save();
      ctx.shadowColor = P.accent; ctx.shadowBlur = 18;
      ctx.fillStyle = "rgba(255,255,255,.12)";
      ctx.beginPath(); ctx.rect(shaftX + 4, car.y - 26, P.shaftW - 8, 52); ctx.fill();
      ctx.strokeStyle = P.accent; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      var gap = doorT > 0 ? (P.shaftW - 8) / 2 - 4 : 2;
      ctx.fillStyle = "rgba(255,255,255,.22)";
      ctx.beginPath(); ctx.rect(shaftX + 4, car.y - 26, gap, 52); ctx.fill();
      ctx.beginPath(); ctx.rect(shaftX + P.shaftW - 4 - gap, car.y - 26, gap, 52); ctx.fill();
      for (var r = 0; r < riders.length; r++) {
        ctx.fillStyle = P.accent2;
        ctx.beginPath(); ctx.arc(shaftX + 16 + r * 16, car.y + 4, 6, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.textAlign = "right";
      ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText("delivered " + served, W - 24, 22);
    }
  };
};
    return build(engine, P);
  }
};
