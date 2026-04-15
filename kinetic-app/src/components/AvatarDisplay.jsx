import { getAvatarById, getRarityBorderColor, getRarityGlow } from "../data/avatars";

const SIZE_MAP = {
  topbar:      { container: 28, emoji: 20 },
  leaderboard: { container: 24, emoji: 16 },
  profile:     { container: 64, emoji: 48 },
  duel:        { container: 56, emoji: 40 },
  duelSmall:   { container: 36, emoji: 22 },
};

export default function AvatarDisplay({ avatarId, size = "duel", className = "" }) {
  const avatar = getAvatarById(avatarId);
  const dims = SIZE_MAP[size] || SIZE_MAP.duel;
  const borderColor = getRarityBorderColor(avatar.cost);
  const glow = getRarityGlow(avatar.cost);

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: dims.container,
        height: dims.container,
        fontSize: dims.emoji,
        lineHeight: 1,
        border: `2px solid ${borderColor}`,
        boxShadow: glow,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      {avatar.emoji}
    </div>
  );
}
