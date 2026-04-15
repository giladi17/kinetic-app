/**
 * generate-new-levels-batch.mjs
 * Generates AI images for all 39 new levels (added in batch commit).
 * Images already on disk are skipped automatically.
 *
 * Usage:
 *   node scripts/generate-new-levels-batch.mjs
 *
 * Requires FAL_KEY in .env (fal.ai key)
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

// ── Load .env ─────────────────────────────────────────────────────────────────

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

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error("❌  FAL_KEY is not set in .env");
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });

// ── Quality suffix (same as generate-level.mjs) ───────────────────────────────

const QUALITY_SUFFIX = "polished graphic realism, not overly photorealistic, smooth and flawless skin, clean distinct lines, smooth stylized background, cinematic lighting, sharp focus, 8k masterpiece, highly detailed";

// ── New levels ────────────────────────────────────────────────────────────────

const NEW_LEVELS = [
  // ── levels.js (IDs 183–208) ──────────────────────────────────────────────
  {
    answer: "BOY ORBISON",
    description: "Roy Orbison with his own real human face, wearing his iconic dark sunglasses and black suit, but styled as a mischievous schoolboy with a small backpack, do not replace his face",
  },
  {
    answer: "RAT ROMANO",
    description: "Ray Romano with his own real human face, sitting on a couch with a giant rat on his lap instead of a dog, casual sitcom living room setting, do not replace his face",
  },
  {
    answer: "MATE HUDSON",
    description: "Kate Hudson with her own real human face, wearing her signature bright smile, surrounded by best friends in a fun social gathering, arms around everyone, do not replace her face",
  },
  {
    answer: "JADE PINKETT",
    description: "Jada Pinkett Smith with her own real human face, wearing an elaborate outfit made entirely of jade gemstones, sparkling green jewelry everywhere, do not replace her face",
  },
  {
    answer: "DATA CARVEY",
    description: "Dana Carvey with his own real human face, wearing his Church Lady costume but surrounded by computer screens filled with data charts and code, looking piously at the data, do not replace his face",
  },
  {
    answer: "DATE COOK",
    description: "Dane Cook with his own real human face, wearing a chef's apron and cooking an elaborate romantic candlelit dinner, looking charming and nervous, do not replace his face",
  },
  {
    answer: "DIRT NOWITZKI",
    description: "Dirk Nowitzki with his own real human face, wearing his Dallas Mavericks jersey but covered head to toe in garden dirt, proudly holding a muddy shovel, do not replace his face",
  },
  {
    answer: "DUNE ELLINGTON",
    description: "Duke Ellington with his own real human face, wearing his classic elegant suit but playing a grand piano in the middle of a vast desert sand dune, do not replace his face",
  },
  {
    answer: "EARN SWEATSHIRT",
    description: "Earl Sweatshirt with his own real human face, wearing his signature oversized hoodie, holding a price tag attached to it and counting cash like a savvy street vendor, do not replace his face",
  },
  {
    answer: "EVEN SHER",
    description: "Eden Sher with her own real human face, holding a large set of balance scales and a ruler, meticulously measuring everything around her with extreme precision, do not replace her face",
  },
  {
    answer: "FIND WOLFHARD",
    description: "Finn Wolfhard with his own real human face, holding a giant magnifying glass like a detective, searching for clues on a mysterious foggy street, do not replace his face",
  },
  {
    answer: "GATE NEWELL",
    description: "Gabe Newell with his own real human face, standing in front of a massive ornate golden gate instead of a computer screen, looking very pleased with himself, do not replace his face",
  },
  {
    answer: "GONE HACKMAN",
    description: "Gene Hackman with his own real human face fading away like a ghost, his body translucent and dissolving into thin air, looking surprised, do not replace his face",
  },
  {
    answer: "GLEE POWELL",
    description: "Glen Powell with his own real human face, wearing his Top Gun flight suit but surrounded by musical notes and jazz hands, grinning with gleeful joy, do not replace his face",
  },
  {
    answer: "HAND AZARIA",
    description: "Hank Azaria with his own real human face, one of his hands comically enormous and oversized, looking at it with total bewilderment, do not replace his face",
  },
  {
    answer: "HATS ZIMMER",
    description: "Hans Zimmer with his own real human face, wearing dozens of different stacked hats of every style piled impossibly high on his head, in his famous recording studio, do not replace his face",
  },
  {
    answer: "HOLE DAVIS",
    description: "Hope Davis with her own real human face, standing beside a giant freshly dug hole in the ground, shovel in hand, looking very satisfied, do not replace her face",
  },
  {
    answer: "HUGE WEAVING",
    description: "Hugo Weaving with his own real human face, wearing Agent Smith's black suit but operating a colossal industrial weaving loom with intense focus, do not replace his face",
  },
  {
    answer: "FADE THIRLWALL",
    description: "Jade Thirlwall with her own real human face, wearing her vibrant signature outfit that gradually fades to grey at the edges as if disappearing, do not replace her face",
  },
  {
    answer: "MOJO SIWA",
    description: "JoJo Siwa with her own real human face, wearing her signature giant bow and sparkly rainbow outfit, radiating magical golden energy and pure mojo in all directions, do not replace her face",
  },
  {
    answer: "KART URBAN",
    description: "Karl Urban with his own real human face, wearing his Judge Dredd helmet but driving a tiny comically small go-kart, looking intensely serious about the race, do not replace his face",
  },
  {
    answer: "KINK DOUGLAS",
    description: "Kirk Douglas with his own real human face, his normally styled hair replaced by dramatically kinked and wildly curly hair in every direction, looking very confused, do not replace his face",
  },
  {
    answer: "LARD CROFT",
    description: "Lara Croft in her iconic adventure outfit and twin holsters, but holding giant blocks of lard instead of pistols, posed heroically in an ancient kitchen temple, do not replace her face",
  },
  {
    answer: "LIST KUDROW",
    description: "Lisa Kudrow with her own real human face, dressed like Phoebe from Friends but completely surrounded by endless to-do lists pinned everywhere, clutching a notepad, do not replace her face",
  },
  {
    answer: "MAYO RUDOLPH",
    description: "Maya Rudolph with her own real human face, sitting inside a giant jar of mayonnaise, wearing it like a costume and looking completely fabulous and unbothered, do not replace her face",
  },
  {
    answer: "RICH ASTLEY",
    description: "Rick Astley with his own real human face, wearing his classic 80s outfit but dripping in gold chains, stacks of cash around him, looking very pleased with his wealth, do not replace his face",
  },

  // ── duelLevels.js (duel_44–duel_56) ─────────────────────────────────────
  {
    answer: "SHIN LABEOUF",
    description: "Shia LaBeouf with his own real human face, dramatically showing off an enormous glowing shin bone, looking very intense about it, do not replace his face",
  },
  {
    answer: "MILD KUNIS",
    description: "Mila Kunis with her own real human face, dressed in soft pastel colors, reclining peacefully with a gentle breeze and calm sunny weather around her, very serene expression, do not replace her face",
  },
  {
    answer: "CARP DELEVINGNE",
    description: "Cara Delevingne with her own real human face, wearing her signature bold makeup, emerging dramatically from water surrounded by large carp fish, do not replace her face",
  },
  {
    answer: "CLAN RICKMAN",
    description: "Alan Rickman with his own real human face, wearing Scottish clan tartan instead of Snape's robes, standing dramatically against a misty highland backdrop, do not replace his face",
  },
  {
    answer: "BUST REYNOLDS",
    description: "Burt Reynolds with his iconic mustache, posing as a bronze bust sculpture on a grand museum pedestal, frozen mid-swagger, do not replace his face",
  },
  {
    answer: "CARD COX",
    description: "Carl Cox with his own real human face, DJing at his iconic booth but with playing cards flying everywhere around him like confetti, do not replace his face",
  },
  {
    answer: "CORE BOOKER",
    description: "Cory Booker with his own real human face, in his senator suit holding a giant apple core up proudly like a trophy, looking very official, do not replace his face",
  },
  {
    answer: "DIVE FRANCO",
    description: "Dave Franco with his own real human face, wearing full scuba diving gear and goggles on the edge of a diving board, about to leap, do not replace his face",
  },
  {
    answer: "DEAF NORRIS",
    description: "Dean Norris with his own real human face, wearing enormous noise-canceling headphones, looking confused as people desperately try to get his attention, do not replace his face",
  },
  {
    answer: "DEMO LOVATO",
    description: "Demi Lovato with her own real human face, singing passionately at a microphone with a big DEMO TRACK label stamped on the recording equipment around her, do not replace her face",
  },
  {
    answer: "FATE DUNAWAY",
    description: "Faye Dunaway with her own real human face, wearing her classic Chinatown glamour look but sitting at a fortune teller's table with a glowing crystal ball, do not replace her face",
  },
  {
    answer: "LAKE GYLLENHAAL",
    description: "Jake Gyllenhaal with his own real human face, standing in the middle of a calm glassy lake up to his waist, looking intensely focused as always, do not replace his face",
  },
  {
    answer: "MASK WAHLBERG",
    description: "Mark Wahlberg with his own real human face but holding a theatrical comedy mask in front of it, flexed arms and typical tough-guy pose, do not replace his face",
  },

  // ── New batch: levels.js (IDs 209–231) ──────────────────────────────────
  {
    answer: "LARK TWAIN",
    description: "Mark Twain with his own real human face and iconic white mustache, dressed in his classic white suit, perched on a tree branch like a songbird, do not replace his face",
  },
  {
    answer: "HAUL DANO",
    description: "Paul Dano with his own real human face, wearing a moving company uniform and hauling enormous heavy boxes and furniture, straining with effort, do not replace his face",
  },
  {
    answer: "SCAN ASTIN",
    description: "Sean Astin with his own real human face, wearing a security guard uniform, holding a barcode scanner and scanning items at a checkout counter with great focus, do not replace his face",
  },
  {
    answer: "KICK OFFERMAN",
    description: "Nick Offerman with his own real human face and iconic mustache, wearing a karate uniform, delivering a powerful high kick in a dojo, looking intensely serious, do not replace his face",
  },
  {
    answer: "TILL BURR",
    description: "Bill Burr with his own real human face and red hair, wearing overalls and operating a farming tiller in a sunny field, looking very serious about agriculture, do not replace his face",
  },
  {
    answer: "TINY HALE",
    description: "Tony Hale with his own real human face, depicted as an extremely tiny miniature person, standing next to normal-sized everyday objects that tower over him, looking nervous, do not replace his face",
  },
  {
    answer: "DARE CHAPPELLE",
    description: "Dave Chappelle with his own real human face, wearing a daredevil leather jumpsuit on a motorcycle ramp, looking completely unbothered and amused about the stunt ahead, do not replace his face",
  },
  {
    answer: "SPAN TUCCI",
    description: "Stanley Tucci with his own real human face, dressed elegantly as always, posing dramatically in the middle of a large suspension bridge span, looking very refined, do not replace his face",
  },
  {
    answer: "MARE POPPINS",
    description: "Mary Poppins in her iconic outfit with her magical umbrella, riding sidesaddle on a magnificent horse instead of flying, looking prim and absolutely proper on horseback, do not replace her face",
  },
  {
    answer: "HURT RUSSELL",
    description: "Kurt Russell with his own real human face, wearing bandages and a hospital gown instead of Snake Plissken's eyepatch and leather, looking very sorry for himself, do not replace his face",
  },
  {
    answer: "BANE AUSTEN",
    description: "Jane Austen depicted as a Regency-era painted portrait but wearing Bane's iconic mask from Batman, holding a quill pen with dignified posture, do not replace her face",
  },
  {
    answer: "BANK HILL",
    description: "A stocky Texan man in a blue polo shirt with a short flat-top crew cut, standing proudly in front of a giant bank vault filled with propane tanks instead of gold bars, perfectly neutral deadpan expression, suburban neat appearance",
  },
  {
    answer: "JOY HAMM",
    description: "Jon Hamm with his own real human face, wearing Don Draper's classic 60s Madison Avenue suit but with an enormous beaming joyful smile, jumping for joy with arms raised, do not replace his face",
  },
  {
    answer: "FAN MCKELLEN",
    description: "Ian McKellen with his own real human face, wearing Gandalf's grey robes but holding up a foam finger and wearing fan merchandise hat, do not replace his face",
  },
  {
    answer: "JOIN WICK",
    description: "John Wick in his iconic black tactical suit, but instead of guns he is handing out cheerful Join Us pamphlets and smiling warmly at everyone, do not replace his face",
  },
  {
    answer: "GUT PEARCE",
    description: "Guy Pearce with his own real human face, wearing his Memento tattoo-covered body but with a comically enormous round belly gut, looking down at it in total confusion, do not replace his face",
  },
  {
    answer: "TIP ROBBINS",
    description: "Tim Robbins with his own real human face, wearing Andy Dufresne's prison uniform but performing a magic trick pulling coins from a giant tip jar, looking delighted, do not replace his face",
  },
  {
    answer: "LIP TYLER",
    description: "Liv Tyler with her own real human face, wearing Arwen's elven gown but with comically oversized glamorous lips, looking regal and slightly confused, do not replace her face",
  },
  {
    answer: "ALE WONG",
    description: "Ali Wong with her own real human face and iconic glasses, in her stand-up outfit holding an enormous frothy pint of ale up high, looking very proud of it, do not replace her face",
  },
  {
    answer: "ERA GREEN",
    description: "Eva Green with her own real human face, wearing her Bond film glamour look but surrounded by ancient calendars, hourglasses and clocks representing many different historical eras, do not replace her face",
  },
  {
    answer: "ASH BUTTERFIELD",
    description: "Asa Butterfield with his own real human face, wearing his Ender's Game space uniform but covered head to toe in grey volcanic ash, looking completely bewildered, do not replace his face",
  },
  {
    answer: "SALSA HAYEK",
    description: "Salma Hayek with her own real human face, wearing her Frida Kahlo costume but surrounded by giant jars of salsa and dancing passionately, do not replace her face",
  },
  {
    answer: "DOT CHEADLE",
    description: "Don Cheadle with his own real human face, wearing War Machine's iron suit but covered in colorful polka dots of every size, looking puzzled at his own armor, do not replace his face",
  },

  // ── New batch: duelLevels.js (duel_57–duel_76) ───────────────────────────
  {
    answer: "TOP HARDY",
    description: "Tom Hardy with his own real human face, wearing Venom's black symbiote suit but giving two thumbs up and grinning with a TOP PERFORMER ribbon on his chest, do not replace his face",
  },
  {
    answer: "WILT SMITH",
    description: "Will Smith with his own real human face, wearing his Fresh Prince of Bel-Air outfit but wilting like a flower in extreme heat, drooping sadly, do not replace his face",
  },
  {
    answer: "ROAN REYNOLDS",
    description: "Ryan Reynolds with his own real human face and charming smile, wearing a casual red jacket, sitting comfortably atop a beautiful roan-colored horse in a sunny open field, do not replace his face",
  },
  {
    answer: "JUTE LAW",
    description: "Jude Law with his own real human face, wearing Dr. Watson's suit but made entirely of rough jute burlap fabric, looking surprisingly fashionable about it, do not replace his face",
  },
  {
    answer: "WARY OLDMAN",
    description: "Gary Oldman with his own real human face, wearing Commissioner Gordon's trench coat, looking extremely suspicious and paranoid, eyes darting everywhere, do not replace his face",
  },
  {
    answer: "TACK BLACK",
    description: "Jack Black with his own real human face, sitting at a notice board covered in colorful thumbtacks and pushpins instead of playing guitar, looking very enthusiastic about organizing, do not replace his face",
  },
  {
    answer: "LUTE WILSON",
    description: "Luke Wilson with his own real human face, wearing his Old School casual outfit but playing a medieval lute instrument with great passion, do not replace his face",
  },
  {
    answer: "MATE DAMON",
    description: "Matt Damon with his own real human face, wearing his Martian spacesuit but with his arm around a friendly alien companion, both giving thumbs up, do not replace his face",
  },
  {
    answer: "RITE ORA",
    description: "Rita Ora with her own real human face, wearing her glamorous pop outfit but performing an ancient mystical rite ceremony with candles and robes, do not replace her face",
  },
  {
    answer: "TICK VAN DYKE",
    description: "Dick Van Dyke with his own real human face, wearing his Bert chimney sweep costume but with a giant ticking clock strapped to his chest, do not replace his face",
  },
  {
    answer: "MARK TRAIN",
    description: "Mark Twain with his iconic white suit and mustache, riding a steam locomotive as conductor, waving his hat cheerfully out the window, do not replace his face",
  },
  {
    answer: "DILL FERRELL",
    description: "Will Ferrell with his own real human face, wearing his Elf costume but holding giant dill herb sprigs instead of Christmas decorations, looking very excited about them, do not replace his face",
  },
  {
    answer: "WALK DISNEY",
    description: "A cheerful 1950s film producer and visionary in a dark suit with a thin mustache, strolling through a magical colorful theme park full of cartoon character statues and rides, smiling warmly at visitors and waving",
  },
  {
    answer: "PAN LEVY",
    description: "Dan Levy with his own real human face and signature stylish outfit, holding an enormous frying pan and cooking enthusiastically, do not replace his face",
  },
  {
    answer: "TAX SHEPARD",
    description: "Dax Shepard with his own real human face, wearing a suit and IRS badge, holding a clipboard and looking very official about collecting taxes, do not replace his face",
  },
  {
    answer: "BET AFFLECK",
    description: "Ben Affleck with his own real human face, wearing Batman's cape and cowl but sitting at a casino table placing a huge stack of chips on a bet, do not replace his face",
  },
  {
    answer: "PEG RYAN",
    description: "Meg Ryan with her own real human face and iconic rom-com hair, hung from a giant wooden clothes peg like a cartoon character, do not replace her face",
  },
  {
    answer: "RIM KARDASHIAN",
    description: "Kim Kardashian with her own real human face, in her signature glam outfit, balanced dramatically on a basketball rim doing trick shots, do not replace her face",
  },
  {
    answer: "RAY LENO",
    description: "Jay Leno with his own real human face and iconic chin, wearing his classic Tonight Show suit but with sunrays beaming out from him like a human sun, do not replace his face",
  },
  {
    answer: "TEN DANSON",
    description: "Ted Danson with his own real human face, wearing his Cheers bartender outfit, counting out exactly ten drinks lined up on the bar with extreme precision, do not replace his face",
  },
];

// ── Image generation ──────────────────────────────────────────────────────────

async function generateImage(answer, description) {
  const fullPrompt = `${description}, ${QUALITY_SUFFIX}`;
  console.log(`\n🎨  Generating: "${answer}"`);
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

  console.log(`⬇️   Downloading…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer?.length) throw new Error("Downloaded image is empty (0 bytes)");
  return buffer;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const imagesDir = path.join(ROOT, "public", "images");
fs.mkdirSync(imagesDir, { recursive: true });

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : NEW_LEVELS.length;
const LEVELS_TO_RUN = NEW_LEVELS.slice(0, LIMIT);

const generated = [];
const skipped = [];
const failed = [];

for (let i = 0; i < LEVELS_TO_RUN.length; i++) {
  const raw = LEVELS_TO_RUN[i];
  const answer = normalizeName(raw.answer).toUpperCase();
  const description = normalizeName(raw.description);

  if (!answer || !description) {
    console.error(`❌  Invalid level data, skipping. answer="${raw.answer}"`);
    failed.push(raw.answer ?? "(missing answer)");
    continue;
  }

  const filename = answer.toLowerCase().replace(/\s+/g, "-") + ".png";
  const imagePath = path.join(imagesDir, filename);

  console.log(`\n[${i + 1}/${NEW_LEVELS.length}] ${answer}`);

  const pre = validateImageFile(imagePath);
  if (pre.ok) {
    console.log(`⏭️   Already exists and looks valid, skipping.`);
    skipped.push(answer);
    continue;
  }

  try {
    const buffer = await generateImage(answer, description);
    fs.writeFileSync(imagePath, buffer);
    const post = validateImageFile(imagePath);
    if (!post.ok) throw new Error(`Image validation failed (${post.reason})`);

    console.log(`✅  Saved → public/images/${filename}`);
    generated.push({ answer, imagePath });
  } catch (err) {
    console.error(`❌  Failed: ${err.message}`);
    failed.push(answer);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`✅  Generated : ${generated.length}`);
console.log(`⏭️   Skipped   : ${skipped.length}`);
console.log(`❌  Failed    : ${failed.length}`);
if (failed.length) console.log(`    Failed: ${failed.join(", ")}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// ── Git commit ────────────────────────────────────────────────────────────────

if (generated.length > 0) {
  try {
    const relPaths = generated.map(({ imagePath }) =>
      path.relative(ROOT, imagePath).replace(/\\/g, "/")
    );
    for (const p of relPaths) {
      execSync(`git add "${p}"`, { cwd: ROOT });
    }
    const msg = `Add images for ${generated.length} new levels`;
    execSync(`git commit -m "${msg}"`, { cwd: ROOT });
    console.log(`📦  Committed: "${msg}"`);
    execSync(`git push`, { cwd: ROOT });
    console.log(`🚀  Pushed to remote`);
  } catch (err) {
    console.error("⚠️   Git error:", err.message);
  }
} else {
  console.log("ℹ️   Nothing new to commit.");
}
