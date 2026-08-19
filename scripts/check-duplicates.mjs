// Audit the gallery for near-duplicate games.
//
// Two games of the same archetype embed a byte-identical algorithm and differ only in their
// params and active rule modifiers, so "different game" has to be measured rather than
// assumed. This reports the most similar pairs and exits non-zero if any pair is at or over
// the same threshold the generator uses to reject a candidate.
//
//   node scripts/check-duplicates.mjs            # audit games.json
//   node scripts/check-duplicates.mjs 0.6        # stricter threshold
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint, similarity } from "./lib/fingerprint.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const threshold = Number(process.argv[2] || 0.62);
const manifest = JSON.parse(fs.readFileSync(path.join(root, "games.json"), "utf8"));

const games = [];
for (const g of manifest.games || []) {
  const p = path.join(root, "games", g.slug, "game.js");
  if (!fs.existsSync(p)) { console.log(`  ! ${g.slug} has no game.js`); continue; }
  games.push({ slug: g.slug, title: g.title, mechanic: g.mechanic, fp: fingerprint(fs.readFileSync(p, "utf8")) });
}

const pairs = [];
for (let i = 0; i < games.length; i++) {
  for (let j = i + 1; j < games.length; j++) {
    const s = similarity(games[i].fp, games[j].fp);
    if (s > 0) pairs.push({ s, a: games[i], b: games[j] });
  }
}
pairs.sort((x, y) => y.s - x.s);

console.log(`${games.length} games, ${new Set(games.map((g) => g.fp.algoHash)).size} distinct algorithms, ` +
            `${new Set(games.map((g) => g.fp.algoHash + "|" + g.fp.modSig)).size} distinct algorithm+rule combinations\n`);

if (!pairs.length) {
  console.log("No two games share an algorithm — every game is structurally unique.");
} else {
  console.log("pairs sharing an algorithm (1.000 = indistinguishable):");
  for (const p of pairs.slice(0, 12)) {
    console.log(`  ${p.s.toFixed(3)}  ${p.a.title} vs ${p.b.title}${p.s >= threshold ? "   <-- TOO SIMILAR" : ""}`);
    console.log(`         rules: [${p.a.fp.modSig}] vs [${p.b.fp.modSig}]`);
  }
}

const over = pairs.filter((p) => p.s >= threshold);
console.log(`\npairs at or over the ${threshold} threshold: ${over.length}`);
if (over.length) {
  console.log("The generator would reject a new candidate this similar. Existing entries predate the");
  console.log("check, or the archetype x rule-set space is exhausted — consider adding an archetype.");
  process.exitCode = 1;
}

