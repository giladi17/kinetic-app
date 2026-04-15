import { useUser } from '../context/UserContext'

export default function PremiumBadge() {
  const { user } = useUser()
  if (!user) return null

  if (user.isPremium) {
    return (
      <div className="inline-flex items-center gap-2 bg-primary-container/15 px-4 py-2 rounded-full">
        <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse" />
        <span className="font-label text-xs text-primary-fixed-dim font-bold tracking-widest">
          PREMIUM ✦ {user.daysLeft} ימים
        </span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 bg-[#ffa500]/10 px-4 py-2 rounded-full">
      <span className="w-2 h-2 rounded-full bg-[#ffa500]" />
      <span className="font-label text-xs text-[#ffa500] font-bold tracking-widest">
        TRIAL הסתיים — שדרג
      </span>
    </div>
  )
}
