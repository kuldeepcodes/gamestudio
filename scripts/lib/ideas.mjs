// Creativity + novelty engine. Produces a fresh "creative brief" each run that is
// deliberately different from everything already in the gallery, then lets the LLM
// make the final creative leap. Seeded by the clock so consecutive hours diverge.

const GENRES = [
  "one-button reflex", "endless dodge", "endless runner", "arcade shooter", "physics toss",
  "falling-block stacker", "match / merge", "rhythm timing", "maze navigation", "memory recall",
  "snake-like growth", "breakout / paddle", "flappy-style hop", "grid puzzle", "sorting puzzle",
  "catch & collect", "aiming / slingshot", "balance / tightrope", "tower stacking", "typing / word",
  "reaction test", "orbit / gravity", "tap-to-grow", "path drawing", "color matching",
  "whack / pop", "lane switching", "bouncing", "spinning wheel", "tile flipping"
];
const THEMES = [
  "neon cyberpunk", "cozy pastel", "deep-space", "underwater bioluminescence", "molten lava",
  "zen garden", "candy world", "retro arcade CRT", "arctic aurora", "haunted neon",
  "desert mirage", "vaporwave sunset", "jungle canopy", "clockwork brass", "origami paper",
  "glitch datastream", "volcanic forge", "crystal cavern", "storm clouds", "circuit board",
  "galaxy nebula", "autumn forest", "coral reef", "moonlit rooftops", "prism / rainbow"
];
const TWISTS = [
  "gravity flips on input", "the world speeds up relentlessly", "one life, permadeath",
  "controls invert every few seconds", "everything moves to a pulsing beat",
  "you grow larger as you score (and clumsier)", "light fades and you must relight it",
  "two things must be controlled at once", "the screen slowly rotates",
  "risk/reward: bank points or push your luck", "a shrinking safe zone",
  "color must match to be safe", "time rewinds on mistakes (limited)",
  "chain combos multiply the score", "obstacles mirror your movement",
  "a hazard chases your trail", "wind pushes everything sideways",
  "you paint the arena as you move", "magnetism pulls objects toward you",
  "every pickup changes the rules briefly"
];
const MOODS = ["playful", "tense", "meditative", "frantic", "satisfying", "mysterious", "cheerful", "hypnotic"];
const INPUTS = ["tap / click only", "swipe directions", "hold to charge", "steer left/right", "aim and release", "move a cursor", "one key rhythm taps"];
const PALETTES = [
  ["#6ee7ff", "#a78bfa", "#070b1a"], ["#f9a8d4", "#c084fc", "#160a1e"], ["#7CFFCB", "#4ADEDE", "#04160f"],
  ["#ffd166", "#ff6b6b", "#1a1005"], ["#8ab4ff", "#b388ff", "#05070f"], ["#f97316", "#facc15", "#160b02"],
  ["#22d3ee", "#818cf8", "#020617"], ["#a3e635", "#22c55e", "#07130a"], ["#fb7185", "#fbbf24", "#170608"],
  ["#e879f9", "#38bdf8", "#0a0416"], ["#5eead4", "#fca5a5", "#04140f"], ["#93c5fd", "#f0abfc", "#060814"]
];

function mulberry32(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function buildBrief(existingGames, seedInput) {
  const seed = (seedInput != null ? seedInput : Date.now()) >>> 0;
  const rng = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const usedGenre = new Set(existingGames.map((g) => norm(g.genre)));
  const usedTheme = new Set(existingGames.map((g) => norm(g.theme)));
  const usedMech = new Set(existingGames.map((g) => norm(g.mechanic)));
  const usedCombo = new Set(existingGames.map((g) => norm(g.genre) + "|" + norm(g.theme)));

  // prefer an unused genre and unused theme; fall back gracefully
  const freshGenres = GENRES.filter((g) => !usedGenre.has(norm(g)));
  const freshThemes = THEMES.filter((t) => !usedTheme.has(norm(t)));
  let genre, theme, tries = 0;
  do {
    genre = (freshGenres.length ? pick(freshGenres) : pick(GENRES));
    theme = (freshThemes.length ? pick(freshThemes) : pick(THEMES));
    tries++;
  } while (usedCombo.has(norm(genre) + "|" + norm(theme)) && tries < 40);

  const palette = pick(PALETTES);
  const orientation = rng() < 0.62 ? "portrait" : "landscape";
  return {
    seed,
    genre,
    theme,
    twist: pick(TWISTS),
    mood: pick(MOODS),
    input: pick(INPUTS),
    orientation,
    width: orientation === "portrait" ? 480 : 640,
    height: orientation === "portrait" ? 720 : 480,
    palette: { accent: palette[0], accent2: palette[1], bg: palette[2] },
    avoid: existingGames.slice(0, 40).map((g) => ({ title: g.title, genre: g.genre, mechanic: g.mechanic, theme: g.theme, tagline: g.tagline }))
  };
}
