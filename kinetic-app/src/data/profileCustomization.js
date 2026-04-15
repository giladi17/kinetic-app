export const BACKGROUNDS = [
  { id: "default", name: "Default",  cost: 0,   gradient: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))", preview: "#7C3AED" },
  { id: "sunset",  name: "Sunset",   cost: 200, gradient: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(236,72,153,0.15))",  preview: "#F97316" },
  { id: "ocean",   name: "Ocean",    cost: 200, gradient: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(20,184,166,0.15))",   preview: "#3B82F6" },
  { id: "forest",  name: "Forest",   cost: 300, gradient: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,78,99,0.2))",       preview: "#22C55E" },
  { id: "galaxy",  name: "Galaxy",   cost: 400, gradient: "linear-gradient(135deg, rgba(88,28,135,0.3), rgba(30,64,175,0.2))",      preview: "#581C87" },
  { id: "gold",    name: "Gold VIP", cost: 500, gradient: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(180,83,9,0.15))",     preview: "#F59E0B" },
];

export const USERNAME_COLORS = [
  { id: "white",  name: "White",  cost: 0,   color: "#F1F5F9" },
  { id: "blue",   name: "Blue",   cost: 100, color: "#60A5FA" },
  { id: "green",  name: "Green",  cost: 100, color: "#4ADE80" },
  { id: "orange", name: "Orange", cost: 150, color: "#FB923C" },
  { id: "pink",   name: "Pink",   cost: 150, color: "#F472B6" },
  { id: "purple", name: "Purple", cost: 200, color: "#A78BFA" },
  { id: "silver", name: "Silver", cost: 300, color: "#CBD5E1" },
  { id: "gold",   name: "Gold",   cost: 500, color: "#FBBF24" },
];

export function getBackgroundById(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];
}

export function getUsernameColorById(id) {
  return USERNAME_COLORS.find((c) => c.id === id) || USERNAME_COLORS[0];
}
