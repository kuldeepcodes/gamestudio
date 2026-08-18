// Hourly orchestrator: invent a fresh game, implement it, assemble it, smoke-test it,
// self-repair/retry on failure, then register it in the gallery.
//
// Backend: a local PROCEDURAL generator (scripts/lib/procgen.mjs) by default — free, offline,
// always available (GitHub Models was retired 2026-07-30). If a repo secret GS_LLM_KEY is set,
// an OpenAI-compatible model authors the game instead, with the procedural generator as a
// guaranteed fallback. Either way the game must pass a headless smoke test before a PR opens.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildGame, readMeta } from "./build-game.mjs";
import { smoke } from "./lib/smoke.mjs";
import { buildBrief } from "./lib/ideas.mjs";
import { generateGame, repairGame } from "./lib/llm.mjs";
import { generateGameProc } from "./lib/procgen.mjs";
import { readManifest, writeManifest, uniqueSlug, entryFromMeta } from "./lib/manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAX_REPAIRS = 3;
const log = (...a) => console.log("[generate]", ...a);

function todayUTC() { return process.env.GS_DATE || new Date().toISOString().slice(0, 10); }
function ghOutput(kv) {
  const f = process.env.GITHUB_OUTPUT;
  if (!f) return;
  fs.appendFileSync(f, Object.entries(kv).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}

// Games sitting in unmerged `game/*` PR branches are not in main's games.json, so without
// this the next hourly run sees an unchanged gallery and picks the same most-overdue
// archetype again — producing near-identical drops whenever PRs aren't merged promptly.
// Read those branches' manifests so pending games still count for rotation and naming.
function pendingEntries(existingSlugs) {
  const out = [];
  try {
    const refs = execFileSync("git", ["for-each-ref", "--format=%(refname)", "refs/remotes/origin/game/"], { cwd: ROOT, encoding: "utf8" })
      .split("\n").map((s) => s.trim()).filter(Boolean);
    for (const ref of refs) {
      try {
        const raw = execFileSync("git", ["show", `${ref}:games.json`], { cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
        for (const g of (JSON.parse(raw).games || [])) {
          if (!g || !g.slug) continue;
          if (existingSlugs.has(g.slug) || out.some((o) => o.slug === g.slug)) continue;
          out.push(g);
        }
      } catch (e) { /* branch without a readable manifest — skip */ }
    }
  } catch (e) { /* not a git checkout, or no such refs — fall back to main only */ }
  return out;
}

async function main() {
  const apiRef = fs.readFileSync(path.join(ROOT, "engine", "api.md"), "utf8");
  let example = "window.GAME = { meta:{title:'Example'}, create:function(){ return { setup(){}, update(){}, render(){} }; } };";
  try { example = fs.readFileSync(path.join(ROOT, "games", "2026-08-18-voidfall", "game.js"), "utf8"); } catch (e) {}

  const manifest = readManifest(ROOT);
  const shipped = manifest.games || [];
  // include games waiting in unmerged PR branches so rotation keeps advancing
  const pending = pendingEntries(new Set(shipped.map((g) => g.slug)));
  if (pending.length) log(`Found ${pending.length} game(s) in open PR branches — counting them for rotation: ${pending.map((p) => p.title).join(", ")}`);
  const known = pending.concat(shipped);
  const seed = process.env.GS_SEED ? Number(process.env.GS_SEED) >>> 0 : Date.now() >>> 0;
  const brief = buildBrief(known, seed);
  log(`Brief: ${brief.genre} · ${brief.theme} · twist="${brief.twist}" · ${brief.mood} · ${brief.orientation}`);

  const tmpDir = path.join(ROOT, "games", "__wip__");
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // Write code to the wip folder, build it, smoke-test it. Returns { ok, meta, errors }.
  async function tryCode(code) {
    fs.writeFileSync(path.join(tmpDir, "game.js"), code);
    let meta;
    try { meta = readMeta(code); } catch (e) { return { ok: false, errors: ["meta: " + e.message] }; }
    try { buildGame(tmpDir); } catch (e) { return { ok: false, meta, errors: ["build: " + e.message] }; }
    const res = await smoke(path.join(tmpDir, "index.html"));
    return { ok: res.ok, meta, errors: res.errors || [] };
  }

  let ok = false, meta = null, source = "procedural", errors = [];

  // 1) Optional LLM path (only if the user supplied an API key).
  if (process.env.GS_LLM_KEY) {
    try {
      log("GS_LLM_KEY set — authoring with the model…");
      let code = await generateGame({ apiRef, example, brief });
      for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
        const r = await tryCode(code);
        if (r.ok) { ok = true; meta = r.meta; source = "llm"; log(`LLM game passed on attempt ${attempt + 1} — "${meta.title}"`); break; }
        errors = r.errors; log(`LLM attempt ${attempt + 1} failed: ${errors.slice(0, 2).join(" | ")}`);
        if (attempt === MAX_REPAIRS) break;
        code = await repairGame({ apiRef, brokenCode: code, errors });
      }
    } catch (e) { log("LLM path errored, falling back to procedural: " + e.message); }
  }

  // 2) Procedural generator — the reliable default / fallback.
  if (!ok) {
    for (let v = 0; v <= MAX_REPAIRS + 3; v++) {
      const gen = generateGameProc(brief, v);
      const r = await tryCode(gen.code);
      if (r.ok) { ok = true; meta = r.meta; source = "procedural"; log(`Procedural game "${meta.title}" (${gen.archetype}) passed on variant ${v}`); break; }
      errors = r.errors; log(`Procedural variant ${v} (${gen.archetype}) failed: ${errors.slice(0, 2).join(" | ")}`);
    }
  }

  if (!ok) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.error("[generate] Could not produce a clean game:\n" + errors.join("\n"));
    ghOutput({ created: "false" });
    process.exit(1);
  }

  const date = todayUTC();
  const slug = uniqueSlug(ROOT, date, meta.title, new Set(pending.map((p) => p.slug)));
  const dir = path.join(ROOT, "games", slug);
  fs.renameSync(tmpDir, dir);
  buildGame(dir);

  const entry = entryFromMeta(meta, slug, date);
  fs.writeFileSync(path.join(dir, "meta.json"),
    JSON.stringify({ ...entry, source, brief: { genre: brief.genre, theme: brief.theme, twist: brief.twist, mood: brief.mood } }, null, 2) + "\n");

  manifest.games = manifest.games || [];
  manifest.games.unshift(entry);
  writeManifest(ROOT, manifest);

  log(`Shipped games/${slug}/  —  "${meta.title}" ${entry.emoji}  [${source}]`);
  ghOutput({
    created: "true", slug, title: meta.title, emoji: entry.emoji, tagline: entry.tagline,
    genre: entry.genre, theme: brief.theme, source, branch: "game/" + slug
  });
}

main().catch((e) => { console.error("[generate] fatal:", e); ghOutput({ created: "false" }); process.exit(1); });
