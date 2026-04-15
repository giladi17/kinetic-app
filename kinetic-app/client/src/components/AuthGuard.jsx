import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <span className="font-headline text-2xl font-black italic text-primary-fixed-dim animate-pulse">KINETIC</span>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  return children
}
