export const AVATARS = [
  { id: "astronaut",  emoji: "\u{1F9D1}\u200D\u{1F680}", name: "Astronaut", cost: 0,    unlocked: true  },
  { id: "hero",       emoji: "\u{1F9B8}",    name: "Hero",      cost: 0,    unlocked: true  },
  { id: "robot",      emoji: "\u{1F916}",    name: "Robot",     cost: 0,    unlocked: true  },
  { id: "wizard",     emoji: "\u{1F9D9}",    name: "Wizard",    cost: 100,  unlocked: false },
  { id: "rockstar",   emoji: "\u{1F469}\u200D\u{1F3A4}",  name: "Rockstar",  cost: 100,  unlocked: false },
  { id: "detective",  emoji: "\u{1F575}\uFE0F",   name: "Detective", cost: 150,  unlocked: false },
  { id: "vampire",    emoji: "\u{1F9DB}",    name: "Vampire",   cost: 150,  unlocked: false },
  { id: "king",       emoji: "\u{1F451}",    name: "King",      cost: 200,  unlocked: false },
  { id: "ninja",      emoji: "\u{1F977}",    name: "Ninja",     cost: 200,  unlocked: false },
  { id: "alien",      emoji: "\u{1F47D}",    name: "Alien",     cost: 250,  unlocked: false },
  { id: "dragon",     emoji: "\u{1F409}",    name: "Dragon",    cost: 300,  unlocked: false },
  { id: "phoenix",    emoji: "\u{1F985}",    name: "Phoenix",   cost: 300,  unlocked: false },
  { id: "ghost",      emoji: "\u{1F47B}",    name: "Ghost",     cost: 350,  unlocked: false },
  { id: "demon",      emoji: "\u{1F608}",    name: "Demon",     cost: 400,  unlocked: false },
  { id: "crown",      emoji: "\u{1F3C6}",    name: "Champion",  cost: 500,  unlocked: false },
];

export const DEFAULT_AVATAR_ID = "astronaut";
export const FREE_AVATAR_IDS = ["astronaut", "hero", "robot"];

export function getAvatarById(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

export function getAvatarRarity(cost) {
  if (cost === 0) return "free";
  if (cost <= 200) return "rare";
  if (cost <= 350) return "epic";
  return "legendary";
}

export function getRarityBorderColor(cost) {
  const rarity = getAvatarRarity(cost);
  switch (rarity) {
    case "free":      return "rgba(156,163,175,0.5)";
    case "rare":      return "rgba(59,130,246,0.6)";
    case "epic":      return "rgba(139,92,246,0.6)";
    case "legendary": return "rgba(245,158,11,0.7)";
    default:          return "rgba(156,163,175,0.5)";
  }
}

export function getRarityGlow(cost) {
  const rarity = getAvatarRarity(cost);
  switch (rarity) {
    case "free":      return "none";
    case "rare":      return "0 0 12px rgba(59,130,246,0.3)";
    case "epic":      return "0 0 16px rgba(139,92,246,0.35)";
    case "legendary": return "0 0 20px rgba(245,158,11,0.4)";
    default:          return "none";
  }
}
