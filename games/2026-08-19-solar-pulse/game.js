window.GAME = {
  meta: {
    "title": "Solar Pulse",
    "tagline": "How long can you last?",
    "description": "Solar Pulse — a underwater bioluminescence omni-directional dodge & collect game. Glide to dodge the incoming shards and scoop the glowing motes. One hit and it's over.",
    "instructions": "Glide to dodge the incoming shards and scoop the glowing motes. One hit and it's over. Drag / Arrow keys to move.",
    "controls": "Drag / Arrow keys to move",
    "accent": "#93c5fd",
    "accent2": "#f0abfc",
    "bg": "#060814",
    "width": 480,
    "height": 720,
    "genre": "survival",
    "mechanic": "omni-directional dodge & collect",
    "theme": "underwater bioluminescence",
    "tags": [
      "survival",
      "avoider",
      "arcade",
      "playful"
    ],
    "emoji": "🛸"
  },
  create: function (engine) {
    var P = {"r":13,"follow":17,"kspeed":318,"foeSpeed":183,"foeMin":7,"foeMax":21,"ramp":10,"spawn":0.743,"grace":1.3,"moteR":9,"motes":5,"accent":"#93c5fd","accent2":"#f0abfc","hazard":"#ff5d73"};
    var build = function buildAvoider(engine, P) {
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
};
    return build(engine, P);
  }
};
