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
  function reset() { me = { x: W / 2, y: H / 2, r: P.r }; foes = []; motes = []; spawnT = 0.3; t = 0; }
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
  var paddle, ball, bricks, t, wave;
  function makeBricks() {
    bricks = []; wave++; var cols = P.cols, rows = Math.min(P.rowsMax, 2 + wave), gap = 6, bw = (W - gap * (cols + 1)) / cols, bh = P.bh;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) bricks.push({ x: gap + c * (bw + gap), y: 44 + r * (bh + gap), w: bw, h: bh });
  }
  function reset() { paddle = { x: W / 2, w: P.pw }; ball = { x: W / 2, y: H * 0.6, vx: P.bspeed * (engine.chance(0.5) ? 1 : -1), vy: -P.bspeed, r: P.br }; t = 0; wave = 0; makeBricks(); }
  function over() { S.hit(); engine.shake(16); engine.particles.burst(ball.x, ball.y, { count: 30, color: P.hazard, speed: 200, life: 0.6, gravity: 120 }); engine.gameOver(); }
  return {
    setup: reset, reset: reset,
    update: function (dt) {
      t += dt;
      if (input.pointer.down) paddle.x = input.pointer.x;
      var d = input.dir().x; if (d) paddle.x += d * P.pspeed * dt;
      paddle.x = engine.clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
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
  reflex: { life: [0.82, 1.22], spawn: [0.75, 1.30], tr: [0.85, 1.25], badChance: [0.75, 1.35], maxMiss: [0.80, 1.40] }
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
    params: (b) => ({ r: 14, follow: 16, kspeed: 340 + b.fast * 120, foeSpeed: 130 + b.fast * 60, foeMin: 8, foeMax: 16, ramp: 10, spawn: 0.9 - b.fast * 0.2, moteR: 9, motes: 3, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
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
    params: (b) => ({ pw: 118, pspeed: 620, pmargin: 40, br: 9, bspeed: 300 + b.fast * 60, ramp: 0.03, cols: 8, rowsMax: 6, bh: 20, accent: b.pal.accent, accent2: b.pal.accent2, hazard: HAZARD })
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
