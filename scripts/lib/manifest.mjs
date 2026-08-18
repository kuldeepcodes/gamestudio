// Read/update games.json (the gallery manifest).
import fs from "node:fs";
import path from "node:path";

export function manifestPath(root) { return path.join(root, "games.json"); }

export function readManifest(root) {
  try { return JSON.parse(fs.readFileSync(manifestPath(root), "utf8")); }
  catch (e) { return { updated: "", games: [] }; }
}

export function writeManifest(root, data) {
  data.updated = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(manifestPath(root), JSON.stringify(data, null, 2) + "\n");
}

export function slugify(s) {
  return String(s || "game").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "")
    .trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 40) || "game";
}

export function uniqueSlug(root, dateStr, title, taken) {
  const base = dateStr + "-" + slugify(title);
  const busy = taken instanceof Set ? taken : new Set(taken || []);
  let slug = base, n = 2;
  while (fs.existsSync(path.join(root, "games", slug)) || busy.has(slug)) { slug = base + "-" + n++; }
  return slug;
}

export function entryFromMeta(meta, slug, dateStr) {
  return {
    id: slugify(meta.title),
    slug,
    title: meta.title || slug,
    tagline: meta.tagline || "",
    description: meta.description || meta.tagline || "",
    genre: meta.genre || "", mechanic: meta.mechanic || "", theme: meta.theme || "",
    tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 6) : [],
    accent: meta.accent || "#6ee7ff", accent2: meta.accent2 || "#a78bfa", bg: meta.bg || "#070b1a",
    emoji: meta.emoji || "\uD83C\uDFAE",
    date: dateStr
  };
}
