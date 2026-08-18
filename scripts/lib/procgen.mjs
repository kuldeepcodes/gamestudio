// Procedural game generator — the free, always-available backend.
// GitHub Models was retired (2026-07-30), so the default generator is local: a set of
// hand-crafted, pre-tested premium game ARCHETYPES (written against engine/api.md) that are
// parameterized by the creative brief (theme, palette, orientation, tuning). Combined with the
// idea engine this yields thousands of distinct, guaranteed-working games — no API key, no network.
//
// Each archetype builder is a *self-contained* function (uses only `engine`, `P`, Math, canvas).
// We serialize it via Function.prototype.toString() into the emitted game.js, and embed a static
// `meta` object + a static `P` params object so the build step can read meta in a sandbox.

/* eslint-disable */

// ---------- archetype builders (self-contained; no closure over module scope) ----------

function buildAvoider(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var me, foes, motes, spawnT, t;
  function reset() { me = { x: W / 2, y: H / 2, r: P.r }; foes = []; motes = []; spawnT = P.grace; t = 0; }
  function spawnFoe() {
    var edge = engine.randInt(0, 3), x, y;
    if (edge === 0) { x = engine.rand(0, W); y = -20; }
    else if (edge === 1) { x = W + 20; y = engine.rand(0, H); }
    else if (edge === 2) { x = engine.rand(0, W); y = H + 20; }
    else { x = -20; y = engine.rand(0, H); }
    var ang = Math.atan2((H / 2 - y) + engine.rand(-140, 140), (W / 2 - x) + engine.rand(-140, 140));
    var sp = P.foeSpeed * engine.rand(0.8, 1.3) + t * P.ramp;
    foes.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: engine.rand(P.foeMin, P.foeMax), rot: engine.rand(0, 6) });
  }
  function spawnMote() { motes.push({ x: engine.rand(30, W - 30), y: engine.rand(30, H - 30), r: P.moteR, pulse: engine.rand(0, 6) }); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      if (input.pointer.down) { me.x += (input.pointer.x - me.x) * Math.min(1, dt * P.follow); me.y += (input.pointer.y - me.y) * Math.min(1, dt * P.follow); }
      var d = input.dir(); me.x += d.x * P.kspeed * dt; me.y += d.y * P.kspeed * dt;
      me.x = engine.clamp(me.x, me.r, W - me.r); me.y = engine.clamp(me.y, me.r, H - me.r);
      spawnT -= dt; if (spawnT <= 0) { spawnFoe(); if (t > 8 && engine.chance(0.5)) spawnFoe(); spawnT = Math.max(0.28, P.spawn - t * 0.01); }
      while (motes.length < P.motes) spawnMote();
      for (var i = foes.length - 1; i >= 0; i--) {
        var f = foes[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += dt * 2;
        if (f.x < -50 || f.x > W + 50 || f.y < -50 || f.y > H + 50) { foes.splice(i, 1); engine.addScore(1); continue; }
        if (engine.dist(f.x, f.y, me.x, me.y) < f.r + me.r - 3) { S.hit(); engine.shake(18); engine.particles.burst(me.x, me.y, { count: 36, color: P.hazard, speed: 230, life: 0.7, gravity: 80 }); engine.gameOver(); return; }
      }
      for (var j = motes.length - 1; j >= 0; j--) {
        var m = motes[j]; m.pulse += dt * 4;
        if (engine.dist(m.x, m.y, me.x, me.y) < m.r + me.r) { engine.addScore(5); S.coin(); engine.particles.burst(m.x, m.y, { count: 14, color: P.accent, speed: 150, life: 0.5, gravity: 30 }); motes.splice(j, 1); }
      }
    },
    render: function (ctx) {
      for (var j = 0; j < motes.length; j++) { var m = motes[j]; var pr = m.r + Math.sin(m.pulse) * 2; ctx.shadowColor = P.accent; ctx.shadowBlur = 14; ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(m.x, m.y, pr, 0, 6.283); ctx.fill(); }
      ctx.shadowBlur = 0;
      for (var i = 0; i < foes.length; i++) {
        var f = foes[i]; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.shadowColor = P.hazard; ctx.shadowBlur = 14; ctx.fillStyle = P.hazard; ctx.beginPath();
        for (var k = 0; k < 5; k++) { var a = k * 1.2566; var fn = k ? "lineTo" : "moveTo"; ctx[fn](Math.cos(a) * f.r, Math.sin(a) * f.r); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.shadowBlur = 0;
      ctx.save(); ctx.translate(me.x, me.y); ctx.shadowColor = P.accent2; ctx.shadowBlur = 20;
      var g = ctx.createRadialGradient(0, 0, 2, 0, 0, me.r); g.addColorStop(0, "#ffffff"); g.addColorStop(1, P.accent2);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, me.r, 0, 6.283); ctx.fill(); ctx.restore();
    }
  };
}

function buildFlapper(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var bx = Math.round(W * 0.3), y, vy, walls, t, started;
  function addWall(x) { var gy = engine.rand(P.gap * 0.6 + 50, H - P.gap * 0.6 - 50); walls.push({ x: x, gy: gy, scored: false }); }
  function reset() { y = H / 2; vy = 0; walls = []; t = 0; started = false; addWall(W + 40); addWall(W + 40 + P.gapX); addWall(W + 40 + P.gapX * 2); }
  function over() { S.hit(); engine.shake(16); engine.particles.burst(bx, y, { count: 30, color: P.hazard, speed: 200, life: 0.6, gravity: 220 }); engine.gameOver(); }
  function flap() { vy = P.flap; S.jump(); engine.particles.burst(bx, y + P.r, { count: 6, color: P.accent2, speed: 70, life: 0.3, gravity: 60 }); started = true; }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      if (input.pointer.justDown || input.justPressed("action") || input.justPressed("up")) flap();
      if (!started) return;
      t += dt; var sp = P.scroll + t * P.ramp;
      vy += P.grav * dt; if (vy > P.vmax) vy = P.vmax; y += vy * dt;
      if (y > H - P.r) { y = H - P.r; return over(); }
      if (y < P.r) { y = P.r; if (vy < 0) vy = 0; }
      for (var i = walls.length - 1; i >= 0; i--) {
        var wl = walls[i]; wl.x -= sp * dt;
        if (!wl.scored && wl.x + P.wallW < bx - P.r) { wl.scored = true; engine.addScore(1); S.coin(); }
        if (bx + P.r > wl.x && bx - P.r < wl.x + P.wallW && (y - P.r < wl.gy - P.gap / 2 || y + P.r > wl.gy + P.gap / 2)) { return over(); }
        if (wl.x + P.wallW < -20) walls.splice(i, 1);
      }
      var last = walls[walls.length - 1]; if (!last || last.x < W - P.gapX) addWall(W + 40);
    },
    render: function (ctx) {
      for (var i = 0; i < walls.length; i++) {
        var wl = walls[i]; ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 12;
        ctx.fillRect(wl.x, 0, P.wallW, wl.gy - P.gap / 2);
        ctx.fillRect(wl.x, wl.gy + P.gap / 2, P.wallW, H - (wl.gy + P.gap / 2));
      }
      ctx.shadowBlur = 0;
      ctx.save(); ctx.translate(bx, y); ctx.rotate(engine.clamp(Math.atan2(vy, 260), -0.6, 0.9));
      ctx.shadowColor = P.accent2; ctx.shadowBlur = 18; var g = ctx.createLinearGradient(-P.r, -P.r, P.r, P.r); g.addColorStop(0, "#ffffff"); g.addColorStop(1, P.accent2);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, P.r, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#0b1020"; ctx.beginPath(); ctx.arc(P.r * 0.35, -P.r * 0.2, P.r * 0.18, 0, 6.283); ctx.fill();
      ctx.restore();
    }
  };
}

function buildLane(engine, P) {
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
}

function buildPaddle(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var paddle, ball, bricks, t, wave, serveT;
  function makeBricks() {
    bricks = []; wave++; var cols = P.cols, rows = Math.min(P.rowsMax, 2 + wave), gap = 6, bw = (W - gap * (cols + 1)) / cols, bh = P.bh;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) bricks.push({ x: gap + c * (bw + gap), y: 44 + r * (bh + gap), w: bw, h: bh });
  }
  function reset() { paddle = { x: W / 2, w: P.pw }; ball = { x: W / 2, y: H * 0.6, vx: P.bspeed * (engine.chance(0.5) ? 1 : -1), vy: -P.bspeed, r: P.br }; t = 0; wave = 0; serveT = P.serve; makeBricks(); }
  function over() { S.hit(); engine.shake(16); engine.particles.burst(ball.x, ball.y, { count: 30, color: P.hazard, speed: 200, life: 0.6, gravity: 120 }); engine.gameOver(); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      if (input.pointer.down) paddle.x = input.pointer.x;
      var d = input.dir().x; if (d) paddle.x += d * P.pspeed * dt;
      paddle.x = engine.clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
      // the ball rests on the paddle briefly at the start of a run so the player can
      // orient before it launches (a stationary paddle otherwise loses in under 2s)
      if (serveT > 0) {
        serveT -= dt;
        ball.x = paddle.x; ball.y = H - P.pmargin - ball.r - 4;
        if (serveT <= 0) { ball.vy = -Math.abs(P.bspeed); ball.vx = P.bspeed * (engine.chance(0.5) ? 0.6 : -0.6); S.jump(); }
        return;
      }
      var speed = 1 + t * P.ramp;
      ball.x += ball.vx * dt * speed; ball.y += ball.vy * dt * speed;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      var py = H - P.pmargin;
      if (ball.vy > 0 && ball.y + ball.r > py && ball.y < py + 18 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
        ball.vy = -Math.abs(ball.vy); ball.vx = engine.clamp(ball.vx + (ball.x - paddle.x) / (paddle.w / 2) * P.bspeed * 0.6, -P.bspeed * 1.8, P.bspeed * 1.8); S.blip();
      }
      if (ball.y - ball.r > H) return over();
      for (var i = bricks.length - 1; i >= 0; i--) {
        var b = bricks[i];
        if (ball.x > b.x - ball.r && ball.x < b.x + b.w + ball.r && ball.y > b.y - ball.r && ball.y < b.y + b.h + ball.r) {
          var ox = Math.min(Math.abs(ball.x - b.x), Math.abs(ball.x - (b.x + b.w)));
          var oy = Math.min(Math.abs(ball.y - b.y), Math.abs(ball.y - (b.y + b.h)));
          if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
          engine.addScore(2); S.coin(); engine.particles.burst(ball.x, ball.y, { count: 10, color: P.accent, speed: 140, life: 0.4, gravity: 60 });
          bricks.splice(i, 1); break;
        }
      }
      if (!bricks.length) { makeBricks(); ball.x = W / 2; ball.y = H * 0.6; ball.vy = -Math.abs(ball.vy) - 10; }
    },
    render: function (ctx) {
      for (var i = 0; i < bricks.length; i++) { var b = bricks[i]; ctx.fillStyle = P.accent; ctx.shadowColor = P.accent; ctx.shadowBlur = 8; ctx.fillRect(b.x, b.y, b.w, b.h); }
      ctx.shadowBlur = 0;
      function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
      var py = H - P.pmargin;
      ctx.save(); ctx.shadowColor = P.accent2; ctx.shadowBlur = 16; var g = ctx.createLinearGradient(paddle.x - paddle.w / 2, 0, paddle.x + paddle.w / 2, 0); g.addColorStop(0, P.accent2); g.addColorStop(1, P.accent);
      ctx.fillStyle = g; rr(ctx, paddle.x - paddle.w / 2, py, paddle.w, 12, 6); ctx.fill(); ctx.restore();
      ctx.save(); ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 14; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 6.283); ctx.fill(); ctx.restore();
    }
  };
}

function buildStacker(engine, P) {
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
}

function buildReflex(engine, P) {
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
}

// ---------- real-world scenario builders ----------
// These model everyday situations (a sorting line, a lift, an intersection, a coffee bar)
// rather than abstract arcade shapes, so the gallery reads as small simulations.

function buildSorter(engine, P) {
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
}

function buildElevator(engine, P) {
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
}

function buildTraffic(engine, P) {
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
}

function buildBarista(engine, P) {
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
}

function buildGrill(engine, P) {
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
}

function buildFirewatch(engine, P) {
  var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
  var cells, t, spreadT, doused, cols, rows, cw, ch, ox, oy;
  function idx(c, r) { return r * cols + c; }
  function reset() {
    cols = P.cols; rows = P.rows;
    cw = Math.floor((W - 24) / cols); ch = Math.floor((H - 120) / rows);
    var sz = Math.min(cw, ch); cw = sz; ch = sz;
    ox = Math.floor((W - cw * cols) / 2); oy = Math.floor((H - ch * rows) / 2) + 10;
    cells = []; for (var i = 0; i < cols * rows; i++) cells.push(0);
    cells[idx(cols >> 1, rows >> 1)] = 1;
    t = 0; spreadT = P.spread; doused = 0;
  }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      if (input.pointer.justDown) {
        var c = Math.floor((input.pointer.x - ox) / cw), r = Math.floor((input.pointer.y - oy) / ch);
        if (c >= 0 && c < cols && r >= 0 && r < rows && cells[idx(c, r)] === 1) {
          cells[idx(c, r)] = 2; doused++; engine.addScore(8); S.coin();
          engine.particles.burst(ox + c * cw + cw / 2, oy + r * ch + ch / 2, { count: 14, color: P.accent, speed: 140, life: 0.5, gravity: -40 });
        } else { S.blip(); }
      }
      spreadT -= dt;
      if (spreadT <= 0) {
        spreadT = Math.max(0.5, P.spread - t * 0.02);
        var born = [];
        for (var rr = 0; rr < rows; rr++) for (var cc = 0; cc < cols; cc++) {
          if (cells[idx(cc, rr)] !== 1) continue;
          var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (var d = 0; d < 4; d++) {
            var nc = cc + dirs[d][0], nr = rr + dirs[d][1];
            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
            if (cells[idx(nc, nr)] === 0 && engine.chance(P.catch)) born.push(idx(nc, nr));
          }
        }
        for (var b = 0; b < born.length; b++) cells[born[b]] = 1;
        if (born.length) S.tick();
        var burning = 0;
        for (var i = 0; i < cells.length; i++) if (cells[i] === 1) burning++;
        if (burning === 0) { cells[engine.randInt(0, cells.length - 1)] = 1; }
        if (burning >= P.maxFires) { S.hit(); engine.shake(22); S.over(); engine.gameOver(); return; }
      }
    },
    render: function (ctx) {
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var v = cells[idx(c, r)], x = ox + c * cw, y = oy + r * ch;
        ctx.fillStyle = v === 2 ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.03)";
        ctx.beginPath(); ctx.rect(x + 2, y + 2, cw - 4, ch - 4); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 1; ctx.stroke();
        if (v === 1) {
          var f = 0.7 + Math.sin(t * 9 + (c + r)) * 0.3;
          ctx.save();
          ctx.shadowColor = P.hazard; ctx.shadowBlur = 18 * f;
          ctx.fillStyle = P.hazard;
          ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, (Math.min(cw, ch) / 2 - 5) * f, 0, 6.283); ctx.fill();
          ctx.fillStyle = "#ffb703";
          ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, (Math.min(cw, ch) / 4) * f, 0, 6.283); ctx.fill();
          ctx.restore();
        } else if (v === 2) {
          ctx.fillStyle = "rgba(110,231,255,.18)";
          ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, Math.min(cw, ch) / 5, 0, 6.283); ctx.fill();
        }
      }
      var burning = 0;
      for (var i = 0; i < cells.length; i++) if (cells[i] === 1) burning++;
      ctx.fillStyle = burning > P.maxFires * 0.66 ? P.hazard : "rgba(255,255,255,.55)";
      ctx.textAlign = "left"; ctx.font = "600 12px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText("fires " + burning + "/" + P.maxFires + "   doused " + doused, 22, 24);
    }
  };
}

function buildPowerGrid(engine, P) {
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
}

// ---------- variation ----------

// Per-archetype jitter ranges. Two games of the same archetype should still *play*
// differently, so every tunable is scaled by a seeded multiplier within safe bounds.
// Keys absent from a spec are left at their baseline.
const JITTER = {
  avoider: { kspeed: [0.85, 1.20], foeSpeed: [0.80, 1.30], spawn: [0.75, 1.25], foeMax: [0.80, 1.35], foeMin: [0.80, 1.20], motes: [0.70, 1.70], r: [0.85, 1.15], follow: [0.80, 1.25] },
  flapper: { grav: [0.85, 1.20], flap: [0.90, 1.12], scroll: [0.85, 1.30], gap: [0.88, 1.18], gapX: [0.85, 1.25], wallW: [0.85, 1.25], r: [0.88, 1.12] },
  lane: { fall: [0.85, 1.35], spawn: [0.75, 1.25], badChance: [0.75, 1.25], itemR: [0.85, 1.15], pr: [0.88, 1.15], slide: [0.80, 1.30] },
  paddle: { bspeed: [0.85, 1.25], pw: [0.75, 1.25], cols: [0.80, 1.40], rowsMax: [0.70, 1.50], bh: [0.88, 1.18], pspeed: [0.85, 1.20], br: [0.85, 1.25] },
  stacker: { speed: [0.78, 1.40], startW: [0.78, 1.25], bh: [0.85, 1.20], rampPx: [0.70, 1.50] },
  reflex: { life: [0.82, 1.22], spawn: [0.75, 1.30], tr: [0.85, 1.25], badChance: [0.75, 1.35], maxMiss: [0.80, 1.40] },
  sorter: { fall: [0.82, 1.28], spawn: [0.78, 1.25], steer: [0.80, 1.30], itemR: [0.88, 1.15], ramp: [0.70, 1.40] },
  elevator: { carSpeed: [0.85, 1.25], patience: [0.82, 1.20], spawn: [0.78, 1.25], floors: [0.85, 1.25], capacity: [0.80, 1.40] },
  traffic: { carSpeed: [0.85, 1.25], spawn: [0.78, 1.28], patience: [0.85, 1.25], roadW: [0.88, 1.15], maxCars: [0.80, 1.30] },
  barista: { perItem: [0.85, 1.22], time: [0.85, 1.25], penalty: [0.80, 1.30], maxLen: [0.85, 1.25] },
  grill: { cook: [0.82, 1.22], window: [0.85, 1.20], spawn: [0.80, 1.25], slots: [0.80, 1.30], pattyR: [0.90, 1.12] },
  firewatch: { spread: [0.82, 1.22], catch: [0.80, 1.30], maxFires: [0.85, 1.25], cols: [0.85, 1.20], rows: [0.85, 1.20] },
  powergrid: { w1: [0.80, 1.30], w2: [0.80, 1.30], band: [0.85, 1.20], rate: [0.85, 1.20], drain: [0.85, 1.25] }
};

// Scale numeric params in place. Integers stay integers, signs are preserved (flap is
// negative), and everything is floored at a playable minimum.
function jitterParams(key, P, rng) {
  const spec = JITTER[key];
  if (!spec) return P;
  const out = Object.assign({}, P);
  for (const k of Object.keys(spec)) {
    const base = P[k];
    if (typeof base !== "number" || !isFinite(base)) continue;
    const [lo, hi] = spec[k];
    const scaled = base * (lo + (hi - lo) * rng());
    const isInt = Number.isInteger(base);
    let v = isInt ? Math.round(scaled) : Math.round(scaled * 1000) / 1000;
    if (base > 0) v = Math.max(isInt ? 1 : 0.05, v);
    out[k] = v;
  }
  // keep dependent params coherent after jitter
  if (typeof out.foeMin === "number" && typeof out.foeMax === "number" && out.foeMin > out.foeMax) {
    const t = out.foeMin; out.foeMin = out.foeMax; out.foeMax = t;
  }
  if (typeof out.minLen === "number" && typeof out.maxLen === "number" && out.maxLen < out.minLen) out.maxLen = out.minLen;
  if (typeof out.floors === "number") out.floors = Math.max(3, Math.min(7, out.floors));
  if (typeof out.capacity === "number") out.capacity = Math.max(1, Math.min(4, out.capacity));
  if (key === "grill" && typeof out.slots === "number") out.slots = Math.max(3, Math.min(5, out.slots));
  if (key === "firewatch") {
    out.cols = Math.max(5, Math.min(8, out.cols));
    out.rows = Math.max(6, Math.min(10, out.rows));
    // the board must never start already lost, and must stay winnable
    out.maxFires = Math.max(8, Math.min(Math.floor(out.cols * out.rows * 0.45), out.maxFires));
  }
  if (key === "powergrid" && typeof out.band === "number") out.band = Math.max(0.07, Math.min(0.16, out.band));
  return out;
}

const ADJECTIVES = [
  "Hyper", "Velvet", "Turbo", "Silent", "Wild", "Lucid", "Static", "Golden", "Feral", "Chrome",
  "Midnight", "Solar", "Frantic", "Hollow", "Radiant", "Savage", "Quantum", "Drowsy", "Electric", "Paper"
];

function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

// ---------- archetype registry ----------

const HAZARD = "#ff5d73";
const ARCH = [
  {
    key: "avoider", genre: "survival", mechanic: "omni-directional dodge & collect", emoji: "\uD83D\uDEF8", orient: "any",
    build: buildAvoider, nouns: ["Drift", "Swarm", "Rift", "Field", "Vortex", "Pulse"],
    controls: "Drag / Arrow keys to move",
    how: "Glide to dodge the incoming shards and scoop the glowing motes. One hit and it's over.",
    params: (b) => ({ r: 14, follow: 16, kspeed: 340 + b.fast * 120, foeSpeed: 130 + b.fast * 60, foeMin: 8, foeMax: 16, ramp: 10, spawn: 0.9 - b.fast * 0.2, grace: 1.3, moteR: 9, motes: 3, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
  },
  {
    key: "flapper", genre: "reflex", mechanic: "tap-to-flap through gaps", emoji: "\uD83E\uDEBD", orient: "portrait",
    build: buildFlapper, nouns: ["Ascent", "Hop", "Glide", "Flutter", "Skip", "Leap"],
    controls: "Tap / Space to flap",
    how: "Tap (or Space) to flap and thread every gap. Touch a wall or the floor and you're done.",
    params: (b) => ({ r: 15, grav: 1500, flap: -430, vmax: 620, scroll: 150 + b.fast * 50, ramp: 6, gap: 190 - b.fast * 20, gapX: 240, wallW: 58, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
  },
  {
    key: "lane", genre: "arcade", mechanic: "lane-switch dodge & collect", emoji: "\uD83D\uDEE3\uFE0F", orient: "portrait",
    build: buildLane, nouns: ["Lanes", "Runner", "Shift", "Dash", "Sprint", "Rush"],
    controls: "Swipe / Arrows to switch lanes",
    how: "Swipe or use arrows to switch lanes. Grab the orbs, dodge the spikes.",
    params: (b) => ({ lanes: 3 + (b.rng() < 0.4 ? 1 : 0), pr: 22, slide: 16, itemR: 18, fall: 230 + b.fast * 70, ramp: 12, spawn: 0.85 - b.fast * 0.15, badChance: 0.5, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
  },
  {
    key: "paddle", genre: "arcade", mechanic: "endless brick-breaker", emoji: "\uD83E\uDDF1", orient: "landscape",
    build: buildPaddle, nouns: ["Breaker", "Rebound", "Volley", "Deflect", "Bricks", "Bounce"],
    controls: "Drag / Arrows to move the paddle",
    how: "Bounce the ball to shatter every brick. Clear a wave and a denser one drops. Miss the ball and it's over.",
    params: (b) => ({ pw: 118, pspeed: 620, pmargin: 40, br: 9, bspeed: 300 + b.fast * 60, ramp: 0.03, cols: 8, rowsMax: 6, bh: 20, serve: 1.1, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
  },
  {
    key: "stacker", genre: "timing", mechanic: "precision block stacking", emoji: "\uD83C\uDFD7\uFE0F", orient: "portrait",
    build: buildStacker, nouns: ["Tower", "Stack", "Spire", "Heights", "Climb", "Blocks"],
    controls: "Tap / Space to drop",
    how: "Tap to drop each block on the one below. Overhang gets sliced off \u2014 miss completely and the tower falls.",
    params: (b) => ({ startW: 150, bh: 30, speed: 190 + b.fast * 70, rampPx: 6, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
  },
  {
    key: "reflex", genre: "reflex", mechanic: "color-target tap test", emoji: "\uD83C\uDFAF", orient: "any",
    build: buildReflex, nouns: ["Targets", "Reflex", "Snap", "Tap", "Focus", "Reaction"],
    controls: "Tap / Click the good rings",
    how: "Tap the glowing rings before they fade. Never tap a crossed one, and don't let too many good ones slip away.",
    params: (b) => ({ tr: 34, life: 1.7 - b.fast * 0.3, spawn: 0.8 - b.fast * 0.15, badChance: 0.28, maxMiss: 5, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
  },
  {
    key: "sorter", genre: "simulation", mechanic: "recycling line sorting", emoji: "\u267B\uFE0F", orient: "portrait",
    build: buildSorter, nouns: ["Sorting Line", "Recycling Run", "Waste Shift", "Depot", "Materials Yard", "Sorting Plant"],
    controls: "Tap a bin / Arrows to steer the chute",
    how: "You're running the sorting line at a recycling plant. Steer each item down the chute into the matching bin \u2014 three missorts and the line shuts down.",
    params: (b) => ({
      fall: 150 + b.fast * 60, ramp: 5, steer: 8, spawn: 1.1 - b.fast * 0.2, itemR: 17, maxStrikes: 3,
      cats: [{ n: "PAPER", c: b.pal.accent }, { n: "GLASS", c: b.pal.accent2 }, { n: "METAL", c: "#f6c453" }],
      accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  },
  {
    key: "elevator", genre: "simulation", mechanic: "elevator dispatch", emoji: "\uD83D\uDED7", orient: "portrait",
    build: buildElevator, nouns: ["Tower Shift", "Lift Duty", "High Rise", "Service Call", "The Lobby", "Night Shift"],
    controls: "Up/Down arrows, swipe, or tap above/below the car",
    how: "You're the lift operator in a busy tower. Collect waiting people and drop them at their floor before anyone's patience runs out.",
    params: (b) => ({
      floors: 5, carSpeed: 6 + b.fast * 3, capacity: 3, patience: 13 - b.fast * 3, spawn: 3.4 - b.fast * 0.8,
      maxWaiting: 6, shaftW: 74, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  },
  {
    key: "traffic", genre: "simulation", mechanic: "junction signal control", emoji: "\uD83D\uDEA6", orient: "any",
    build: buildTraffic, nouns: ["Junction", "Rush Hour", "Crossroads", "Gridlock", "Signal Box", "Downtown"],
    controls: "Tap / Space to switch the lights",
    how: "You control the lights at a busy crossroads. Switch which road gets the green \u2014 let two streams into the junction at once and they crash.",
    params: (b) => ({
      roadW: 86, carSpeed: 105 + b.fast * 45, ramp: 3, spawn: 1.25 - b.fast * 0.25, patience: 7 - b.fast * 1.5,
      maxCars: 14, switchLock: 0.45, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  },
  {
    key: "barista", genre: "simulation", mechanic: "cafe order assembly", emoji: "\u2615", orient: "portrait",
    build: buildBarista, nouns: ["Morning Rush", "Espresso Bar", "The Counter", "Open Late", "Corner Cafe", "Last Order"],
    controls: "Tap the ingredients / Arrow keys",
    how: "You're on bar during the morning rush. Build each drink by adding its ingredients in the exact order on the ticket, before the customer walks.",
    params: (b) => ({
      ing: [{ n: "ESPRESSO", c: "#c98a5b" }, { n: "MILK", c: "#f4f1ea" }, { n: "SYRUP", c: b.pal.accent }, { n: "FOAM", c: b.pal.accent2 }],
      minLen: 2, maxLen: 5, time: 3.2, perItem: 1.5 - b.fast * 0.3, penalty: 1.1, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  },
  {
    key: "grill", genre: "simulation", mechanic: "short-order grill timing", emoji: "\uD83C\uDF54", orient: "portrait",
    build: buildGrill, nouns: ["Short Order", "The Pass", "Diner Rush", "Line Cook", "Grill Shift", "Table Six"],
    controls: "Tap a grill slot / Arrow keys",
    how: "You're on the grill during service. Pull each patty in its window \u2014 too early is raw, too late is burnt. Three ruined and service is over.",
    params: (b) => ({
      slots: 4, cook: 3.4 - b.fast * 0.8, window: 0.42, spawn: 1.9 - b.fast * 0.4, pattyR: 22, maxStrikes: 3,
      accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  },
  {
    key: "firewatch", genre: "simulation", mechanic: "wildfire containment", emoji: "\uD83D\uDD25", orient: "any",
    build: buildFirewatch, nouns: ["Fire Watch", "Containment", "The Ridge", "Backburn", "Hotspot", "Dry Season"],
    controls: "Tap a burning tile to douse it",
    how: "You're the fire warden. Douse hotspots before they jump to neighbouring ground \u2014 let the fire get away from you and the ridge is lost.",
    params: (b) => ({
      cols: 6, rows: 8, spread: 1.5 - b.fast * 0.35, catch: 0.16, maxFires: 14,
      accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  },
  {
    key: "powergrid", genre: "simulation", mechanic: "power grid balancing", emoji: "\u26A1", orient: "any",
    build: buildPowerGrid, nouns: ["Load Balance", "The Grid", "Peak Demand", "Control Room", "Baseload", "Brownout"],
    controls: "Drag / Up-Down arrows to set output",
    how: "You're running the control room. Track demand with your generation \u2014 drift outside the tolerance band and the grid destabilises into a blackout.",
    params: (b) => ({
      w1: 0.55 + b.fast * 0.35, w2: 1.35 + b.fast * 0.5, band: 0.1, rate: 0.55, follow: 9,
      drain: 0.22 + b.fast * 0.10, recover: 0.22, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD
    })
  }
];

// ---------- helpers ----------

function mulberry32(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());
const dims = (o, b) => o === "portrait" ? { w: 480, h: 720 } : o === "landscape" ? { w: 720, h: 480 } : { w: b.width || 480, h: b.height || 720 };

function emit(meta, P, build) {
  return "window.GAME = {\n  meta: " + JSON.stringify(meta, null, 2).replace(/\n/g, "\n  ") +
    ",\n  create: function (engine) {\n    var P = " + JSON.stringify(P) + ";\n    var build = " + build.toString() +
    ";\n    return build(engine, P);\n  }\n};\n";
}

// Pick an archetype + fill a brief -> return { code, meta }. `variant` reshuffles on retry.
export function generateGameProc(brief, variant = 0) {
  const seed = (((brief.seed >>> 0) || 1) + variant * 0x9E3779B1) >>> 0;
  const rng = mulberry32(seed);
  const pick = (a) => a[Math.floor(rng() * a.length)];

  const avoid = brief.avoid || [];

  // Strict least-recently-used rotation. Previously this only skipped the last 3
  // mechanics, so with 6 archetypes a repeat could land on the 4th game. Now every
  // archetype is ranked by how long since it last shipped and the most overdue one
  // wins, which cycles through all of them before any repeats.
  const lastUsed = new Map();
  avoid.forEach((g, i) => { const m = norm(g.mechanic); if (m && !lastUsed.has(m)) lastUsed.set(m, i); });
  const ranked = ARCH
    .map((a) => {
      const m = norm(a.mechanic);
      // never-shipped archetypes sort first, with a random tiebreak between them
      const age = lastUsed.has(m) ? lastUsed.get(m) : 1e6 + rng() * 1000;
      return { a, age };
    })
    .sort((x, y) => y.age - x.age)
    .map((x) => x.a);
  // variant 0 takes only the most overdue archetype; retries widen the pool so a
  // failing archetype can be swapped out rather than retried forever.
  const a = ranked[Math.floor(rng() * Math.min(ranked.length, 1 + variant))];

  const pal = brief.palette || { accent: "#6ee7ff", accent2: "#a78bfa", bg: "#070b1a" };
  const fast = { playful: 0.2, cheerful: 0.2, meditative: 0, satisfying: 0.3, mysterious: 0.2, hypnotic: 0.3, tense: 0.6, frantic: 0.9 }[brief.mood] ?? 0.3;
  const P = jitterParams(a.key, a.params({ pal, rng, fast }), rng);

  // Titles must not collide with anything already in the gallery.
  const usedTitles = new Set(avoid.map((g) => norm(g.title)));
  const themeWords = String(brief.theme || "neon").split(/[^A-Za-z]+/).filter(Boolean).map(titleCase);
  const prefixes = shuffled(themeWords.concat(ADJECTIVES), rng);
  const nouns = shuffled(a.nouns, rng);
  let title = "";
  for (const n of nouns) { for (const p of prefixes) { const t = p + " " + n; if (!usedTitles.has(norm(t))) { title = t; break; } } if (title) break; }
  if (!title) title = titleCase(String(brief.theme || "neon").split(/\s+/)[0]) + " " + pick(a.nouns) + " " + (avoid.length + 1);

  const d = dims(a.orient, brief);
  const usedTaglines = new Set(avoid.slice(0, 6).map((g) => norm(g.tagline)));
  const taglines = shuffled([
    "One more run.", "Pure reflex.", "Chase the high score.", "Don't blink.", "Simple. Ruthless.",
    "Flow state, unlocked.", "How long can you last?", "Easy to learn. Hard to master.",
    "Just one more try.", "Reflexes required.", "Deceptively simple.", "Push your luck.",
    "Find the rhythm.", "Nerves of steel.", "Blink and it's over.", "Master the timing."
  ], rng);
  const tagline = taglines.find((t) => !usedTaglines.has(norm(t))) || taglines[0];
  const meta = {
    title,
    tagline,
    description: title + " \u2014 a " + brief.theme + " " + a.mechanic + " game. " + a.how,
    instructions: a.how + " " + a.controls + ".",
    controls: a.controls,
    accent: pal.accent, accent2: pal.accent2, bg: pal.bg,
    width: d.w, height: d.h,
    genre: a.genre, mechanic: a.mechanic, theme: brief.theme || "neon",
    tags: [a.genre, a.key, "arcade", (brief.mood || "fun")].filter(Boolean).slice(0, 5),
    emoji: a.emoji
  };
  return { code: emit(meta, P, a.build), meta, archetype: a.key };
}

export const ARCHETYPE_KEYS = ARCH.map((a) => a.key);
