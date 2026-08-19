window.GAME = {
  meta: {
    "title": "Paper Junction",
    "tagline": "Master the timing.",
    "description": "Paper Junction — a desert mirage junction signal control game. You control the lights at a busy crossroads. Switch which road gets the green — let two streams into the junction at once and they crash.",
    "instructions": "You control the lights at a busy crossroads. Switch which road gets the green — let two streams into the junction at once and they crash. Tap / Space to switch the lights.",
    "controls": "Tap / Space to switch the lights",
    "accent": "#f9a8d4",
    "accent2": "#c084fc",
    "bg": "#160a1e",
    "width": 640,
    "height": 480,
    "genre": "simulation",
    "mechanic": "junction signal control",
    "theme": "desert mirage",
    "tags": [
      "simulation",
      "traffic",
      "arcade",
      "satisfying"
    ],
    "emoji": "🚦"
  },
  create: function (engine) {
    var P = {"roadW":77,"carSpeed":120.14,"ramp":3,"spawn":0.972,"patience":7.71,"maxCars":15,"switchLock":0.45,"accent":"#f9a8d4","accent2":"#c084fc","hazard":"#ff5d73"};
    var build = function buildTraffic(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var cars, greenNS, t, spawnT, passed, switchLock;
  var cx = W / 2, cy = H / 2, half = P.roadW / 2;
  function reset() { cars = []; greenNS = true; t = 0; spawnT = 0.7; passed = 0; switchLock = 0; }
  function inBox(c) { return c.x > cx - half - 16 && c.x < cx + half + 16 && c.y > cy - half - 16 && c.y < cy + half + 16; }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      if (switchLock > 0) switchLock -= dt;
      var toggle = input.justPressed("action") || input.pointer.justDown ||
        input.justPressed("left") || input.justPressed("right") || input.justPressed("up") || input.justPressed("down");
      if (toggle && switchLock <= 0) { greenNS = !greenNS; S.tick(); switchLock = P.switchLock; }

      var speed = P.carSpeed + t * P.ramp;
      for (var i = cars.length - 1; i >= 0; i--) {
        var c = cars[i];
        var isNS = c.dir === 0 || c.dir === 2;
        var green = isNS === greenNS;
        // distance to the stop line for this approach
        var toStop;
        if (c.dir === 0) toStop = (cy - half - 18) - c.y;
        else if (c.dir === 2) toStop = c.y - (cy + half + 18);
        else if (c.dir === 1) toStop = c.x - (cx + half + 18);
        else toStop = (cx - half - 18) - c.x;

        var blocked = false;
        if (!green && toStop > 0 && toStop < 6) blocked = true;
        // queue behind the car ahead
        for (var j = 0; j < cars.length; j++) {
          var o = cars[j];
          if (o === c || o.dir !== c.dir) continue;
          if (isNS) { if (c.dir === 0 && o.y > c.y && o.y - c.y < 34) blocked = true; if (c.dir === 2 && o.y < c.y && c.y - o.y < 34) blocked = true; }
          else { if (c.dir === 1 && o.x < c.x && c.x - o.x < 34) blocked = true; if (c.dir === 3 && o.x > c.x && o.x - c.x < 34) blocked = true; }
        }
        if (!blocked) {
          if (c.dir === 0) c.y += speed * dt; else if (c.dir === 2) c.y -= speed * dt;
          else if (c.dir === 1) c.x -= speed * dt; else c.x += speed * dt;
          c.wait = 0;
        } else { c.wait += dt; if (c.wait > P.patience) { S.hit(); engine.shake(16); S.over(); engine.gameOver(); return; } }

        if (c.x < -60 || c.x > W + 60 || c.y < -60 || c.y > H + 60) { cars.splice(i, 1); passed++; engine.addScore(5); continue; }
      }
      // collision: two cars from crossing axes inside the junction
      for (var a = 0; a < cars.length; a++) {
        if (!inBox(cars[a])) continue;
        for (var b = a + 1; b < cars.length; b++) {
          if (!inBox(cars[b])) continue;
          var aNS = cars[a].dir === 0 || cars[a].dir === 2, bNS = cars[b].dir === 0 || cars[b].dir === 2;
          if (aNS !== bNS && engine.dist(cars[a].x, cars[a].y, cars[b].x, cars[b].y) < 30) {
            S.hit(); engine.shake(26);
            engine.particles.burst((cars[a].x + cars[b].x) / 2, (cars[a].y + cars[b].y) / 2, { count: 40, color: P.hazard, speed: 260, life: 0.8, gravity: 60 });
            S.over(); engine.gameOver(); return;
          }
        }
      }
      spawnT -= dt;
      if (spawnT <= 0 && cars.length < P.maxCars) {
        var dir = engine.randInt(0, 3), c2 = { dir: dir, wait: 0, hue: engine.chance(0.5) ? P.accent : P.accent2 };
        if (dir === 0) { c2.x = cx - 16; c2.y = -40; } else if (dir === 2) { c2.x = cx + 16; c2.y = H + 40; }
        else if (dir === 1) { c2.x = W + 40; c2.y = cy - 16; } else { c2.x = -40; c2.y = cy + 16; }
        var tooClose = false;
        for (var k = 0; k < cars.length; k++) { if (cars[k].dir === dir && engine.dist(cars[k].x, cars[k].y, c2.x, c2.y) < 46) tooClose = true; }
        if (!tooClose) cars.push(c2);
        spawnT = Math.max(0.42, P.spawn - t * 0.014);
      }
    },
    render: function (ctx) {
      ctx.fillStyle = "rgba(255,255,255,.05)";
      ctx.beginPath(); ctx.rect(cx - half, 0, P.roadW, H); ctx.fill();
      ctx.beginPath(); ctx.rect(0, cy - half, W, P.roadW); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.lineWidth = 2;
      for (var d = 0; d < 14; d++) {
        var yy = d * 44 + 10;
        if (yy < cy - half - 10 || yy > cy + half + 10) { ctx.beginPath(); ctx.moveTo(cx, yy); ctx.lineTo(cx, yy + 20); ctx.stroke(); }
        var xx = d * 44 + 10;
        if (xx < cx - half - 10 || xx > cx + half + 10) { ctx.beginPath(); ctx.moveTo(xx, cy); ctx.lineTo(xx + 20, cy); ctx.stroke(); }
      }
      for (var i = 0; i < cars.length; i++) {
        var c = cars[i], ns = c.dir === 0 || c.dir === 2;
        ctx.save(); ctx.translate(c.x, c.y);
        ctx.shadowColor = c.hue; ctx.shadowBlur = 12; ctx.fillStyle = c.hue;
        ctx.beginPath();
        if (ns) ctx.rect(-11, -17, 22, 34); else ctx.rect(-17, -11, 34, 22);
        ctx.fill(); ctx.restore();
      }
      // signal heads
      var g1 = greenNS ? "#4ade80" : P.hazard, g2 = greenNS ? P.hazard : "#4ade80";
      ctx.save();
      ctx.shadowBlur = 16; ctx.shadowColor = g1; ctx.fillStyle = g1;
      ctx.beginPath(); ctx.arc(cx - half - 20, cy - half - 20, 9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + half + 20, cy + half + 20, 9, 0, 6.283); ctx.fill();
      ctx.shadowColor = g2; ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(cx + half + 20, cy - half - 20, 9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - half - 20, cy + half + 20, 9, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.textAlign = "left";
      ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText("cleared " + passed, 22, 22);
    }
  };
};
    return build(engine, P);
  }
};
