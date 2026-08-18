window.GAME = {
  meta: {
    "title": "Jungle Hotspot",
    "tagline": "Pure reflex.",
    "description": "Jungle Hotspot — a jungle canopy wildfire containment game. You're the fire warden. Douse hotspots before they jump to neighbouring ground — let the fire get away from you and the ridge is lost.",
    "instructions": "You're the fire warden. Douse hotspots before they jump to neighbouring ground — let the fire get away from you and the ridge is lost. Tap a burning tile to douse it.",
    "controls": "Tap a burning tile to douse it",
    "accent": "#fb7185",
    "accent2": "#fbbf24",
    "bg": "#170608",
    "width": 480,
    "height": 720,
    "genre": "simulation",
    "mechanic": "wildfire containment",
    "theme": "jungle canopy",
    "tags": [
      "simulation",
      "firewatch",
      "arcade",
      "meditative"
    ],
    "emoji": "🔥"
  },
  create: function (engine) {
    var P = {"cols":7,"rows":8,"spread":1.592,"catch":0.154,"maxFires":14,"accent":"#fb7185","accent2":"#fbbf24","hazard":"#ff5d73"};
    var build = function buildFirewatch(engine, P) {
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
};
    return build(engine, P);
  }
};
