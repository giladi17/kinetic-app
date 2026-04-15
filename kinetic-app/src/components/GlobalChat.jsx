import { useState, useEffect, useRef, useCallback } from "react";
import { useGame } from "../context/GameContext";
import { db } from "../firebase";
import { ref, push, query, orderByChild, limitToLast, onValue, off } from "firebase/database";
import AvatarDisplay from "./AvatarDisplay";

const EMOJI_GRID = [
  "\u{1F44D}", "\u{1F44E}", "\u{1F44B}", "\u{1F44F}", "\u{1F525}", "\u{2764}\uFE0F",
  "\u{1F602}", "\u{1F60E}", "\u{1F60D}", "\u{1F914}", "\u{1F62D}", "\u{1F621}",
  "\u{1F3C6}", "\u{26A1}", "\u{1F4AA}", "\u{1F389}", "\u{1F60A}", "\u{1F62E}",
  "\u{1F47B}", "\u{1F916}", "\u{1F451}", "\u{1FA99}", "\u{2694}\uFE0F", "\u{1F440}",
];

const RATE_LIMIT_MS = 3000;

function getDeviceId() {
  let id = localStorage.getItem("whooops_device_id");
  if (!id) {
    id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("whooops_device_id", id);
  }
  return id;
}

function formatTime(ts) {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function DuelChat({ roomCode, onClose }) {
  const { state } = useGame();
  const [messages, setMessages] = useState([]);
  const [cooldown, setCooldown] = useState(false);
  const scrollRef = useRef(null);
  const lastSentRef = useRef(0);
  const nickname = localStorage.getItem("whooops_nickname") || "Player";
  const chatPath = `duels/${roomCode}/chat`;

  useEffect(() => {
    if (!db || !roomCode) return;
    const chatRef = query(ref(db, chatPath), orderByChild("date"), limitToLast(50));
    const handler = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) { setMessages([]); return; }
      const msgs = [];
      snapshot.forEach((child) => {
        msgs.push({ id: child.key, ...child.val() });
      });
      msgs.sort((a, b) => a.date - b.date);
      setMessages(msgs);
    }, () => {});

    return () => off(chatRef);
  }, [chatPath, roomCode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback((emoji) => {
    if (!db || !roomCode) return;
    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) return;
    lastSentRef.current = now;
    setCooldown(true);
    setTimeout(() => setCooldown(false), RATE_LIMIT_MS);

    const deviceId = getDeviceId();
    push(ref(db, chatPath), {
      uid: deviceId,
      username: nickname,
      avatar: state.selectedAvatar || "astronaut",
      emoji,
      date: now,
    });
  }, [nickname, state.selectedAvatar, chatPath, roomCode]);

  const myId = getDeviceId();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in"
         onClick={onClose}>
      <div className="glass rounded-3xl w-full max-w-[400px] mx-4 flex flex-col animate-bounce-in overflow-hidden"
           style={{ maxHeight: "80vh", border: "1px solid rgba(255,255,255,0.12)" }}
           onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5"
             style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h3 className="text-base font-extrabold text-text flex items-center gap-2">
            <span className="text-lg">{"\u{1F4AC}"}</span> Duel Chat
          </h3>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full glass flex items-center justify-center text-text-muted
                             hover:text-text cursor-pointer transition-colors active:scale-95 text-sm">
            {"\u2715"}
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef}
             className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
             style={{ minHeight: "200px", maxHeight: "400px" }}>
          {messages.length === 0 ? (
            <div className="text-center py-8 flex flex-col items-center gap-2">
              <span className="text-3xl">{"\u{1F4AC}"}</span>
              <p className="text-text-muted text-sm">No messages yet. Say hi!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.uid === myId;
              return (
                <div key={msg.id}
                     className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <AvatarDisplay avatarId={msg.avatar || "astronaut"} size="leaderboard" />
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] text-text-muted font-semibold mb-0.5">
                      {isMe ? "You" : msg.username} {"\u00B7"} {formatTime(msg.date)}
                    </span>
                    <div className="rounded-2xl px-3 py-2"
                         style={{
                           background: isMe ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.06)",
                           border: isMe ? "1px solid rgba(124,58,237,0.25)" : "1px solid rgba(255,255,255,0.08)",
                         }}>
                      <span className="text-2xl">{msg.emoji}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Emoji picker */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJI_GRID.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                disabled={cooldown}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg
                           cursor-pointer active:scale-90 transition-all duration-150
                           ${cooldown ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10"}`}
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {emoji}
              </button>
            ))}
          </div>
          {cooldown && (
            <p className="text-[10px] text-text-muted/50 text-center mt-1.5 font-semibold">
              Wait a moment...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
