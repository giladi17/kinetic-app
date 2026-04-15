import { createContext, useContext, useReducer, useEffect } from "react";
import LEVELS from "../data/levels";
import { savePlayerStreak } from "../utils/firebaseService";
import { isBossLevel, isMysteryLevel, isWorldComplete } from "../data/worlds";
import { DEFAULT_AVATAR_ID, FREE_AVATAR_IDS } from "../data/avatars";
import { updateMissionProgress, setMissionFlag } from "../data/missions";

const GameContext = createContext();

const STORAGE_KEYS = {
  COINS: "whooops_coins",
  CURRENT_LEVEL: "whooops_current_level",
  COMPLETED_LEVELS: "whooops_completed_levels",
  TUTORIAL_SEEN: "whooops_tutorial_seen",
  UGC_LEVELS: "whooops_ugc_levels",
  STREAK: "whooops_streak",
  LEVEL_RESULTS: "whooops_level_results",
  BEST_STREAK: "whooops_best_streak",
  TOTAL_COINS_EARNED: "whooops_total_coins_earned",
  DAILY_STREAK: "whooops_daily_streak",
  LAST_PLAYED_DATE: "whooops_last_played_date",
  SOUND_ON: "whooops_sound_on",
  VIBRATION_ON: "whooops_vibration_on",
  HINT_PACKS: "whooops_hint_packs",
  BLUR_PACKS: "whooops_blur_packs",
  DOUBLE_COINS_LEFT: "whooops_double_coins_left",
  EXTRA_LIVES: "whooops_extra_lives",
  SELECTED_AVATAR: "whooops_selected_avatar",
  UNLOCKED_AVATARS: "whooops_unlocked_avatars",
  SELECTED_BG: "whooops_selected_bg",
  UNLOCKED_BGS: "whooops_unlocked_bgs",
  SELECTED_NAME_COLOR: "whooops_selected_name_color",
  UNLOCKED_NAME_COLORS: "whooops_unlocked_name_colors",
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function loadState() {
  try {
    return {
      coins: parseInt(localStorage.getItem(STORAGE_KEYS.COINS)) || 100,
      currentLevel: parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_LEVEL)) || 1,
      completedLevels: JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_LEVELS)) || [],
      tutorialSeen: localStorage.getItem(STORAGE_KEYS.TUTORIAL_SEEN) === "true",
      ugcLevels: JSON.parse(localStorage.getItem(STORAGE_KEYS.UGC_LEVELS)) || [],
      streak: parseInt(localStorage.getItem(STORAGE_KEYS.STREAK)) || 0,
      levelResults: JSON.parse(localStorage.getItem(STORAGE_KEYS.LEVEL_RESULTS)) || {},
      bestStreak: parseInt(localStorage.getItem(STORAGE_KEYS.BEST_STREAK)) || 0,
      totalCoinsEarned: parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_COINS_EARNED)) || 0,
      dailyStreak: parseInt(localStorage.getItem(STORAGE_KEYS.DAILY_STREAK)) || 0,
      lastPlayedDate: localStorage.getItem(STORAGE_KEYS.LAST_PLAYED_DATE) || null,
      soundOn: localStorage.getItem(STORAGE_KEYS.SOUND_ON) !== "false",
      vibrationOn: localStorage.getItem(STORAGE_KEYS.VIBRATION_ON) !== "false",
      hintPacks: parseInt(localStorage.getItem(STORAGE_KEYS.HINT_PACKS)) || 0,
      blurPacks: parseInt(localStorage.getItem(STORAGE_KEYS.BLUR_PACKS)) || 0,
      doubleCoinsLeft: parseInt(localStorage.getItem(STORAGE_KEYS.DOUBLE_COINS_LEFT)) || 0,
      extraLives: parseInt(localStorage.getItem(STORAGE_KEYS.EXTRA_LIVES)) || 0,
      selectedAvatar: localStorage.getItem(STORAGE_KEYS.SELECTED_AVATAR) || DEFAULT_AVATAR_ID,
      unlockedAvatars: JSON.parse(localStorage.getItem(STORAGE_KEYS.UNLOCKED_AVATARS)) || [...FREE_AVATAR_IDS],
      selectedBg: localStorage.getItem(STORAGE_KEYS.SELECTED_BG) || "default",
      unlockedBgs: JSON.parse(localStorage.getItem(STORAGE_KEYS.UNLOCKED_BGS)) || ["default"],
      selectedNameColor: localStorage.getItem(STORAGE_KEYS.SELECTED_NAME_COLOR) || "white",
      unlockedNameColors: JSON.parse(localStorage.getItem(STORAGE_KEYS.UNLOCKED_NAME_COLORS)) || ["white"],
    };
  } catch {
    return {
      coins: 100,
      currentLevel: 1,
      completedLevels: [],
      tutorialSeen: false,
      ugcLevels: [],
      streak: 0,
      levelResults: {},
      bestStreak: 0,
      totalCoinsEarned: 0,
      dailyStreak: 0,
      lastPlayedDate: null,
      soundOn: true,
      vibrationOn: true,
      hintPacks: 0,
      blurPacks: 0,
      doubleCoinsLeft: 0,
      extraLives: 0,
      selectedAvatar: DEFAULT_AVATAR_ID,
      unlockedAvatars: [...FREE_AVATAR_IDS],
      selectedBg: "default",
      unlockedBgs: ["default"],
      selectedNameColor: "white",
      unlockedNameColors: ["white"],
    };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEYS.COINS, state.coins);
  localStorage.setItem(STORAGE_KEYS.CURRENT_LEVEL, state.currentLevel);
  localStorage.setItem(STORAGE_KEYS.COMPLETED_LEVELS, JSON.stringify(state.completedLevels));
  localStorage.setItem(STORAGE_KEYS.TUTORIAL_SEEN, String(state.tutorialSeen));
  localStorage.setItem(STORAGE_KEYS.UGC_LEVELS, JSON.stringify(state.ugcLevels));
  localStorage.setItem(STORAGE_KEYS.STREAK, state.streak);
  localStorage.setItem(STORAGE_KEYS.LEVEL_RESULTS, JSON.stringify(state.levelResults));
  localStorage.setItem(STORAGE_KEYS.BEST_STREAK, state.bestStreak);
  localStorage.setItem(STORAGE_KEYS.TOTAL_COINS_EARNED, state.totalCoinsEarned);
  localStorage.setItem(STORAGE_KEYS.DAILY_STREAK, state.dailyStreak);
  if (state.lastPlayedDate) localStorage.setItem(STORAGE_KEYS.LAST_PLAYED_DATE, state.lastPlayedDate);
  localStorage.setItem(STORAGE_KEYS.SOUND_ON, String(state.soundOn));
  localStorage.setItem(STORAGE_KEYS.VIBRATION_ON, String(state.vibrationOn));
  localStorage.setItem(STORAGE_KEYS.HINT_PACKS, state.hintPacks);
  localStorage.setItem(STORAGE_KEYS.BLUR_PACKS, state.blurPacks);
  localStorage.setItem(STORAGE_KEYS.DOUBLE_COINS_LEFT, state.doubleCoinsLeft);
  localStorage.setItem(STORAGE_KEYS.EXTRA_LIVES, state.extraLives);
  localStorage.setItem(STORAGE_KEYS.SELECTED_AVATAR, state.selectedAvatar);
  localStorage.setItem(STORAGE_KEYS.UNLOCKED_AVATARS, JSON.stringify(state.unlockedAvatars));
  localStorage.setItem(STORAGE_KEYS.SELECTED_BG, state.selectedBg);
  localStorage.setItem(STORAGE_KEYS.UNLOCKED_BGS, JSON.stringify(state.unlockedBgs));
  localStorage.setItem(STORAGE_KEYS.SELECTED_NAME_COLOR, state.selectedNameColor);
  localStorage.setItem(STORAGE_KEYS.UNLOCKED_NAME_COLORS, JSON.stringify(state.unlockedNameColors));
}

const initialState = {
  ...loadState(),
  screen: "game",
  duelPlaying: false,
  showShop: false,
  showSettings: false,
  hintsUsed: 0,
  wrongAttempts: 0,
  lastActivityTime: Date.now(),
  pendingHint: null,
  worldJustUnlocked: null,
  worldJustEntered: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case "COMPLETE_LEVEL": {
      const hadErrors = state.wrongAttempts > 0;
      const newStreak = hadErrors ? 1 : state.streak + 1;
      const streakBonus = newStreak >= 3 ? 5 : 0;
      const bossBonus = isBossLevel(state.currentLevel) ? 20 : 0;
      const mysteryBonus = isMysteryLevel(state.currentLevel) ? 15 : 0;
      const perfectBonus = state.hintsUsed === 0 && state.wrongAttempts === 0 ? 5 : 0;
      const reward = 10 + streakBonus + bossBonus + mysteryBonus + perfectBonus;

      const today = getToday();
      const yesterday = getYesterday();
      let newDailyStreak = state.dailyStreak;
      let dailyBonus = 0;

      if (state.lastPlayedDate !== today) {
        if (state.lastPlayedDate === yesterday) {
          newDailyStreak = state.dailyStreak + 1;
        } else {
          newDailyStreak = 1;
        }
        if (newDailyStreak === 3) dailyBonus = 5;
        if (newDailyStreak === 7) dailyBonus = 15;
      }

      const baseReward = reward + dailyBonus;
      const multiplier = state.doubleCoinsLeft > 0 ? 2 : 1;
      const totalReward = baseReward * multiplier;
      const newDoubleCoins = state.doubleCoinsLeft > 0 ? state.doubleCoinsLeft - 1 : 0;
      const newCoins = state.coins + totalReward;
      const newCompleted = [...new Set([...state.completedLevels, state.currentLevel])];
      const newResults = {
        ...state.levelResults,
        [state.currentLevel]: {
          hintsUsed: state.hintsUsed,
          wrongAttempts: state.wrongAttempts,
          skipped: false,
          perfect: state.wrongAttempts === 0 && state.hintsUsed === 0,
          solveTimeSeconds: action.solveTime || 0,
          completedAt: Date.now(),
        },
      };
      updateMissionProgress("levels_solved");
      updateMissionProgress("streak_levels");
      if (state.hintsUsed === 0) updateMissionProgress("no_hint_solves");
      if (isMysteryLevel(state.currentLevel)) updateMissionProgress("mystery_solved");

      return {
        ...state,
        coins: newCoins,
        completedLevels: newCompleted,
        streak: newStreak,
        bestStreak: Math.max(state.bestStreak, newStreak),
        totalCoinsEarned: state.totalCoinsEarned + totalReward,
        levelResults: newResults,
        dailyStreak: newDailyStreak,
        lastPlayedDate: today,
        doubleCoinsLeft: newDoubleCoins,
        dailyBonusAwarded: dailyBonus,
        screen: "win",
      };
    }
    case "NEXT_LEVEL": {
      const nextLevel = Math.min(state.currentLevel + 1, LEVELS.length);
      if (isWorldComplete(state.currentLevel)) {
        return {
          ...state,
          currentLevel: nextLevel,
          screen: "worldComplete",
          hintsUsed: 0,
          wrongAttempts: 0,
          lastActivityTime: Date.now(),
        };
      }
      return {
        ...state,
        currentLevel: nextLevel,
        screen: "game",
        hintsUsed: 0,
        wrongAttempts: 0,
        lastActivityTime: Date.now(),
      };
    }
    case "USE_HINT": {
      const cost = action.cost;
      if (state.coins < cost) return state;
      return {
        ...state,
        coins: state.coins - cost,
        hintsUsed: state.hintsUsed + 1,
      };
    }
    case "SKIP_LEVEL": {
      if (state.coins < 150) return state;
      const newCompleted = [...new Set([...state.completedLevels, state.currentLevel])];
      const newResults = {
        ...state.levelResults,
        [state.currentLevel]: {
          hintsUsed: state.hintsUsed,
          wrongAttempts: state.wrongAttempts,
          skipped: true,
          perfect: false,
          completedAt: Date.now(),
        },
      };
      return {
        ...state,
        coins: state.coins - 150,
        completedLevels: newCompleted,
        levelResults: newResults,
        streak: 0,
        screen: "win",
        showShop: false,
      };
    }
    case "CONTINUE_FROM_WORLD": {
      const unlockedWorldIndex = Math.floor((state.currentLevel - 1) / 25);
      return {
        ...state,
        coins: state.coins + 50,
        totalCoinsEarned: state.totalCoinsEarned + 50,
        screen: "levels",
        worldJustUnlocked: unlockedWorldIndex,
        hintsUsed: 0,
        wrongAttempts: 0,
        lastActivityTime: Date.now(),
      };
    }
    case "WRONG_ATTEMPT": {
      const progress = JSON.parse(localStorage.getItem("whooops_daily_missions_progress") || "{}");
      if (progress.streak_levels) {
        progress.streak_levels = 0;
        localStorage.setItem("whooops_daily_missions_progress", JSON.stringify(progress));
      }
      return {
        ...state,
        wrongAttempts: state.wrongAttempts + 1,
      };
    }
    case "SET_SCREEN":
      return { ...state, screen: action.screen, duelPlaying: false };
    case "SET_DUEL_PLAYING":
      return { ...state, duelPlaying: action.value };
    case "TOGGLE_SHOP":
      return { ...state, showShop: !state.showShop };
    case "TOGGLE_SETTINGS":
      return { ...state, showSettings: !state.showSettings };
    case "SET_TUTORIAL_SEEN":
      return { ...state, tutorialSeen: true };
    case "RECORD_ACTIVITY":
      return { ...state, lastActivityTime: Date.now() };
    case "ADD_COINS":
      return { ...state, coins: state.coins + action.amount };
    case "REQUEST_HINT":
      return { ...state, pendingHint: action.hintType };
    case "CLEAR_PENDING_HINT":
      return { ...state, pendingHint: null };
    case "TOGGLE_SOUND":
      return { ...state, soundOn: !state.soundOn };
    case "TOGGLE_VIBRATION":
      return { ...state, vibrationOn: !state.vibrationOn };
    case "GO_TO_LEVEL": {
      const lvl = action.level;
      const isFirstOfWorld = (lvl - 1) % 25 === 0;
      return {
        ...state,
        currentLevel: lvl,
        screen: "game",
        worldJustEntered: isFirstOfWorld ? Math.ceil(lvl / 25) : null,
        hintsUsed: 0,
        wrongAttempts: 0,
        lastActivityTime: Date.now(),
      };
    }
    case "DAILY_CHALLENGE_WIN": {
      const reward = action.coins || 15;
      setMissionFlag("daily_played");
      return { ...state, coins: state.coins + reward, totalCoinsEarned: state.totalCoinsEarned + reward };
    }
    case "DUEL_ENTRY_FEE": {
      const fee = action.amount || 50;
      if (state.coins < fee) return state;
      return { ...state, coins: state.coins - fee };
    }
    case "DUEL_WIN": {
      const winReward = action.coins !== undefined ? action.coins : 100;
      updateMissionProgress("duels_won");
      return { ...state, coins: state.coins + winReward, totalCoinsEarned: state.totalCoinsEarned + winReward };
    }
    case "DUEL_LOSE": {
      const loseReward = action.coins !== undefined ? action.coins : 20;
      return { ...state, coins: state.coins + loseReward, totalCoinsEarned: state.totalCoinsEarned + loseReward };
    }
    case "ADD_UGC_LEVEL": {
      const newUgc = [...state.ugcLevels, { ...action.level, id: Date.now(), status: "Pending" }];
      return { ...state, ugcLevels: newUgc };
    }
    case "BUY_HINT_PACK":
      if (state.coins < action.cost) return state;
      return { ...state, coins: state.coins - action.cost, hintPacks: state.hintPacks + action.amount };
    case "BUY_BLUR_PACK":
      if (state.coins < action.cost) return state;
      return { ...state, coins: state.coins - action.cost, blurPacks: state.blurPacks + action.amount };
    case "BUY_DOUBLE_COINS":
      if (state.coins < 300) return state;
      return { ...state, coins: state.coins - 300, doubleCoinsLeft: state.doubleCoinsLeft + 5 };
    case "BUY_EXTRA_LIFE":
      if (state.coins < 100) return state;
      return { ...state, coins: state.coins - 100, extraLives: state.extraLives + 1 };
    case "USE_HINT_PACK":
      if (state.hintPacks <= 0) return state;
      return { ...state, hintPacks: state.hintPacks - 1, hintsUsed: state.hintsUsed + 1 };
    case "USE_BLUR_PACK":
      if (state.blurPacks <= 0) return state;
      return { ...state, blurPacks: state.blurPacks - 1 };
    case "USE_EXTRA_LIFE":
      if (state.extraLives <= 0) return state;
      return { ...state, extraLives: state.extraLives - 1 };
    case "CLEAR_WORLD_UNLOCK":
      return { ...state, worldJustUnlocked: null };
    case "CLEAR_WORLD_ENTERED":
      return { ...state, worldJustEntered: null };
    case "SELECT_AVATAR":
      if (!state.unlockedAvatars.includes(action.avatarId)) return state;
      return { ...state, selectedAvatar: action.avatarId };
    case "UNLOCK_AVATAR": {
      if (state.unlockedAvatars.includes(action.avatarId)) return state;
      if (state.coins < action.cost) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        unlockedAvatars: [...state.unlockedAvatars, action.avatarId],
        selectedAvatar: action.avatarId,
      };
    }
    case "SELECT_BG":
      if (!state.unlockedBgs.includes(action.bgId)) return state;
      return { ...state, selectedBg: action.bgId };
    case "UNLOCK_BG": {
      if (state.unlockedBgs.includes(action.bgId)) return state;
      if (state.coins < action.cost) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        unlockedBgs: [...state.unlockedBgs, action.bgId],
        selectedBg: action.bgId,
      };
    }
    case "SELECT_NAME_COLOR":
      if (!state.unlockedNameColors.includes(action.colorId)) return state;
      return { ...state, selectedNameColor: action.colorId };
    case "UNLOCK_NAME_COLOR": {
      if (state.unlockedNameColors.includes(action.colorId)) return state;
      if (state.coins < action.cost) return state;
      return {
        ...state,
        coins: state.coins - action.cost,
        unlockedNameColors: [...state.unlockedNameColors, action.colorId],
        selectedNameColor: action.colorId,
      };
    }
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    saveState(state);
  }, [state.coins, state.currentLevel, state.completedLevels, state.tutorialSeen, state.ugcLevels, state.streak, state.levelResults, state.bestStreak, state.totalCoinsEarned, state.dailyStreak, state.lastPlayedDate, state.soundOn, state.vibrationOn, state.hintPacks, state.blurPacks, state.doubleCoinsLeft, state.extraLives, state.selectedAvatar, state.unlockedAvatars, state.selectedBg, state.unlockedBgs, state.selectedNameColor, state.unlockedNameColors]);

  useEffect(() => {
    savePlayerStreak(state.streak, state.dailyStreak);
  }, [state.streak, state.dailyStreak]);

  const currentLevelData = LEVELS[state.currentLevel - 1] || LEVELS[0];

  return (
    <GameContext.Provider value={{ state, dispatch, currentLevelData, levels: LEVELS }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
