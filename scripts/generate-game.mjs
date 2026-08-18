// Hourly orchestrator: invent a fresh game, implement it via the LLM, assemble it,
// smoke-test it, self-repair on failure, then register it in the gallery.
// Run by .github/workflows/hourly-game.yml. Exits non-zero (no PR) if it can't ship a clean game.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildGame, readMeta } from "./build-game.mjs";
import { smoke } from "./lib/smoke.mjs";
import { buildBrief } from "./lib/ideas.mjs";
import { generateGame, repairGame } from "./lib/llm.mjs";
import { readManifest, writeManifest, uniqueSlug, entryFromMeta } from "./lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAX_REPAIRS = 3;
const log = (...a) => console.log("[generate]", ...a);

function todayUTC() { return (process.env.GS_DATE || new Date().toISOString().slice(0, 10)); }

function ghOutput(kv) {
  const f = process.env.GITHUB_OUTPUT;
  if (!f) return;
  fs.appendFileSync(f, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}

async function main() {
  const apiRef = fs.readFileSync(path.join(ROOT, "engine", "api.md"), "utf8");
  let example = "window.GAME = { meta:{title:'Example'}, create:function(engine){ return { setup(){}, update(dt){}, render(ctx){} }; } };";
  try { example = fs.readFileSync(path.join(ROOT, "games", "2026-08-18-voidfall", "game.js"), "utf8"); } catch (e) {}

  const manifest = readManifest(ROOT);
  const seed = process.env.GS_SEED ? Number(process.env.GS_SEED) >>> 0 : Date.now() >>> 0;
  const brief = buildBrief(manifest.games || [], seed);
  log(`Brief: ${brief.genre} · ${brief.theme} · twist="${brief.twist}" · ${brief.orientation}`);

  log("Generating game with LLM…");
  let code = await generateGame({ apiRef, example, brief });

  const date = todayUTC();
  const tmpDir = path.join(ROOT, "games", "__wip__");
  fs.mkdirSync(tmpDir, { recursive: true });

  let ok = false, meta = null, errors = [];
  for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
    fs.writeFileSync(path.join(tmpDir, "game.js"), code);
    try {
      meta = readMeta(code);
      if (!meta.width) meta.width = brief.width;
      if (!meta.height) meta.height = brief.height;
      buildGame(tmpDir);
      const res = await smoke(path.join(tmpDir, "index.html"));
      if (res.ok) { ok = true; log(`Smoke passed on attempt ${attempt + 1} — "${meta.title}"`); break; }
      errors = res.errors;
    } catch (e) { errors = [e.message]; }
    log(`Attempt ${attempt + 1} failed: ${errors.slice(0, 3).join(" | ")}`);
    if (attempt === MAX_REPAIRS) break;
    log("Requesting repair…");
    code = await repairGame({ apiRef, brokenCode: code, errors });
  }

  if (!ok) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.error("[generate] Could not produce a clean game after repairs:\n" + errors.join("\n"));
    ghOutput({ created: "false" });
    process.exit(1);
  }

  const slug = uniqueSlug(ROOT, date, meta.title);
  const dir = path.join(ROOT, "games", slug);
  fs.renameSync(tmpDir, dir);
  buildGame(dir); // rebuild in final location (paths/title stable)

  const entry = entryFromMeta(meta, slug, date);
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ ...entry, brief: { genre: brief.genre, theme: brief.theme, twist: brief.twist } }, null, 2) + "\n");

  manifest.games = manifest.games || [];
  manifest.games.unshift(entry);
  writeManifest(ROOT, manifest);

  log(`Shipped games/${slug}/  —  "${meta.title}" ${entry.emoji}`);
  ghOutput({ created: "true", slug, title: meta.title, emoji: entry.emoji, tagline: entry.tagline,
    genre: entry.genre, theme: brief.theme, branch: "game/" + slug });
}

main().catch((e) => { console.error("[generate] fatal:", e); ghOutput({ created: "false" }); process.exit(1); });
