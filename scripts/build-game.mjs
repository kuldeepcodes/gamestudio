// Assembles a game folder's game.js into a single self-contained index.html
// using the shared premium shell (engine/shell.html + shell.css + engine.js).
// Usage: node scripts/build-game.mjs games/<slug>
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ENGINE = path.join(ROOT, "engine");

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
const safeScript = (s) => String(s).replace(/<\/script/gi, "<\\/script");
const safeStyle = (s) => String(s).replace(/<\/style/gi, "<\\/style");

export function readMeta(gameJsSource) {
  const sandbox = { window: {}, globalThis: {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(gameJsSource, sandbox, { timeout: 2000 });
  const g = sandbox.window.GAME;
  if (!g || !g.meta || typeof g.create !== "function") {
    throw new Error("game.js must set window.GAME = { meta, create(engine) }");
  }
  return g.meta;
}

export function buildGame(dir) {
  const gameJsPath = path.join(dir, "game.js");
  const gameSrc = fs.readFileSync(gameJsPath, "utf8");
  const meta = readMeta(gameSrc);

  const shell = fs.readFileSync(path.join(ENGINE, "shell.html"), "utf8");
  const css = fs.readFileSync(path.join(ENGINE, "shell.css"), "utf8");
  const engine = fs.readFileSync(path.join(ENGINE, "engine.js"), "utf8");

  const title = meta.title || "Game";
  const desc = meta.description || meta.tagline || "A tiny premium browser game from Game Studio.";
  const bg = meta.bg || "#0b1020";

  const html = shell
    .replace(/__TITLE__/g, esc(title))
    .replace(/__DESC__/g, esc(desc))
    .replace(/__BG__/g, esc(bg))
    .replace("__CSS__", safeStyle(css))
    .replace("__ENGINE__", safeScript(engine))
    .replace("__GAME__", safeScript(gameSrc));

  const out = path.join(dir, "index.html");
  fs.writeFileSync(out, html);
  return { out, meta, bytes: html.length };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-game.mjs")) {
  const dir = process.argv[2];
  if (!dir) { console.error("Usage: node scripts/build-game.mjs games/<slug>"); process.exit(1); }
  const r = buildGame(path.resolve(dir));
  console.log(`Built ${r.out} (${(r.bytes / 1024).toFixed(1)} KB) — "${r.meta.title}"`);
}
