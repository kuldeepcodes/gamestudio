// Duplicate detection for generated games.
//
// A generated game.js embeds three things: static `meta`, a `P` params object, and the
// archetype's builder function serialised with Function.prototype.toString(). Two games of
// the same archetype therefore ship a BYTE-IDENTICAL algorithm (measured at 66-75% of the
// file) and differ only in constants — which is why a repeat can feel like the same game.
//
// This module fingerprints a candidate and scores it against everything already shipped, so
// the generator can reject a near-duplicate and try again instead of publishing it.

import crypto from "node:crypto";

// Cosmetic-only params: different colours do not make a different game.
const COSMETIC = new Set(["accent", "accent2", "bg", "hazard"]);

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// Pull the algorithm, params and rule modifiers back out of an emitted game.js.
export function fingerprint(code) {
  const src = String(code).replace(/\r\n/g, "\n");
  const pm = src.match(/var P = (\{[\s\S]*?\});\n/);
  const bm = src.match(/var build = ([\s\S]*?);\n\s*return build\(engine, P\);/);

  let params = {};
  if (pm) { try { params = JSON.parse(pm[1]); } catch (e) { params = {}; } }

  // `mods` are the active rule toggles; they change behaviour, so two games with different
  // mod sets are structurally different even though the builder source matches.
  const mods = Array.isArray(params.mods) ? params.mods.slice().sort() : [];

  const numeric = {};
  for (const [k, v] of Object.entries(params)) {
    if (COSMETIC.has(k) || k === "mods") continue;
    if (typeof v === "number" && isFinite(v)) numeric[k] = v;
  }

  return {
    algoHash: bm ? sha(bm[1]) : sha(src),
    modSig: mods.join("+") || "(none)",
    mods,
    params: numeric
  };
}

// 0 = unrelated, 1 = indistinguishable.
export function similarity(a, b) {
  if (a.algoHash !== b.algoHash) return 0;          // different archetype entirely

  const keys = [...new Set([...Object.keys(a.params), ...Object.keys(b.params)])];
  let paramSim = 1;
  if (keys.length) {
    let dist = 0;
    for (const k of keys) {
      const x = a.params[k], y = b.params[k];
      if (typeof x !== "number" || typeof y !== "number") { dist += 1; continue; }
      const scale = Math.max(Math.abs(x), Math.abs(y)) || 1;
      // treat a 40% change as "completely different" for this parameter
      dist += Math.min(1, Math.abs(x - y) / scale / 0.4);
    }
    paramSim = 1 - dist / keys.length;
  }

  // Different rule sets mean the game genuinely plays differently, so discount heavily.
  if (a.modSig !== b.modSig) {
    const overlap = a.mods.length || b.mods.length
      ? a.mods.filter((m) => b.mods.includes(m)).length / Math.max(a.mods.length, b.mods.length, 1)
      : 1;
    return paramSim * (0.25 + 0.45 * overlap);
  }
  return paramSim;
}

// Compare a candidate against every already-shipped game.
// Returns the closest match and whether it is too close to publish.
// 0.62 was chosen against real duplicates: the two games that prompted this check scored
// 0.706 and 0.654, and both are recognisably the same game with different constants.
export function checkDuplicate(candidateCode, existing, threshold = 0.62) {
  const fp = fingerprint(candidateCode);
  let worst = null;
  for (const e of existing) {
    if (!e || !e.code) continue;
    const score = similarity(fp, fingerprint(e.code));
    if (!worst || score > worst.score) worst = { score, slug: e.slug, title: e.title };
  }
  return {
    fingerprint: fp,
    closest: worst,
    score: worst ? worst.score : 0,
    tooSimilar: !!worst && worst.score >= threshold,
    threshold
  };
}
