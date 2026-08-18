// Renders the Game Studio gallery from games.json — pure vanilla JS, no dependencies.
(function () {
  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var stat = document.getElementById("stat");
  var search = document.getElementById("search");
  var all = [];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function isNew(d) { if (!d) return false; var t = new Date(); var g = new Date(d); return (t - g) / 86400000 < 1.2; }

  function card(g, i) {
    var slug = g.slug || g.id;
    var href = "games/" + slug + "/";
    var a = document.createElement("a");
    a.className = "card"; a.href = href;
    a.style.setProperty("--a", g.accent || "#6ee7ff");
    a.style.setProperty("--b", g.accent2 || "#a78bfa");
    a.style.animationDelay = Math.min(i * 45, 500) + "ms";
    var chips = (g.tags || []).slice(0, 3).map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("");
    a.innerHTML =
      '<div class="screen" style="--sbg:' + esc(g.bg || "#070b1a") + '">' +
        (isNew(g.date) ? '<span class="badge">NEW</span>' : "") +
        '<span class="glyph">' + esc(g.emoji || "\uD83C\uDFAE") + "</span>" +
        '<span class="play">Play &#9654;</span>' +
      "</div>" +
      '<div class="meta">' +
        '<p class="title">' + esc(g.title || slug) + "</p>" +
        '<p class="tag">' + esc(g.tagline || g.description || "") + "</p>" +
        '<div class="chiprow">' + chips + '<span class="date">' + esc(g.date || "") + "</span></div>" +
      "</div>";
    return a;
  }

  function render(list) {
    grid.innerHTML = "";
    empty.classList.toggle("hidden", list.length > 0);
    list.forEach(function (g, i) { grid.appendChild(card(g, i)); });
  }

  function apply() {
    var q = (search.value || "").trim().toLowerCase();
    if (!q) return render(all);
    var f = all.filter(function (g) {
      return [g.title, g.tagline, g.genre, g.mechanic, g.theme, (g.tags || []).join(" ")]
        .join(" ").toLowerCase().indexOf(q) >= 0;
    });
    render(f);
  }

  // GitHub Pages' CDN caches games.json for 10 min, so a freshly merged game can
  // appear "missing". A per-minute cache-buster makes the URL unique to the edge.
  fetch("games.json?v=" + Math.floor(Date.now() / 60000), { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      all = (data.games || []).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || "") || (b.id || "").localeCompare(a.id || ""); });
      stat.textContent = all.length + (all.length === 1 ? " game" : " games") + " and counting";
      render(all);
      search.addEventListener("input", apply);
    })
    .catch(function (e) {
      stat.textContent = "";
      empty.classList.remove("hidden");
      empty.textContent = "Could not load the game list yet — check back after the next drop.";
    });
})();
