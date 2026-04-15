import { useState, useEffect, useCallback, useRef } from "react";
import { GameProvider, useGame } from "./context/GameContext";
import LEVELS from "./data/levels";
import TopBar from "./components/TopBar";
import GameScreen from "./components/GameScreen";
import WinScreen from "./components/WinScreen";
import Tutorial from "./components/Tutorial";
import CoinShop from "./components/CoinShop";
import Settings from "./components/Settings";
import UGCForm from "./components/UGCForm";
import NavBar from "./components/NavBar";
import MySuccesses from "./components/MySuccesses";
import Leaderboard from "./components/Leaderboard";
import LevelSelect from "./components/LevelSelect";
import DuelLobby from "./components/SpeedDuel/DuelLobby";
import DailyHub from "./components/DailyChallenge/DailyHub";
import PlayerProfile from "./components/PlayerProfile";
import DailyRewardPopup from "./components/DailyRewardPopup";
import ParticleBackground from "./components/ParticleBackground";
import SplashScreen from "./components/SplashScreen";
import WorldCompleteScreen from "./components/WorldCompleteScreen";
import ChallengeScreen from "./components/ChallengeScreen";
import { initNotifications } from "./utils/notifications";
import InstallBanner from "./components/InstallBanner";
import BadgeUnlockPopup from "./components/BadgeUnlockPopup";

const NICK_KEY = "whooops_nickname";
const DUEL_NICK_KEY = "duelNickname";

function UsernamePrompt({ onDone }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    localStorage.setItem(NICK_KEY, trimmed);
    localStorage.setItem(DUEL_NICK_KEY, trimmed);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
         style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #0F0F1A 100%)" }}>
      <div className="w-full max-w-[400px] flex flex-col items-center gap-6 px-6 animate-fade-in">
        <span className="text-6xl">🎭</span>
        <h1 className="text-3xl font-extrabold text-white text-center">
          What should we call you?
        </h1>
        <p className="text-white/50 text-sm text-center">
          This name will appear in duels and leaderboards
        </p>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Enter your name..."
          maxLength={16}
          className="w-full max-w-[300px] px-5 py-4 rounded-2xl text-white font-bold text-center text-xl
                     placeholder:text-white/20 outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "2px solid rgba(124,58,237,0.4)",
            boxShadow: "0 0 24px rgba(124,58,237,0.15)",
          }}
        />
        <button
          onClick={handleSave}
          disabled={name.trim().length < 2}
          className={`w-full max-w-[300px] py-4 rounded-2xl font-extrabold text-base
                     transition-all duration-200 cursor-pointer active:scale-95
                     ${name.trim().length >= 2
                       ? "text-white shadow-[0_4px_32px_rgba(139,92,246,0.4)]"
                       : "text-white/20 cursor-not-allowed"}`}
          style={name.trim().length >= 2 ? {
            background: "linear-gradient(135deg, #7C3AED, #F59E0B)",
            boxShadow: "0 6px 30px rgba(124,58,237,0.35), 0 6px 30px rgba(245,158,11,0.2)",
          } : {
            background: "rgba(124,58,237,0.15)",
            border: "2px solid rgba(124,58,237,0.2)",
          }}
        >
          {name.trim().length >= 2 ? "Let's Go! 🚀" : "Continue →"}
        </button>
        <button
          onClick={() => { localStorage.setItem(NICK_KEY, "Player"); localStorage.setItem(DUEL_NICK_KEY, "Player"); onDone(); }}
          className="text-white/20 text-xs hover:text-white/40 transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { state } = useGame();
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("whooops_splash_seen"));
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const justFinishedTutorial = useRef(false);

  const dismissSplash = useCallback(() => {
    sessionStorage.setItem("whooops_splash_seen", "1");
    setShowSplash(false);
  }, []);

  useEffect(() => {
    initNotifications();
  }, []);

  // Detect when tutorial finishes for the first time -> show username prompt
  useEffect(() => {
    if (state.tutorialSeen && !localStorage.getItem(NICK_KEY)) {
      setShowUsernamePrompt(true);
    }
  }, [state.tutorialSeen]);

  if (showSplash) return <SplashScreen onDone={dismissSplash} />;

  const showNavBar = !state.duelPlaying && state.screen !== "win" && state.screen !== "worldComplete";

  return (
    <div className="w-full max-w-[480px] min-h-screen flex flex-col bg-surface font-poppins relative mx-auto">
      <ParticleBackground />
      {!state.tutorialSeen && <Tutorial />}
      {showUsernamePrompt && <UsernamePrompt onDone={() => setShowUsernamePrompt(false)} />}

      <TopBar />

      <main className="flex-1 flex flex-col overflow-y-auto pb-[80px]">
        {state.screen === "game" && <GameScreen />}
        {state.screen === "win" && <WinScreen />}
        {state.screen === "ugc" && <UGCForm />}
        {state.screen === "successes" && <MySuccesses />}
        {state.screen === "leaderboard" && <Leaderboard />}
        {state.screen === "levels" && <LevelSelect />}
        {state.screen === "duel" && <DuelLobby />}
        {state.screen === "daily" && <DailyHub />}
        {state.screen === "profile" && <PlayerProfile />}
        {state.screen === "worldComplete" && <WorldCompleteScreen />}
      </main>

      {showNavBar && <NavBar />}

      {state.showShop && <CoinShop />}
      {state.showSettings && <Settings />}
      <DailyRewardPopup />
      <BadgeUnlockPopup />
      <InstallBanner />
    </div>
  );
}

function parseChallengeParams() {
  const params = new URLSearchParams(window.location.search);
  const challenge = params.get("challenge");
  if (!challenge) return null;
  const raw = parseInt(challenge);
  const time = parseInt(params.get("time")) || 0;
  if (isNaN(raw) || raw < 1) return null;
  const level = Math.min(Math.max(raw, 1), LEVELS.length);

  const tutorialSeen = localStorage.getItem("whooops_tutorial_seen") === "true";
  const isNewUser = !tutorialSeen;

  if (!isNewUser) {
    const currentLevel = localStorage.getItem("whooops_current_level") || "1";
    localStorage.setItem("whooops_challenge_return_level", currentLevel);
  }

  return { level, friendTime: time, isNewUser };
}

export default function App() {
  const [challengeParams, setChallengeParams] = useState(parseChallengeParams);

  const handlePlayFullGame = () => {
    window.history.replaceState({}, "", window.location.pathname);

    if (challengeParams?.isNewUser) {
      localStorage.setItem("whooops_tutorial_seen", "true");
      if (!localStorage.getItem(NICK_KEY)) {
        localStorage.setItem(NICK_KEY, "Player");
        localStorage.setItem(DUEL_NICK_KEY, "Player");
      }
    } else {
      localStorage.removeItem("whooops_challenge_return_level");
    }

    setChallengeParams(null);
  };

  if (challengeParams) {
    return (
      <div className="min-h-screen"
           style={{ background: "linear-gradient(135deg, #1a1033 0%, #0f0f1a 30%, #0f0f1a 70%, #1a1033 100%)" }}>
        <ChallengeScreen
          levelNumber={challengeParams.level}
          friendTime={challengeParams.friendTime}
          isNewUser={challengeParams.isNewUser}
          onPlayFullGame={handlePlayFullGame}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen"
         style={{ background: "linear-gradient(135deg, #1a1033 0%, #0f0f1a 30%, #0f0f1a 70%, #1a1033 100%)" }}>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </div>
  );
}
