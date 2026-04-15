/**
 * generate-level.mjs
 * Generates an AI image for a new quiz level and adds it to levels.js
 *
 * Usage:
 *   node scripts/generate-level.mjs '<JSON>'
 *   node scripts/generate-level.mjs scripts/_level_input.json
 *
 * Requires FAL_KEY in .env (fal.ai key)
 *
 * JSON fields:
 *   answer       - The punny celeb name, UPPERCASE (e.g. "TAYLOR DRIFT")
 *   original     - Real celebrity name (e.g. "Taylor Swift")
 *   changedFrom  - Original letter (e.g. "S")
 *   changedTo    - Changed letter (e.g. "D")
 *   changedIndex - Index of the changed letter in answer (0-based)
 *   emoji        - Representative emoji (e.g. "🚗")
 *   bgColor      - Hex fallback bg color (e.g. "#1a1a2e")
 *   clue         - In-game hint text (e.g. "Speed racer vibes 🚗")
 *   description  - Image generation prompt (e.g. "Taylor Swift as a F1 racing driver")
 *   punchline    - Reveal text (e.g. "Oops! It's Taylor Drift! 🚗")
 *   difficulty   - "easy" | "medium" | "hard" | "expert"
 */

// Allow corporate proxy certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { fal } from "@fal-ai/client";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isNonEmptyString(s) {
  return typeof s === "string" && s.trim().length > 0;
}

function validateImageFile(filepath) {
  try {
    if (!fs.existsSync(filepath)) return { ok: false, reason: "file does not exist" };
    const stat = fs.statSync(filepath);
    if (!stat.isFile()) return { ok: false, reason: "not a file" };
    if (stat.size <= 0) return { ok: false, reason: "file size is 0 bytes" };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.message || String(err) };
  }
}

// ── Project root detection (handles git worktrees) ────────────────────────────

function findProjectRoot(startDir) {
  const normalized = startDir.replace(/\\/g, "/");
  const worktreeMarker = "/.claude/worktrees/";
  const idx = normalized.indexOf(worktreeMarker);
  if (idx !== -1) return startDir.slice(0, idx);
  return path.resolve(startDir, "..");
}

const ROOT = findProjectRoot(__dirname);

// ── Load .env (searches ROOT and up to 4 parent dirs) ────────────────────────

function loadEnvFile() {
  let dir = ROOT;
  for (let i = 0; i < 5; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}
loadEnvFile();

// ── Validate environment ──────────────────────────────────────────────────────

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("❌  FAL_KEY is not set in .env");
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });

// ── Parse input ───────────────────────────────────────────────────────────────

const levelDataArg = process.argv[2];
if (!levelDataArg) {
  console.error("❌  No level data provided.");
  console.error('    Usage: node scripts/generate-level.mjs scripts/_level_input.json');
  process.exit(1);
}

let levelData;
try {
  levelData = levelDataArg.endsWith(".json") && fs.existsSync(levelDataArg)
    ? JSON.parse(fs.readFileSync(levelDataArg, "utf-8"))
    : JSON.parse(levelDataArg);
} catch {
  console.error("❌  Invalid JSON:", levelDataArg);
  process.exit(1);
}

const REQUIRED = [
  "answer", "original", "changedFrom", "changedTo", "changedIndex",
  "emoji", "bgColor", "clue", "description", "punchline", "difficulty",
];
for (const field of REQUIRED) {
  if (levelData[field] === undefined || levelData[field] === null) {
    console.error(`❌  Missing required field: "${field}"`);
    process.exit(1);
  }
}

let answer = normalizeName(levelData.answer).toUpperCase();
let original = normalizeName(levelData.original);
const changedFrom = normalizeName(levelData.changedFrom).toUpperCase();
const changedTo = normalizeName(levelData.changedTo).toUpperCase();
const changedIndex = levelData.changedIndex;
const emoji = normalizeName(levelData.emoji);
const bgColor = normalizeName(levelData.bgColor);
const clue = normalizeName(levelData.clue);
const description = normalizeName(levelData.description);
const punchline = normalizeName(levelData.punchline);
const difficulty = normalizeName(levelData.difficulty);
const duel = !!levelData.duel;

try {
  assert(isNonEmptyString(answer), "Invalid answer after sanitization");
  assert(isNonEmptyString(original), "Invalid original after sanitization");
  assert(isNonEmptyString(changedFrom) && changedFrom.length === 1, "changedFrom must be a single character");
  assert(isNonEmptyString(changedTo) && changedTo.length === 1, "changedTo must be a single character");
  assert(Number.isInteger(changedIndex) && changedIndex >= 0, "changedIndex must be a non-negative integer");
  assert(isNonEmptyString(description), "Invalid description after sanitization");
} catch (err) {
  console.error(`❌  Invalid level data: ${err.message}`);
  process.exit(1);
}

const filename = answer.toLowerCase().replace(/\s+/g, "-");
const QUALITY_SUFFIX = "polished graphic realism, not overly photorealistic, smooth and flawless skin, clean distinct lines, smooth stylized background, cinematic lighting, sharp focus, 8k masterpiece, highly detailed";

// ── Image generation (fal.ai Nano Banana 2) ──────────────────────────────────

async function generateImage() {
  const fullPrompt = `${description}, ${QUALITY_SUFFIX}`;
  console.log(`\n🎨  Generating image for "${answer}"…`);
  console.log(`    Prompt: ${fullPrompt}\n`);

  const result = await fal.subscribe("fal-ai/nano-banana-2", {
    input: {
      prompt: fullPrompt,
      aspect_ratio: "1:1",
      resolution: "0.5K",
      num_images: 1,
      output_format: "png",
      safety_tolerance: "2",
      num_inference_steps: 4,
    },
    logs: true,
    onQueueUpdate(update) {
      if (update.status === "IN_PROGRESS" && update.logs?.length) {
        for (const log of update.logs) console.log(`    ⏳ ${log.message}`);
      }
    },
  });

  const url = result.data?.images?.[0]?.url;
  if (!url) throw new Error("fal.ai returned no image URL");

  console.log(`⬇️   Downloading image…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer?.length) throw new Error("Downloaded image is empty (0 bytes)");
  return buffer;
}

// ── Save image ────────────────────────────────────────────────────────────────

function saveImage(imageBuffer, filepath) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, imageBuffer);
  console.log(`✅  Image saved → ${path.relative(ROOT, filepath)}`);
}

// ── levels.js update ──────────────────────────────────────────────────────────

function addLevelToLevelsJs() {
  const levelsPath = path.join(ROOT, "src", "data", "levels.js");
  let content = fs.readFileSync(levelsPath, "utf-8");

  const ids = [...content.matchAll(/\bid:\s*(\d+)/g)].map(m => parseInt(m[1], 10));
  const newId = ids.length ? Math.max(...ids) + 1 : 1;

  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const levelStr = [
    `  {`,
    `    id: ${newId},`,
    `    answer: "${esc(answer)}",`,
    `    original: "${esc(original)}",`,
    `    changedFrom: "${esc(changedFrom)}",`,
    `    changedTo: "${esc(changedTo)}",`,
    `    changedIndex: ${changedIndex},`,
    `    emoji: "${esc(emoji)}",`,
    `    bgColor: "${esc(bgColor)}",`,
    `    clue: "${esc(clue)}",`,
    `    description: "${esc(description)}",`,
    `    punchline: "${esc(punchline)}",`,
    `    difficulty: "${esc(difficulty)}",`,
    `    get image() { return toImagePath(this.answer); },`,
    `  },`,
  ].join("\n");

  const insertAt = content.lastIndexOf("\n];");
  if (insertAt === -1) throw new Error('Could not find closing ]; in levels.js');

  fs.writeFileSync(levelsPath,
    content.slice(0, insertAt + 1) + levelStr + "\n" + content.slice(insertAt + 1),
    "utf-8"
  );
  console.log(`✅  Level ${newId} added to src/data/levels.js`);
  return newId;
}

// ── duelLevels.js update ──────────────────────────────────────────────────────

function addLevelToDuelLevelsJs() {
  const duelPath = path.join(ROOT, "src", "data", "duelLevels.js");
  let content = fs.readFileSync(duelPath, "utf-8");

  const ids = [...content.matchAll(/id:\s*"duel_(\d+)"/g)].map(m => parseInt(m[1], 10));
  const newNum = ids.length ? Math.max(...ids) + 1 : 1;
  const newId = `duel_${newNum}`;

  const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const levelStr = [
    `  {`,
    `    id: "${newId}",`,
    `    celebrity: "${esc(original)}",`,
    `    twistedName: "${esc(answer)}",`,
    `    answer: "${esc(answer)}",`,
    `    original: "${esc(original)}",`,
    `    get image() { return toImagePath(this.answer); },`,
    `    changedFrom: "${esc(changedFrom)}",`,
    `    changedTo: "${esc(changedTo)}",`,
    `    changedIndex: ${changedIndex},`,
    `    emoji: "${esc(emoji)}",`,
    `    bgColor: "${esc(bgColor)}",`,
    `    clue: "${esc(clue)}",`,
    `    description: "${esc(description)}",`,
    `    punchline: "${esc(punchline)}",`,
    `    difficulty: "${esc(difficulty)}",`,
    `    changedLetter: { from: "${esc(changedFrom)}", to: "${esc(changedTo)}", position: ${changedIndex} },`,
    `  },`,
  ].join("\n");

  const insertAt = content.lastIndexOf("\n];");
  if (insertAt === -1) throw new Error('Could not find closing ]; in duelLevels.js');

  fs.writeFileSync(duelPath,
    content.slice(0, insertAt + 1) + levelStr + "\n" + content.slice(insertAt + 1),
    "utf-8"
  );
  console.log(`✅  Duel level ${newId} added to src/data/duelLevels.js`);
  return newId;
}

// ── Git commit ────────────────────────────────────────────────────────────────

function gitCommit(newId, imagePath) {
  const relImage = path.relative(ROOT, imagePath).replace(/\\/g, "/");
  const dataFile = duel ? "src/data/duelLevels.js" : "src/data/levels.js";
  const imageExists = fs.existsSync(imagePath);
  if (imageExists) execSync(`git add "${relImage}"`, { cwd: ROOT });
  execSync(`git add "${dataFile}"`, { cwd: ROOT });
  const msg = duel ? `feat: add duel level ${newId} - ${answer}` : `feat: add level ${newId} - ${answer}`;
  execSync(`git commit -m "${msg}"`, { cwd: ROOT });
  console.log(`📦  Committed to git: "${msg}"`);
  execSync(`git push`, { cwd: ROOT });
  console.log(`🚀  Pushed to remote`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

try {
  const imagePath = path.join(ROOT, "public", "images", `${filename}.png`);
  const pre = validateImageFile(imagePath);
  if (!pre.ok) {
    const imageBuffer = await generateImage();
    saveImage(imageBuffer, imagePath);
  } else {
    console.log(`⏭️   Image already exists and looks valid, skipping generation.`);
  }

  const post = validateImageFile(imagePath);
  if (!post.ok) {
    throw new Error(`Image validation failed (${post.reason}). Skipping level creation for "${answer}".`);
  }

  const newId = duel ? addLevelToDuelLevelsJs() : addLevelToLevelsJs();
  gitCommit(newId, imagePath);

  console.log(`\n🎉  Done!`);
  console.log(`    Level ID : ${newId}`);
  console.log(`    Answer   : ${answer}`);
  console.log(`    Image    : public/images/${filename}.png`);
} catch (err) {
  console.error("\n❌  Error:", err.message);
  process.exit(1);
}
