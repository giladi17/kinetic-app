import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWorkouts } from '../api'
import { useLang } from '../context/LanguageContext'

const CATEGORIES = ['ALL', 'STRENGTH', 'CARDIO', 'YOGA', 'HIIT']

const CATEGORY_LABELS = {
  ALL: { he: 'הכל', en: 'All' },
  STRENGTH: { he: 'כוח', en: 'Strength' },
  CARDIO: { he: 'קרדיו', en: 'Cardio' },
  HIIT: { he: 'HIIT', en: 'HIIT' },
  YOGA: { he: 'יוגה', en: 'Yoga' },
}

const CARD_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBfddY1jl5oT9oP4oUo5LXYxEGD6K1WLtg63-n2vfJVF5yop4tgpc_7Xo27dBRqR2-gl6gOfPeyqDcmK7llZW8guwATO2LKrcePqG-FfnFjLZN0b4eps4-YkJIXFlH3XU6zVCGdzX8hnzBwA5UjXBd2xg3NFSlUjlrasuza3Lm7L-wUonkIROZeDCPs5m8u8DlOtbXW3psEFa17qw-6UzyprJsEb3wC8I8--J4mEYG_39MAqkVrAUo3MgUUfwSFHUqhgquDe4JNPvI',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAkAnXlf3wb_wQtj8n-zySsjD7OgNc_CmIHC5kgBZzUt1obdU_gIyQ8_lxOC1h84xfZPfwfMa2WLCwi8PFxFkGATcmSjzYTu78q6Gs9iPnx0raDAzLT1Q1taRl_gycpstd80H2W3A-tW59Ld5VD8nekXNum557yTWq7fM5RCKspqtUIoYiAecwTNLUm03JsrjFSXOH0RvoC2xNP2kid9BqnJlSS_tbqhIAsf1pYHm7ThPdvTv5srC4mU5H--xU75vj9zgXRhOVMogc',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAtZJ57iXdPDG36MSuvVA_ElfvVEKgH2wOuUSFQ-OglyjPWQdnafZtQckUIq7NujOlCbhr67kwlbj4RY5BpkD1FHbmohdWpQBEwCGYfDfN6XRrayExTm3U9S0pW36pZIkbXr-0Wn4cLHkt_QsRKSnaEmGUnK9DPqWBKbCOHiEraaBuHQYDjf0Q8su2DGx3Bl4BaMiA2v55HD0tFIC7-jPpJOdJtDIYKYc6gBIMEeFEV_8l1iC1kqv3tdmAefPzUKz7aMvgE5N4ftu4',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuASvMwKBTWK60g2lEkenKJnQ1LNpX0_zbe91g9zHnjJJM8ghB4CILR7LaelRrDwqKfTQMtFDD9Lan9S9S8pU3K5Mj3wRPR8hk_CD9g1Z5bYQ_Qt0nT62zgjLcs4gxGYH5szcExLvz0Fl55OfxyFguht4PSb2AKb7r9EQ5RpEsyy3qeTNfReopz1zKJT5QD8FGkj4GbeUIKQ6ec_wgQExSB1v7bBIpeQXv-TsPl0y7eTP4tvXi_-3h3B4RRnNlQ-CAwV-6shStByC34',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBKUvsYXRY0EZVEbjD4HiIVsLeLrooUFOk4cv7SbtBr1Y8rbxhfhSyGYIdBmT2L_Hux7gMWNyH1L4bV50_6yppBE0BOJGn_SH5VJfRGbLA_25aHrvb6PTEfc-GFzxOZzIGKQLu9HgjhwmVWkrCbe-vhdMsspr7WUgdr6aRhGrDyzUIKTDAp-9mFdRhFdQGLXSuKdbaH77N8AtPBH2usmWZfVaiuALZ9WPvRIRsp15oIoMJHyQHx3T96-dWCCR5iZYhAiaTFCTO4oMA',
]

export default function WorkoutLibrary() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [workouts, setWorkouts] = useState([])
  const [category, setCategory] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkouts(category === 'ALL' ? '' : category)
      .then(setWorkouts)
      .catch(() => setWorkouts(FALLBACK_WORKOUTS))
      .finally(() => setLoading(false))
  }, [category])

  const filtered = workouts.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const LEVEL_COLOR = {
    BEGINNER: 'bg-primary-container text-on-primary-container',
    INTERMEDIATE: 'bg-primary-container text-on-primary-container',
    ADVANCED: 'bg-secondary-dim text-on-secondary',
    ELITE: 'bg-secondary-dim text-on-secondary',
  }

  return (
    <main className="pt-24 pb-32 px-6 max-w-7xl mx-auto">
      <section className="mb-12">
        <div className="flex flex-col gap-2 mb-8">
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold">ספריית אימונים</span>
          <h2 className="font-headline text-4xl md:text-5xl font-bold tracking-tight">
            FUEL YOUR <br /><span className="text-primary-container italic">PERFORMANCE.</span>
          </h2>
        </div>
        <div className="relative group mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary-container transition-colors">search</span>
          </div>
          <input
            className="w-full bg-surface-container-highest border-b-2 border-transparent focus:border-primary-container focus:ring-0 text-on-surface py-5 pl-14 rounded-t-xl font-body transition-all duration-300 placeholder:text-on-surface-variant/40 outline-none"
            placeholder="חפש תרגילים..."
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full font-label text-sm font-bold tracking-wide transition-all border border-outline-variant/10 active:scale-95 ${
                category === cat
                  ? 'bg-primary-dim text-on-primary'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {CATEGORY_LABELS[cat]?.[lang] || cat}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((workout, i) => (
          <div
            key={workout.id}
            onClick={() => navigate(`/workout/${workout.id}`)}
            className={`${i === 0 ? 'lg:col-span-2' : ''} group relative overflow-hidden rounded-xl bg-surface-container-low transition-all duration-500 hover:translate-y-[-4px] cursor-pointer`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 opacity-80"></div>
            <img
              className={`w-full ${i === 0 ? 'h-[400px]' : 'h-[300px] lg:h-[400px]'} object-cover transition-transform duration-700 group-hover:scale-110`}
              src={CARD_IMAGES[i % CARD_IMAGES.length]}
              alt={workout.name}
            />
            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <span className={`${LEVEL_COLOR[workout.level] || 'bg-primary-container text-on-primary-container'} px-3 py-1 rounded-sm text-[10px] font-bold font-label tracking-widest`}>
                {workout.level}
              </span>
              {i === 0 && (
                <span className="bg-surface-container-highest/80 backdrop-blur-md text-primary-container px-3 py-1 rounded-sm text-[10px] font-bold font-label tracking-widest">
                  {workout.duration} MIN
                </span>
              )}
            </div>
            <div className="absolute bottom-6 left-6 z-20 right-6">
              {i > 0 && <span className="font-label text-primary-container text-[10px] font-bold">{workout.duration} MIN</span>}
              <h3 className={`font-headline font-bold text-on-surface uppercase ${i === 0 ? 'text-3xl mb-2' : 'text-xl mt-1'}`}>
                {workout.name}
              </h3>
              {i === 0 && workout.description && (
                <p className="font-body text-on-surface-variant text-sm max-w-md line-clamp-2">{workout.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

const FALLBACK_WORKOUTS = [
  { id: 1, name: 'HYPER-DENSITY STRENGTH', level: 'ADVANCED', duration: 45, category: 'STRENGTH', description: 'A high-volume hypertrophy protocol designed for maximum muscle recruitment and neural drive.' },
  { id: 2, name: 'Vascular Engine', level: 'INTERMEDIATE', duration: 25, category: 'CARDIO', description: '' },
  { id: 3, name: 'Mobility Flow 2.0', level: 'BEGINNER', duration: 50, category: 'YOGA', description: '' },
  { id: 4, name: 'Explosive Power', level: 'ELITE', duration: 30, category: 'HIIT', description: '' },
  { id: 5, name: 'Combat Conditioning', level: 'INTERMEDIATE', duration: 40, category: 'HIIT', description: '' },
]
