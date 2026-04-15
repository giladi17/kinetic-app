import { useState } from "react";
import { useGame } from "../context/GameContext";
import { getNotificationsEnabled, setNotificationsEnabled, requestPermission, scheduleDailyNotification } from "../utils/notifications";

export default function Settings() {
  const { state, dispatch } = useGame();
  const [notifOn, setNotifOn] = useState(getNotificationsEnabled);

  const handleReset = () => {
    if (confirm("Reset all progress? This cannot be undone!")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const ToggleSwitch = ({ on, onToggle }) => (
    <button
      onClick={onToggle}
      className={`w-12 h-7 rounded-full transition-all duration-200 relative cursor-pointer
                 ${on ? "gradient-primary shadow-[0_0_12px_rgba(139,92,246,0.3)]" : "bg-white/[0.08]"}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform duration-200 shadow-sm
                      ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  const MenuItem = ({ icon, label, onClick, danger }) => (
    <button
      onClick={onClick}
      className={`w-full py-3 rounded-xl glass-light font-medium text-sm
                 active:scale-[0.98] transition-all duration-200 text-left px-4 cursor-pointer
                 ${danger
          ? "hover:border-wrong/30 text-wrong/80 hover:text-wrong"
          : "hover:border-primary/20 text-text"
        }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center"
      onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
    >
      <div
        className="glass w-full max-w-[420px] rounded-t-3xl sm:rounded-3xl p-6 pb-8
                   animate-slide-up shadow-2xl border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text">⚙️ Settings</h2>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SETTINGS" })}
            className="text-text-muted hover:text-text text-xl w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-4 py-3 rounded-xl glass-light">
            <span className="text-text text-sm font-medium">🔊 Sound</span>
            <ToggleSwitch on={state.soundOn} onToggle={() => dispatch({ type: "TOGGLE_SOUND" })} />
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl glass-light">
            <span className="text-text text-sm font-medium">📳 Vibration</span>
            <ToggleSwitch on={state.vibrationOn} onToggle={() => dispatch({ type: "TOGGLE_VIBRATION" })} />
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl glass-light">
            <span className="text-text text-sm font-medium">🔔 Daily Notifications</span>
            <ToggleSwitch on={notifOn} onToggle={async () => {
              const newVal = !notifOn;
              if (newVal) {
                const ok = await requestPermission();
                if (!ok) return;
                scheduleDailyNotification();
              }
              setNotificationsEnabled(newVal);
              setNotifOn(newVal);
            }} />
          </div>

          <div className="border-t border-white/[0.06] my-2" />

          <MenuItem icon="👤" label="Player Profile" onClick={() => {
            dispatch({ type: "TOGGLE_SETTINGS" });
            dispatch({ type: "SET_SCREEN", screen: "profile" });
          }} />
          <MenuItem icon="🎨" label="Create a Level" onClick={() => {
            dispatch({ type: "TOGGLE_SETTINGS" });
            dispatch({ type: "SET_SCREEN", screen: "ugc" });
          }} />
          <MenuItem icon="📖" label="How to Play" onClick={() => {
            dispatch({ type: "TOGGLE_SETTINGS" });
            localStorage.setItem("whooops_tutorial_seen", "false");
            window.location.reload();
          }} />

          <div className="border-t border-white/[0.06] my-2" />

          <MenuItem icon="📧" label="Contact Us" onClick={() => alert("Contact: support@whooops.com")} />
          <MenuItem icon="⭐" label="Rate the App" onClick={() => alert("Thanks for rating! +30 coins 🎉")} />

          <div className="border-t border-white/[0.06] my-2" />

          <MenuItem icon="🗑️" label="Reset Progress" onClick={handleReset} danger />
        </div>

        <div className="mt-6 text-center text-text-muted/40 text-xs">
          WhoOops! v1.0
        </div>
      </div>
    </div>
  );
}
