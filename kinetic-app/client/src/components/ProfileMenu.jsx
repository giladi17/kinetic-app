import { useNavigate } from 'react-router-dom'

export default function ProfileMenu() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/profile')}
      className="w-9 h-9 rounded-full bg-primary-container/20 flex items-center justify-center"
    >
      <span
        className="material-symbols-outlined text-primary-fixed-dim"
        style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
      >
        person
      </span>
    </button>
  )
}
