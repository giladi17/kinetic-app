import { NavLink } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'

export default function Sidebar() {
  const { t } = useLang()

  const NAV_ITEMS = [
    { to: '/dashboard', icon: 'home_max', label: t('nav.home') },
    { to: '/nutrition', icon: 'restaurant', label: t('nav.nutrition') },
    { to: '/supplements', icon: 'medication', label: t('nav.supplements') },
    { to: '/plans', icon: 'event_note', label: t('nav.plans') },
    { to: '/progress', icon: 'insights', label: t('nav.progress') },
    { to: '/pricing', icon: 'workspace_premium', label: 'Pro' },
  ]

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-6 pt-20 gap-2 kinetic-nav-bg bg-[#0e0e0e]/80 backdrop-blur-2xl z-40 border-r border-white/5">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => { if (navigator.vibrate) navigator.vibrate(10) }}
          className={({ isActive }) =>
            `relative group ${isActive
              ? 'flex flex-col items-center justify-center bg-[#CCFF00] text-[#0e0e0e] rounded-xl w-14 py-2 active:scale-90 duration-300'
              : 'flex flex-col items-center justify-center text-[#adaaaa] opacity-50 hover:opacity-100 hover:text-[#CCFF00] rounded-xl w-14 py-2 transition-all active:scale-90 duration-300'}`
          }
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="font-headline font-bold text-[8px] tracking-widest mt-0.5">{item.label}</span>
              {/* Tooltip — appears to the right on hover */}
              <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 z-50 bg-[#151C25] text-white text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                {item.label}
                <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#151C25]" />
              </div>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  )
}
