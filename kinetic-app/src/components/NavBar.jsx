import { useGame } from "../context/GameContext";

const TABS = [
  { screen: "game", label: "Play", icon: "🎮", activeIcon: "🎮" },
  { screen: "daily", label: "Daily", icon: "👑", activeIcon: "👑" },
  { screen: "duel", label: "Duel", icon: "⚡", activeIcon: "⚡" },
  { screen: "levels", label: "Levels", icon: "🎯", activeIcon: "🎯" },
  { screen: "successes", label: "My Wins", icon: "🏆", activeIcon: "🏆" },
  { screen: "leaderboard", label: "Ranking", icon: "📊", activeIcon: "📊" },
];

export default function NavBar() {
  const { state, dispatch } = useGame();

  const activeScreen = state.screen === "win" ? "game" : state.screen;

  return (
    <nav className="glass fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px]"
         style={{
           borderTop: "1px solid rgba(124,58,237,0.2)",
           boxShadow: "0 -4px 20px rgba(124,58,237,0.08)",
           zIndex: 40,
         }}>
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map((tab) => {
          const isActive = activeScreen === tab.screen;
          return (
            <button
              key={tab.screen}
              onClick={() => dispatch({ type: "SET_SCREEN", screen: tab.screen })}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 rounded-xl transition-all cursor-pointer
                ${isActive
                  ? "scale-105"
                  : "hover:bg-white/[0.04]"
                }`}
              style={{
                minHeight: "44px",
                ...(isActive ? {
                  background: "rgba(124,58,237,0.25)",
                  boxShadow: "0 0 12px rgba(124,58,237,0.2)",
                } : {}),
              }}
            >
              <span className={`transition-transform ${isActive ? "scale-110" : ""}`}
                    style={{ fontSize: "26px", lineHeight: 1 }}>
                {isActive ? tab.activeIcon : tab.icon}
              </span>
              <span className="text-[10px] font-semibold tracking-wide text-white">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
