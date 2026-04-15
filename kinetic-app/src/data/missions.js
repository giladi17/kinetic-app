const MISSION_POOL = [
  { id: "solve_3",       label: "Solve 3 levels",              target: 3, reward: 30, trackKey: "levels_solved" },
  { id: "no_hints",      label: "Solve 1 level without hints", target: 1, reward: 25, trackKey: "no_hint_solves" },
  { id: "win_duel",      label: "Win a Duel",                  target: 1, reward: 50, trackKey: "duels_won" },
  { id: "play_daily",    label: "Play Daily Challenge",        target: 1, reward: 20, trackKey: "daily_played" },
  { id: "mystery_level", label: "Solve a Mystery Level",       target: 1, reward: 40, trackKey: "mystery_solved" },
  { id: "no_reveal",     label: "Use no Reveal today",         target: 1, reward: 35, trackKey: "no_reveal_day" },
  { id: "streak_2",      label: "Solve 2 levels in a row",     target: 2, reward: 30, trackKey: "streak_levels" },
];

const MISSIONS_KEY = "whooops_daily_missions";
const MISSIONS_DATE_KEY = "whooops_daily_missions_date";
const MISSIONS_PROGRESS_KEY = "whooops_daily_missions_progress";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getDailyMissions() {
  const today = getToday();
  const storedDate = localStorage.getItem(MISSIONS_DATE_KEY);

  if (storedDate === today) {
    try {
      const stored = JSON.parse(localStorage.getItem(MISSIONS_KEY));
      if (stored && stored.length === 3) return stored;
    } catch {}
  }

  const picked = shuffle(MISSION_POOL).slice(0, 3);
  localStorage.setItem(MISSIONS_KEY, JSON.stringify(picked));
  localStorage.setItem(MISSIONS_DATE_KEY, today);
  localStorage.setItem(MISSIONS_PROGRESS_KEY, JSON.stringify({}));
  return picked;
}

export function getMissionProgress() {
  const today = getToday();
  const storedDate = localStorage.getItem(MISSIONS_DATE_KEY);
  if (storedDate !== today) return {};
  try {
    return JSON.parse(localStorage.getItem(MISSIONS_PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

export function updateMissionProgress(trackKey, increment = 1) {
  const today = getToday();
  const storedDate = localStorage.getItem(MISSIONS_DATE_KEY);
  if (storedDate !== today) return;

  const progress = getMissionProgress();
  progress[trackKey] = (progress[trackKey] || 0) + increment;
  localStorage.setItem(MISSIONS_PROGRESS_KEY, JSON.stringify(progress));
}

export function setMissionFlag(trackKey) {
  const today = getToday();
  const storedDate = localStorage.getItem(MISSIONS_DATE_KEY);
  if (storedDate !== today) return;

  const progress = getMissionProgress();
  progress[trackKey] = 1;
  localStorage.setItem(MISSIONS_PROGRESS_KEY, JSON.stringify(progress));
}

export function getClaimedMissions() {
  const today = getToday();
  const key = `whooops_missions_claimed_${today}`;
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

export function claimMission(missionId) {
  const today = getToday();
  const key = `whooops_missions_claimed_${today}`;
  const claimed = getClaimedMissions();
  if (!claimed.includes(missionId)) {
    claimed.push(missionId);
    localStorage.setItem(key, JSON.stringify(claimed));
  }
}
