/* Voidfall — seed game (hand-crafted reference for the premium quality bar).
 * Slide to dodge falling shards and scoop glowing orbs. One hit ends the run. */
window.GAME = {
  meta: {
    title: "Voidfall",
    tagline: "Ride the neon rain.",
    description: "Slide through a storm of neon shards, scoop glowing orbs, and survive as the void speeds up.",
    instructions: "Drag anywhere (or use \u2190 \u2192 / A D) to steer. Catch orbs, dodge shards \u2014 one hit ends the run.",
    controls: "Drag / Arrow keys to steer",
    accent: "#6ee7ff", accent2: "#a78bfa", bg: "#070b1a",
    width: 480, height: 720,
    genre: "dodge", mechanic: "free-horizontal dodge-and-collect", theme: "neon void",
    tags: ["arcade", "dodge", "reflex", "neon"]
  },
  create: function (engine) {
    var W = engine.width, H = engine.height, input = engine.input, S = engine.sound;
    var ship, items, stars, spawnT, speed, elapsed;

    function reset() {
      ship = { x: W / 2, y: H - 96, r: 16, tx: W / 2 };
      items = []; spawnT = 0; speed = 190; elapsed = 0;
      if (!stars) { stars = []; for (var i = 0; i < 60; i++) stars.push({ x: engine.rand(0, W), y: engine.rand(0, H), z: engine.rand(0.3, 1) }); }
    }
    function spawn() {
      var isOrb = engine.chance(0.42);
      items.push({ x: engine.rand(28, W - 28), y: -26, r: isOrb ? 11 : 14, orb: isOrb, rot: engine.rand(0, 6),
        vy: speed * (isOrb ? 0.9 : 1) * engine.rand(0.9, 1.25) });
    }
    return {
      setup: reset, reset: reset,
      update: function (dt) {
        elapsed += dt; speed = 190 + elapsed * 7;
        if (input.pointer.down) ship.tx = input.pointer.x;
        var d = input.dir().x; if (d) ship.tx = engine.clamp(ship.tx + d * 440 * dt, 20, W - 20);
        ship.x += (ship.tx - ship.x) * Math.min(1, dt * 14);
        ship.x = engine.clamp(ship.x, 20, W - 20);
        for (var s = 0; s < stars.length; s++) { var st = stars[s]; st.y += (30 + st.z * 60) * dt; if (st.y > H) { st.y = -4; st.x = engine.rand(0, W); } }
        spawnT -= dt; var rate = Math.max(0.17, 0.7 - elapsed * 0.012);
        if (spawnT <= 0) { spawn(); spawnT = rate; }
        for (var i = items.length - 1; i >= 0; i--) {
          var it = items[i]; it.y += it.vy * dt; it.rot += dt * 3;
          if (engine.dist(it.x, it.y, ship.x, ship.y) < it.r + ship.r - 3) {
            if (it.orb) { engine.addScore(5); S.coin(); engine.particles.burst(it.x, it.y, { count: 16, color: "#ffe27a", speed: 150, life: 0.5, gravity: 40 }); items.splice(i, 1); continue; }
            S.hit(); engine.shake(18);
            engine.particles.burst(ship.x, ship.y, { count: 36, color: "#ff5d73", speed: 230, life: 0.7, gravity: 120 });
            engine.gameOver(); return;
          }
          if (it.y > H + 30) { if (!it.orb) engine.addScore(1); items.splice(i, 1); }
        }
      },
      render: function (ctx) {
        for (var s = 0; s < stars.length; s++) { var st = stars[s]; ctx.globalAlpha = 0.25 + st.z * 0.5; ctx.fillStyle = "#9fb4ff"; ctx.fillRect(st.x, st.y, st.z * 2, st.z * 2); }
        ctx.globalAlpha = 1;
        for (var i = 0; i < items.length; i++) {
          var it = items[i]; ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
          if (it.orb) {
            ctx.shadowColor = "#ffe27a"; ctx.shadowBlur = 18; ctx.fillStyle = "#ffe27a";
            ctx.beginPath(); ctx.arc(0, 0, it.r, 0, 6.283); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.85)";
            ctx.beginPath(); ctx.arc(-3, -3, it.r * 0.4, 0, 6.283); ctx.fill();
          } else {
            ctx.shadowColor = "#ff5d73"; ctx.shadowBlur = 16; ctx.fillStyle = "#ff5d73";
            ctx.beginPath();
            for (var k = 0; k < 3; k++) { var a = k * 2.094; var fn = k ? "lineTo" : "moveTo"; ctx[fn](Math.cos(a) * it.r, Math.sin(a) * it.r); }
            ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
        ctx.save(); ctx.translate(ship.x, ship.y); ctx.shadowColor = "#6ee7ff"; ctx.shadowBlur = 20;
        var grd = ctx.createLinearGradient(0, -18, 0, 18); grd.addColorStop(0, "#6ee7ff"); grd.addColorStop(1, "#a78bfa");
        ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(15, 16); ctx.lineTo(0, 8); ctx.lineTo(-15, 16); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    };
  }
};
