import { NavLink } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'

export default function BottomNav() {
  const { t } = useLang()

  const NAV_ITEMS = [
    { to: '/dashboard', icon: 'home_max', label: t('nav.home') },
    { to: '/workouts', icon: 'fitness_center', label: t('nav.workouts') },
    { to: '/nutrition', icon: 'restaurant', label: t('nav.nutrition') },
    { to: '/supplements', icon: 'medication', label: t('nav.supplements') },
    { to: '/plans', icon: 'event_note', label: t('nav.plans') },
    { to: '/progress', icon: 'insights', label: t('nav.progress') },
    { to: '/pricing', icon: 'workspace_premium', label: 'Pro' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 kinetic-nav-bg bg-[#0e0e0e]/80 backdrop-blur-2xl z-50 rounded-t-xl">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => { if (navigator.vibrate) navigator.vibrate(10) }}
          className={({ isActive }) =>
            isActive
              ? 'flex flex-col items-center justify-center bg-[#CCFF00] text-[#0e0e0e] rounded-md px-3 py-1 active:scale-90 duration-300'
              : 'flex flex-col items-center justify-center text-[#adaaaa] opacity-50 hover:opacity-100 hover:text-[#CCFF00] transition-all active:scale-90 duration-300'
          }
        >
          {({ isActive }) => (
            <>
              <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="font-headline font-bold text-[10px] tracking-widest mt-0.5">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
