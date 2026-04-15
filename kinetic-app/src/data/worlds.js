export const LEVELS_PER_WORLD = 25;

export const WORLD_THEMES = [
  { name: "Cosmic Stage",  emoji: "🌌", gradient: "from-purple-900 to-indigo-900", color: "#7C3AED", cssGradient: "linear-gradient(135deg, #7C3AED, #5B21B6)", glow: "rgba(124, 58, 237, 0.5)", glowSoft: "rgba(124, 58, 237, 0.15)" },
  { name: "Desert Heat",   emoji: "🏜️",  gradient: "from-orange-900 to-amber-900", color: "#F97316", cssGradient: "linear-gradient(135deg, #F97316, #EA580C)", glow: "rgba(249, 115, 22, 0.5)", glowSoft: "rgba(249, 115, 22, 0.15)" },
  { name: "Deep Ocean",    emoji: "🌊", gradient: "from-blue-900 to-cyan-900", color: "#3B82F6", cssGradient: "linear-gradient(135deg, #3B82F6, #2563EB)", glow: "rgba(59, 130, 246, 0.5)", glowSoft: "rgba(59, 130, 246, 0.15)" },
  { name: "Wild Jungle",   emoji: "🌿", gradient: "from-green-900 to-emerald-900", color: "#10B981", cssGradient: "linear-gradient(135deg, #10B981, #059669)", glow: "rgba(16, 185, 129, 0.5)", glowSoft: "rgba(16, 185, 129, 0.15)" },
  { name: "Volcano Peak",  emoji: "🌋", gradient: "from-red-900 to-rose-900", color: "#EF4444", cssGradient: "linear-gradient(135deg, #EF4444, #DC2626)", glow: "rgba(239, 68, 68, 0.5)", glowSoft: "rgba(239, 68, 68, 0.15)" },
  { name: "Crystal Cave",  emoji: "💎", gradient: "from-violet-900 to-fuchsia-900", color: "#A855F7", cssGradient: "linear-gradient(135deg, #A855F7, #9333EA)", glow: "rgba(168, 85, 247, 0.5)", glowSoft: "rgba(168, 85, 247, 0.15)" },
  { name: "Frozen Tundra", emoji: "❄️",  gradient: "from-sky-900 to-slate-900", color: "#06B6D4", cssGradient: "linear-gradient(135deg, #06B6D4, #0891B2)", glow: "rgba(6, 182, 212, 0.5)", glowSoft: "rgba(6, 182, 212, 0.15)" },
  { name: "Golden Sands",  emoji: "⭐",        gradient: "from-yellow-900 to-amber-900", color: "#EAB308", cssGradient: "linear-gradient(135deg, #EAB308, #CA8A04)", glow: "rgba(234, 179, 8, 0.5)", glowSoft: "rgba(234, 179, 8, 0.15)" },
  { name: "Shadow Realm",  emoji: "🌑", gradient: "from-gray-900 to-zinc-900", color: "#6B7280", cssGradient: "linear-gradient(135deg, #4B5563, #374151)", glow: "rgba(107, 114, 128, 0.5)", glowSoft: "rgba(107, 114, 128, 0.15)" },
  { name: "Neon City",     emoji: "🌃", gradient: "from-pink-900 to-purple-900", color: "#EC4899", cssGradient: "linear-gradient(135deg, #EC4899, #9333EA)", glow: "rgba(236, 72, 153, 0.5)", glowSoft: "rgba(236, 72, 153, 0.15)" },
];

export function getWorld(level) {
  const worldIdx = Math.ceil(level / LEVELS_PER_WORLD) - 1;
  const theme = WORLD_THEMES[worldIdx % WORLD_THEMES.length];
  const worldNum = worldIdx + 1;
  return {
    id: worldNum,
    name: theme.name,
    emoji: theme.emoji,
    gradient: theme.gradient,
    startLevel: worldIdx * LEVELS_PER_WORLD + 1,
    endLevel: (worldIdx + 1) * LEVELS_PER_WORLD,
  };
}

export function isBossLevel(level) {
  return level > 0 && level % LEVELS_PER_WORLD === 0;
}

export function isMysteryLevel(level) {
  return level > 0 && level % LEVELS_PER_WORLD === 13;
}

export function isWorldComplete(level) {
  return isBossLevel(level);
}
