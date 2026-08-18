window.GAME = {
  meta: {
    "title": "Moonlit Bounce",
    "tagline": "One more run.",
    "description": "Moonlit Bounce — a moonlit rooftops endless brick-breaker game. Bounce the ball to shatter every brick. Clear a wave and a denser one drops. Miss the ball and it's over.",
    "instructions": "Bounce the ball to shatter every brick. Clear a wave and a denser one drops. Miss the ball and it's over. Drag / Arrows to move the paddle.",
    "controls": "Drag / Arrows to move the paddle",
    "accent": "#6ee7ff",
    "accent2": "#a78bfa",
    "bg": "#070b1a",
    "width": 720,
    "height": 480,
    "genre": "arcade",
    "mechanic": "endless brick-breaker",
    "theme": "moonlit rooftops",
    "tags": [
      "arcade",
      "paddle",
      "arcade",
      "satisfying"
    ],
    "emoji": "🧱"
  },
  create: function (engine) {
    var P = {"pw":118,"pspeed":620,"pmargin":40,"br":9,"bspeed":318,"ramp":0.03,"cols":8,"rowsMax":6,"bh":20,"accent":"#6ee7ff","accent2":"#a78bfa","hazard":"#ff5d73"};
    var build = function buildPaddle(engine, P) {
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
};
    return build(engine, P);
  }
};
