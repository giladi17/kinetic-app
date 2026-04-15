const TITLES = [
  { min: 0,   emoji: "\u{1F331}", name: "Rookie" },
  { min: 10,  emoji: "\u{1F525}", name: "Rising Star" },
  { min: 25,  emoji: "\u26A1",    name: "Pro" },
  { min: 50,  emoji: "\u{1F48E}", name: "Expert" },
  { min: 100, emoji: "\u{1F3C6}", name: "Legend" },
  { min: 150, emoji: "\u{1F451}", name: "WhoOops Master" },
];

export function getPlayerTitle(levelsCompleted) {
  let title = TITLES[0];
  for (const t of TITLES) {
    if (levelsCompleted >= t.min) title = t;
  }
  return title;
}
