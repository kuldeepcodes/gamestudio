// Headless smoke test: load a built game index.html in jsdom, mock the 2D canvas,
// start the game, feed it input, and run frames — failing on any runtime error.
// This is the automated quality gate the hourly generator uses before opening a PR.
import fs from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";

function makeCtx() {
  const grad = { addColorStop() {} };
  const noop = () => {};
  const ctx = {
    canvas: null,
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    getLineDash: () => [],
    isPointInPath: () => false,
    isPointInStroke: () => false,
  };
  const methods = ["save","restore","translate","rotate","scale","transform","setTransform","resetTransform",
    "clearRect","fillRect","strokeRect","beginPath","closePath","moveTo","lineTo","arc","arcTo",
    "quadraticCurveTo","bezierCurveTo","rect","roundRect","ellipse","fill","stroke","clip",
    "fillText","strokeText","drawImage","putImageData","setLineDash","createImageData","scrollPathIntoView"];
  for (const m of methods) if (!ctx[m]) ctx[m] = noop;
  const props = ["fillStyle","strokeStyle","lineWidth","globalAlpha","shadowColor","shadowBlur","shadowOffsetX",
    "shadowOffsetY","font","textAlign","textBaseline","lineCap","lineJoin","miterLimit","globalCompositeOperation",
    "lineDashOffset","imageSmoothingEnabled","filter"];
  for (const p of props) ctx[p] = 0;
  return ctx;
}

export async function smoke(htmlPath, opts = {}) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { if (!/Could not parse CSS|Not implemented/i.test(e.message)) errors.push("jsdom: " + e.message); });

  const rafQ = [];
  let clock = 0;
  const mockCtx = makeCtx();

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.devicePixelRatio = 1;
      win.requestAnimationFrame = (cb) => { rafQ.push(cb); return rafQ.length; };
      win.cancelAnimationFrame = () => {};
      win.performance = win.performance || {};
      win.performance.now = () => clock;
      win.HTMLCanvasElement.prototype.getContext = function () { mockCtx.canvas = this; return mockCtx; };
      const origErr = win.console.error.bind(win.console);
      win.console.error = (...a) => { errors.push("console.error: " + a.map(String).join(" ")); origErr(...a); };
      win.addEventListener("error", (e) => errors.push("window.error: " + (e.error && e.error.stack || e.message)));
      win.addEventListener("unhandledrejection", (e) => errors.push("unhandledrejection: " + (e.reason && e.reason.message || e.reason)));
    },
  });

  const win = dom.window, doc = win.document;
  if (!win.GameShell) errors.push("window.GameShell missing (engine did not load)");
  if (!win.GAME || !win.GAME.meta) errors.push("window.GAME / meta missing");

  const canvas = doc.getElementById("game");
  const play = doc.getElementById("playBtn");
  if (!canvas) errors.push("canvas #game missing");
  if (!play) errors.push("#playBtn missing");

  const flush = (n) => { for (let i = 0; i < n; i++) { clock += 16; const cbs = rafQ.splice(0, rafQ.length); for (const cb of cbs) { try { cb(clock); } catch (e) { errors.push("raf: " + (e.stack || e.message)); } } } };

  flush(6);                       // attract screen frames
  if (play) play.click();         // start the game
  flush(20);

  // feed keyboard input
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"];
  for (const code of keys) {
    win.dispatchEvent(new win.KeyboardEvent("keydown", { code }));
    flush(10);
    win.dispatchEvent(new win.KeyboardEvent("keyup", { code }));
  }
  // feed pointer input
  try {
    canvas.dispatchEvent(new win.MouseEvent("mousedown", { clientX: 40, clientY: 300, bubbles: true }));
    flush(8);
    win.dispatchEvent(new win.MouseEvent("mousemove", { clientX: 200, clientY: 320, bubbles: true }));
    flush(8);
    win.dispatchEvent(new win.MouseEvent("mouseup", { clientX: 200, clientY: 320, bubbles: true }));
  } catch (e) { errors.push("pointer: " + e.message); }
  flush(opts.frames || 120);

  dom.window.close();
  return { ok: errors.length === 0, errors, title: (win.GAME && win.GAME.meta && win.GAME.meta.title) || null };
}

if (process.argv[1] && process.argv[1].endsWith("smoke.mjs")) {
  const p = process.argv[2];
  smoke(p).then((r) => {
    if (r.ok) { console.log(`SMOKE OK — "${r.title}"`); process.exit(0); }
    console.error("SMOKE FAILED:\n" + r.errors.join("\n")); process.exit(1);
  });
}
