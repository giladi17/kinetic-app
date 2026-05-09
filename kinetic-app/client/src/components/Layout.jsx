import { Outlet } from 'react-router-dom'
import TopAppBar from './TopAppBar'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import AIChat from './AIChat'
import MorningCheckin from './MorningCheckin'
import PaywallModal from './PaywallModal'
import StreakProtectionBanner from './StreakProtectionBanner'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#F8F9FF] dark:bg-[#050505] text-[#151C25] dark:text-white">
      <TopAppBar />
      <Sidebar />
      <StreakProtectionBanner />
      <MorningCheckin />
      <div className="md:pl-20">
        <Outlet />
      </div>
      <BottomNav />
      <AIChat />
      <PaywallModal />
    </div>
  )
}
