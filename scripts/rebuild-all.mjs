// Rebuild every game's index.html from the current engine + shell.
//
// Each game is a self-contained page with the engine, shell markup and CSS inlined at
// build time, so a change to engine/ only reaches already-published games when they are
// rebuilt. Run this after editing anything in engine/.
//
//   node scripts/rebuild-all.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGame } from "./build-game.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamesDir = path.join(root, "games");

const dirs = fs.readdirSync(gamesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("__"))
  .map((d) => path.join(gamesDir, d.name));

let done = 0;
const failed = [];
for (const dir of dirs) {
  try { buildGame(dir); done++; }
  catch (e) { failed.push(path.basename(dir) + ": " + e.message); }
}

console.log(`[rebuild] ${done}/${dirs.length} games rebuilt`);
if (failed.length) {
  console.error("[rebuild] failures:");
  failed.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
