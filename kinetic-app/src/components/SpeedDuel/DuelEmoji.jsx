import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../firebase";
import { ref, push, onValue, off } from "firebase/database";

const EMOJI_LIST = ["😂", "🔥", "👏", "😤", "🤔", "😎", "💀", "🫡", "😱", "👑", "🤝", "💪"];
const RATE_LIMIT_MS = 2000;
const BUBBLE_DURATION = 2000;

function getDeviceId() {
  return localStorage.getItem("whooops_device_id") || "";
}

export default function DuelEmoji({ roomCode, myKey }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myBubble, setMyBubble] = useState(null);
  const [oppBubble, setOppBubble] = useState(null);
  const lastSentRef = useRef(0);
  const lastSeenRef = useRef(0);
  const myBubbleTimer = useRef(null);
  const oppBubbleTimer = useRef(null);
  const deviceId = getDeviceId();
  const chatPath = `duels/${roomCode}/chat`;

  useEffect(() => {
    if (!db || !roomCode) return;
    const chatRef = ref(db, chatPath);
    const handler = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) return;
      let latest = null;
      snapshot.forEach((child) => {
        const msg = child.val();
        if (msg.timestamp > lastSeenRef.current) {
          latest = msg;
        }
      });
      if (!latest) return;
      lastSeenRef.current = latest.timestamp;

      if (latest.sender === deviceId) {
        setMyBubble(latest.emoji);
        if (myBubbleTimer.current) clearTimeout(myBubbleTimer.current);
        myBubbleTimer.current = setTimeout(() => setMyBubble(null), BUBBLE_DURATION);
      } else {
        setOppBubble(latest.emoji);
        if (oppBubbleTimer.current) clearTimeout(oppBubbleTimer.current);
        oppBubbleTimer.current = setTimeout(() => setOppBubble(null), BUBBLE_DURATION);
      }
    }, () => {});

    return () => {
      off(chatRef);
      if (myBubbleTimer.current) clearTimeout(myBubbleTimer.current);
      if (oppBubbleTimer.current) clearTimeout(oppBubbleTimer.current);
    };
  }, [chatPath, roomCode, deviceId]);

  const handleSend = useCallback((emoji) => {
    if (!db || !roomCode) return;
    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) return;
    lastSentRef.current = now;

    push(ref(db, chatPath), {
      sender: deviceId,
      emoji,
      timestamp: now,
    });

    setPickerOpen(false);
  }, [chatPath, roomCode, deviceId]);

  return (
    <>
      {/* Emoji bubbles – rendered by parent via the exported hooks, but we also provide
          absolute-positioned overlays that the parent can place */}
      <EmojiOverlay position="left" emoji={myBubble} />
      <EmojiOverlay position="right" emoji={oppBubble} />

      {/* Floating chat button */}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 w-11 h-11 rounded-full flex items-center justify-center
                   text-lg shadow-[0_4px_16px_rgba(124,58,237,0.35)] cursor-pointer active:scale-90 transition-all"
        style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)" }}
      >
        💬
      </button>

      {/* Emoji picker popup */}
      {pickerOpen && (
        <div className="fixed bottom-[68px] right-4 z-40 animate-fade-in">
          <div className="glass rounded-2xl p-2.5 grid grid-cols-4 gap-1.5"
               style={{ border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSend(emoji)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl
                           cursor-pointer active:scale-75 transition-all duration-150 hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Close picker on tap outside */}
      {pickerOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setPickerOpen(false)} />
      )}
    </>
  );
}

function EmojiOverlay({ position, emoji }) {
  if (!emoji) return null;
  const posClass = position === "left" ? "left-6" : "right-6";
  return (
    <div className={`fixed top-[52px] ${posClass} z-40 pointer-events-none animate-emoji-float`}>
      <div className="rounded-full px-2.5 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
           style={{ background: "rgba(30,20,50,0.85)", border: "1px solid rgba(255,255,255,0.15)" }}>
        <span className="text-2xl">{emoji}</span>
      </div>
    </div>
  );
}
