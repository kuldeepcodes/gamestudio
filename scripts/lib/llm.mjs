// LLM client for game generation. Defaults to GitHub Models (authenticated by the
// Actions GITHUB_TOKEN with `models: read`), with an optional override to any
// OpenAI-compatible endpoint via env: GS_LLM_KEY + GS_LLM_ENDPOINT + GS_MODEL.

function providerConfig() {
  const key = process.env.GS_LLM_KEY;
  if (key) {
    return {
      endpoint: process.env.GS_LLM_ENDPOINT || "https://api.openai.com/v1/chat/completions",
      token: key,
      models: [process.env.GS_MODEL || "gpt-4o"]
    };
  }
  const token = process.env.GS_LLM_KEY || process.env.MODELS_TOKEN || process.env.GITHUB_TOKEN;
  return {
    endpoint: process.env.GS_LLM_ENDPOINT || "https://models.github.ai/inference/chat/completions",
    token,
    models: (process.env.GS_MODEL ? [process.env.GS_MODEL] : ["openai/gpt-4o", "openai/gpt-4o-mini"])
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chat(messages, { temperature = 0.9, maxTokens = 8000 } = {}) {
  const cfg = providerConfig();
  if (!cfg.token) throw new Error("No LLM token: set GITHUB_TOKEN (with models:read) or GS_LLM_KEY.");
  let lastErr;
  for (const model of cfg.models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(cfg.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${cfg.token}` },
          body: JSON.stringify({ model, messages, temperature, top_p: 0.95, max_tokens: maxTokens })
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if ((res.status === 429 || res.status >= 500) && attempt < 2) { await sleep(1500 * (attempt + 1)); continue; }
          lastErr = new Error(`LLM ${res.status} (${model}): ${body.slice(0, 300)}`);
          break; // try next model
        }
        const data = await res.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) { lastErr = new Error("Empty LLM response"); break; }
        return content;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await sleep(1200 * (attempt + 1));
      }
    }
  }
  throw lastErr || new Error("LLM request failed");
}

function extractCode(text) {
  let s = text.trim();
  const fence = s.match(/```(?:js|javascript)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const idx = s.indexOf("window.GAME");
  if (idx > 0) s = s.slice(idx);
  return s.trim();
}

const SYSTEM = `You are the resident game designer + engineer of "Game Studio", an AI studio that ships one brand-new, delightful, premium micro-game every hour. You write a single self-contained game module for a fixed engine. You value originality, polish, "game feel" (juice), and flawless, error-free code. You never explain — you output only code.`;

export async function generateGame({ apiRef, example, brief }) {
  if (process.env.GS_FAKE === "1") return extractCode(example); // offline pipeline test hook
  const user = `Design and implement a NEW micro-game as one \`game.js\` module for the engine below.

=== ENGINE API ===
${apiRef}

=== GOLD-STANDARD EXAMPLE (study its structure/quality, DO NOT copy its idea) ===
${example}

=== YOUR CREATIVE BRIEF FOR THIS HOUR (make it genuinely fresh) ===
- Genre seed: ${brief.genre}
- Theme / art direction: ${brief.theme}
- Signature twist (build the game around this): ${brief.twist}
- Mood: ${brief.mood}
- Primary input: ${brief.input}
- Orientation: ${brief.orientation} (use width ${brief.width}, height ${brief.height})
- Palette: accent ${brief.palette.accent}, accent2 ${brief.palette.accent2}, bg ${brief.palette.bg} (you may refine, keep it cohesive & premium)

Do NOT duplicate any of these already-made games (different genre AND mechanic AND theme):
${brief.avoid.map((a) => `- ${a.title} — ${a.genre} / ${a.mechanic} / ${a.theme}`).join("\n") || "- (none yet)"}

Requirements:
- One coherent, immediately-understandable mechanic with escalating challenge and a clear game-over that calls engine.gameOver().
- Feels premium: smooth motion, particles on key events, screen shake on impact, sound cues, tasteful use of the palette, subtle background life.
- Works with BOTH keyboard and touch/mouse.
- Robust: never throws; guard everything. Keep it focused (roughly 120-300 lines).
- Fill meta fully (title, tagline, description, instructions, controls, colors, width, height, genre, mechanic, theme, tags, emoji).

Output ONLY the JavaScript for game.js (starting with "window.GAME = {"). No prose, no markdown fences.`;
  const out = await chat([{ role: "system", content: SYSTEM }, { role: "user", content: user }], { temperature: 0.95 });
  return extractCode(out);
}

export async function repairGame({ apiRef, brokenCode, errors }) {
  if (process.env.GS_FAKE === "1") return extractCode(brokenCode);
  const user = `The following \`game.js\` for our engine fails its automated smoke test. Fix it so it runs with NO errors, keeping the same game concept, meta, and premium quality. Output ONLY the corrected game.js (starting with "window.GAME = {").

=== ENGINE API (authoritative) ===
${apiRef}

=== SMOKE TEST ERRORS ===
${errors.slice(0, 12).join("\n")}

=== CURRENT game.js ===
${brokenCode}`;
  const out = await chat([{ role: "system", content: SYSTEM }, { role: "user", content: user }], { temperature: 0.2 });
  return extractCode(out);
}
