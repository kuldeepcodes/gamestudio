/* GameStudio engine — a compact, dependency-free arcade runtime.
 * It owns the premium shell: responsive canvas, game loop, scenes (title/play/pause/over),
 * score + best (localStorage), keyboard + touch input, WebAudio SFX, particles and screen shake.
 * A game is a small module on window.GAME = { meta, create(engine) -> instance }.
 * The instance may implement: setup(), reset(), update(dt), render(ctx), onResize(w,h).
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var dist = function (x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); };
  function makeRng(seed) {
    var s = (seed >>> 0) || 123456789;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var Sound = (function () {
    var ctx = null, muted = false;
    try { muted = localStorage.getItem("gs:muted") === "1"; } catch (e) {}
    function ensure() {
      if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      if (ctx && ctx.state === "suspended") { ctx.resume(); }
    }
    function tone(freq, dur, type, vol, slideTo) {
      if (muted) return; ensure(); if (!ctx) return;
      var t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    return {
      ensure: ensure,
      isMuted: function () { return muted; },
      setMuted: function (v) { muted = v; try { localStorage.setItem("gs:muted", v ? "1" : "0"); } catch (e) {} },
      blip: function () { tone(520, 0.08, "square", 0.10, 680); },
      hit: function () { tone(170, 0.16, "sawtooth", 0.16, 80); },
      coin: function () { tone(740, 0.07, "square", 0.10); setTimeout(function () { tone(988, 0.10, "square", 0.10); }, 70); },
      power: function () { tone(392, 0.10, "triangle", 0.13); setTimeout(function () { tone(659, 0.12, "triangle", 0.13); }, 90); },
      jump: function () { tone(420, 0.12, "square", 0.11, 760); },
      over: function () { tone(300, 0.5, "sawtooth", 0.17, 60); },
      tick: function () { tone(880, 0.03, "square", 0.06); },
      tone: tone
    };
  })();

  function Particles() {
    var ps = [];
    return {
      burst: function (x, y, o) {
        o = o || {}; var n = o.count || 14;
        for (var i = 0; i < n; i++) {
          var a = (o.angle == null) ? Math.random() * 6.283 : o.angle + (Math.random() - 0.5) * (o.spread || 6.283);
          var sp = (o.speed || 130) * (0.4 + Math.random() * 0.9);
          ps.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: o.life || 0.6, age: 0,
            size: o.size || 3, color: o.color || "#fff", g: o.gravity == null ? 220 : o.gravity });
        }
      },
      update: function (dt) {
        for (var i = ps.length - 1; i >= 0; i--) {
          var p = ps[i]; p.age += dt;
          if (p.age >= p.life) { ps.splice(i, 1); continue; }
          p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        }
      },
      render: function (ctx) {
        for (var i = 0; i < ps.length; i++) {
          var p = ps[i], k = 1 - p.age / p.life;
          ctx.globalAlpha = Math.max(0, k); ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * k), 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      clear: function () { ps.length = 0; }
    };
  }

  function Input(canvas, getLogical) {
    var down = {}, pressed = {};
    var pointer = { x: 0, y: 0, down: false, justDown: false, justUp: false, dx: 0, dy: 0 };
    var swipe = null, sx = 0, sy = 0, stime = 0;
    var map = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
      ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
      Space: "action", Enter: "action", KeyK: "action2", KeyJ: "action" };
    addEventListener("keydown", function (e) {
      var k = map[e.code]; if (k) { if (!down[k]) pressed[k] = true; down[k] = true;
        if (k !== "action2") e.preventDefault(); }
    });
    addEventListener("keyup", function (e) { var k = map[e.code]; if (k) down[k] = false; });
    function toLogical(cx, cy) {
      var r = canvas.getBoundingClientRect(), L = getLogical();
      var w = r.width || 1, h = r.height || 1;
      return { x: (cx - r.left) / w * L.w, y: (cy - r.top) / h * L.h };
    }
    function dn(e) { var t = e.touches ? e.touches[0] : e; var p = toLogical(t.clientX, t.clientY);
      pointer.x = p.x; pointer.y = p.y; pointer.down = true; pointer.justDown = true;
      sx = p.x; sy = p.y; stime = performance.now(); if (e.cancelable) e.preventDefault(); }
    function mv(e) { if (!pointer.down && !e.touches) return; var t = e.touches ? e.touches[0] : e;
      var p = toLogical(t.clientX, t.clientY); pointer.dx = p.x - pointer.x; pointer.dy = p.y - pointer.y;
      pointer.x = p.x; pointer.y = p.y; if (e.cancelable) e.preventDefault(); }
    function up(e) { pointer.down = false; pointer.justUp = true;
      var d = performance.now() - stime, dx = pointer.x - sx, dy = pointer.y - sy;
      if (d < 520 && Math.hypot(dx, dy) > 26) {
        swipe = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      }
      if (e && e.cancelable) e.preventDefault(); }
    canvas.addEventListener("mousedown", dn); addEventListener("mousemove", mv); addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", dn, { passive: false });
    canvas.addEventListener("touchmove", mv, { passive: false });
    canvas.addEventListener("touchend", up, { passive: false });
    var api = {
      isDown: function (k) { return !!down[k]; },
      justPressed: function (k) { return !!pressed[k]; },
      pointer: pointer,
      dir: function () { return { x: (down.right ? 1 : 0) - (down.left ? 1 : 0), y: (down.down ? 1 : 0) - (down.up ? 1 : 0) }; },
      consumeSwipe: function () { var s = swipe; swipe = null; return s; },
      _end: function () { for (var k in pressed) delete pressed[k]; pointer.justDown = false; pointer.justUp = false; pointer.dx = 0; pointer.dy = 0; }
    };
    return api;
  }

  var Shell = {
    boot: function (GAME) {
      var meta = Object.assign({ title: "Game", tagline: "", instructions: "", accent: "#6ee7ff",
        accent2: "#a78bfa", bg: "#0b1020", width: 480, height: 720 }, (GAME && GAME.meta) || {});
      var parts = location.pathname.split("/").filter(Boolean);
      var id = meta.id || parts[parts.length - 2] || meta.title;
      var rs = document.documentElement.style;
      rs.setProperty("--accent", meta.accent); rs.setProperty("--accent2", meta.accent2);
      rs.setProperty("--bg", meta.bg); rs.setProperty("--aspect", meta.width + "/" + meta.height);
      document.title = meta.title + " \u00b7 Game Studio";
      $("hudTitle").textContent = meta.title;
      $("titleName").textContent = meta.title;
      $("titleTag").textContent = meta.tagline;
      $("titleHow").textContent = meta.instructions;
      $("controlHint").innerHTML = (meta.controls || "Arrow keys / WASD / Swipe &nbsp;\u00b7&nbsp; Space / Tap to act") + "<br>P pause &nbsp;\u00b7&nbsp; M mute";
      $("madeTag").textContent = meta.date ? ("generated " + meta.date) : "auto-generated";

      var canvas = $("game"), ctx = canvas.getContext("2d");
      var W = meta.width, H = meta.height, dpr = 1;
      function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (game && game.onResize) { try { game.onResize(W, H); } catch (e) {} }
      }
      var particles = Particles();
      var input = Input(canvas, function () { return { w: W, h: H }; });
      var rng = makeRng((meta.seed || Date.now()) >>> 0);
      var best = 0; try { best = parseInt(localStorage.getItem("gs:hi:" + id) || "0", 10) || 0; } catch (e) {}
      $("best").textContent = best; $("finalBest").textContent = best;

      var shake = 0, scene = "title";
      var engine = {
        canvas: canvas, ctx: ctx, width: W, height: H, W: W, H: H,
        input: input, particles: particles, sound: Sound, rng: rng,
        clamp: clamp, lerp: lerp, dist: dist,
        rand: function (a, b) { return a + (b - a) * rng(); },
        randInt: function (a, b) { return Math.floor(a + (b - a + 1) * rng()); },
        chance: function (p) { return rng() < p; },
        pick: function (arr) { return arr[Math.floor(rng() * arr.length)]; },
        score: 0, best: best,
        addScore: function (n) { this.score += n; $("score").textContent = this.score; },
        setScore: function (n) { this.score = n; $("score").textContent = this.score; },
        shake: function (a) { shake = Math.max(shake, a || 8); },
        gameOver: function () {
          if (scene !== "playing") return; setScene("over"); Sound.over();
          if (this.score > best) { best = this.score; try { localStorage.setItem("gs:hi:" + id, String(best)); } catch (e) {} }
          this.best = best; $("finalScore").textContent = this.score;
          $("finalBest").textContent = best; $("best").textContent = best;
        }
      };

      var game = GAME.create(engine);

      function setScene(s) {
        scene = s;
        $("overlayTitle").classList.toggle("hidden", s !== "title");
        $("overlayPause").classList.toggle("hidden", s !== "paused");
        $("overlayOver").classList.toggle("hidden", s !== "over");
      }
      function start() {
        engine.setScore(0); particles.clear(); shake = 0;
        (game.reset || game.setup || function () {}).call(game);
        setScene("playing"); Sound.ensure();
      }
      $("playBtn").onclick = function () { Sound.ensure(); start(); };
      $("againBtn").onclick = function () { start(); };
      $("resumeBtn").onclick = function () { setScene("playing"); };
      $("restartBtn").onclick = function () { start(); };
      $("pauseBtn").onclick = function () { if (scene === "playing") setScene("paused"); else if (scene === "paused") setScene("playing"); };
      var muteBtn = $("muteBtn");
      function syncMute() { muteBtn.classList.toggle("off", Sound.isMuted()); muteBtn.textContent = Sound.isMuted() ? "\uD83D\uDD07" : "\u266A"; }
      muteBtn.onclick = function () { Sound.setMuted(!Sound.isMuted()); syncMute(); }; syncMute();
      addEventListener("keydown", function (e) {
        if (e.code === "KeyP") { if (scene === "playing") setScene("paused"); else if (scene === "paused") setScene("playing"); }
        else if (e.code === "KeyM") { Sound.setMuted(!Sound.isMuted()); syncMute(); }
        else if (e.code === "Space" || e.code === "Enter") { if (scene === "title" || scene === "over") start(); }
      });

      if (game.setup) { try { game.setup(); } catch (e) { console.error(e); } }
      resize(); addEventListener("resize", resize);
      setScene("title");

      var last = performance.now();
      function frame(now) {
        var dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
        if (scene === "playing") { try { game.update(dt); } catch (err) { console.error(err); } particles.update(dt); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        var didShake = false;
        if (shake > 0) { didShake = true; var ox = (rng() * 2 - 1) * shake, oy = (rng() * 2 - 1) * shake;
          shake *= 0.86; if (shake < 0.4) shake = 0; ctx.save(); ctx.translate(ox, oy); }
        try { game.render(ctx); } catch (err) { console.error(err); }
        particles.render(ctx);
        if (didShake) ctx.restore();
        input._end();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  };
  window.GameShell = Shell;
})();
