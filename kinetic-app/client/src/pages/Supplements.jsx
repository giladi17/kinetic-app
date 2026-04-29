import { useEffect, useState } from 'react'
import { authFetch } from '../api'
import { SkeletonCard } from '../components/Skeleton'
import { SUPPLEMENT_INFO } from '../data/supplementsInfo'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const DEFAULT_CATALOG = [
  { name: 'Whey Protein', desc: 'חלבון מי גבינה', icon: 'fitness_center', servings: 30, category: 'PERFORMANCE' },
  { name: 'Creatine', desc: 'קריאטין מונוהידראט', icon: 'bolt', servings: 60, category: 'STRENGTH' },
  { name: 'Omega-3', desc: 'שמן דגים EPA/DHA', icon: 'water_drop', servings: 90, category: 'VITALITY' },
]

const WHY_FEATURES = [
  { icon: 'science', heading: 'מבוסס מדע', text: 'כל תוסף נבחר על בסיס מחקרים קליניים מוכחים לשיפור ביצועים.' },
  { icon: 'track_changes', heading: 'מעקב חכם', text: 'KINETIC עוקב אחר המנות שלך, הסטריק היומי והמלאי הנותר אוטומטית.' },
  { icon: 'trending_up', heading: 'תוצאות אמיתיות', text: 'שגרת תוספות עקבית מביאה לשיפור של עד 20% בביצועים ובהתאוששות.' },
]

export default function Supplements() {
  const [supps, setSupps] = useState([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newServings, setNewServings] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await authFetch(`${API}/supplements`)
    const data = await res.json()
    const arr = Array.isArray(data) ? data : (data?.supplements || data?.data || [])
    setSupps(arr)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  async function takeDose(id) {
    const res = await fetch(`${API}/supplements/take/${id}`, { method: 'POST' })
    const data = await res.json()
    data.already_taken ? toast('כבר נרשמה מנה היום') : toast('מנה נרשמה!')
    await load()
  }

  async function addSupplement() {
    if (!newName.trim() || !newServings) return
    setSaving(true)
    await fetch(`${API}/supplements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), servings_remaining: parseFloat(newServings) }),
    })
    setNewName(''); setNewServings(''); setShowModal(false); setSaving(false)
    await load()
    toast('תוסף נוסף!')
  }

  useEffect(() => {
    if (!showModal) return
    function onKey(e) { if (e.key === 'Escape') setShowModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal])

  function toast(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500) }

  if (loading) return (
    <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto space-y-4 min-h-screen bg-[#F8F9FF]">
      <div className="flex justify-between items-end pt-4">
        <SkeletonCard className="h-12 w-32" />
        <SkeletonCard className="h-10 w-20" />
      </div>
      {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-48" />)}
    </main>
  )

  return (
    <main className="min-h-screen bg-[#F8F9FF] pb-32 text-[#151C25]" dir="rtl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#CCFF00] text-black px-6 py-3 font-black text-sm shadow-xl tracking-wider">
          {toastMsg}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-white border-2 border-black p-8 w-full max-w-sm space-y-6">
            <div className="space-y-1 border-b-2 border-[#CCFF00] pb-4">
              <span className="text-[#506600] text-xs font-black tracking-widest">NEW SUPPLEMENT</span>
              <h2 className="text-[#151C25] font-black text-2xl">תוסף חדש</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[#656464] text-xs font-black tracking-widest uppercase">שם התוסף</label>
                <input
                  className="w-full border-b-2 border-[#CCFF00] bg-[#F8F9FF] px-4 py-3 text-[#151C25] outline-none font-bold"
                  placeholder="למשל: Vitamin D"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[#656464] text-xs font-black tracking-widest uppercase">מספר מנות</label>
                <input
                  className="w-full border-b-2 border-black/20 bg-[#F8F9FF] px-4 py-3 text-[#151C25] outline-none font-bold"
                  placeholder="למשל: 60"
                  type="number" min="1"
                  value={newServings}
                  onChange={e => setNewServings(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border-2 border-black text-[#151C25] py-3 font-black text-sm hover:bg-[#F8F9FF] transition-colors">
                ביטול
              </button>
              <button
                onClick={addSupplement}
                disabled={saving || !newName.trim() || !newServings}
                className="flex-[2] bg-black text-[#CCFF00] py-3 font-black text-sm tracking-widest active:scale-95 duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#151C25] transition-colors"
              >
                {saving ? 'שומר...' : 'הוסף תוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-28 pb-16 px-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-end gap-6 border-b-4 border-[#CCFF00] pb-12">
          <div>
            <span className="block text-[10px] font-black tracking-[0.5em] text-[#506600] mb-6 uppercase">KINETIC PERFORMANCE</span>
            <h1 className="font-black text-7xl md:text-9xl leading-[0.85] tracking-tighter text-[#151C25]">תוספים</h1>
            <p className="text-[#656464] text-base mt-5 tracking-widest uppercase font-medium">הדלק המדעי לביצועי שיא</p>
          </div>
          <button
            onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
            className="flex items-center gap-2 bg-[#CCFF00] text-black px-6 py-4 font-black text-xs tracking-widest active:scale-95 duration-200 hover:bg-black hover:text-[#CCFF00] transition-all shrink-0 uppercase"
          >
            <span className="material-symbols-outlined text-base">add</span>
            הוסף תוסף
          </button>
        </div>
      </section>

      {/* Supplement Cards */}
      <section className="px-8 max-w-5xl mx-auto mt-6">
        {(supps || []).length > 0 ? (
          <>
            <div className="flex items-center gap-4 mb-10">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#506600]">MY SUPPLEMENTS</span>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {(supps || []).map((s, idx) => (
                <SupplementCard key={s.id} supp={s} info={SUPPLEMENT_INFO[s.name] || null} onTake={() => takeDose(s.id)} featured={idx === 0} />
              ))}
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-10">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#506600]">CURATED SELECTION</span>
              <div className="flex-1 h-px bg-black/10" />
            </div>
            <h2 className="text-5xl font-black tracking-tighter text-[#151C25] mb-12">תוספים מומלצים</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {DEFAULT_CATALOG.map(preset => (
                <CatalogCard key={preset.name} preset={preset} info={SUPPLEMENT_INFO[preset.name] || null}
                  onAdd={() => { setNewName(preset.name); setNewServings(String(preset.servings)); setShowModal(true) }} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Why Supplements */}
      <section className="mt-28 bg-[#EEF4FF] py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#506600] block mb-6">THE SCIENCE OF ELITE PERFORMANCE</span>
          <h2 className="text-6xl font-black tracking-tighter text-[#151C25] mb-16">למה תוספים?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {WHY_FEATURES.map((f, i) => (
              <div key={i} className="bg-white p-8 border-b-4 border-[#CCFF00] space-y-4">
                <div className="w-14 h-14 bg-[#CCFF00] flex items-center justify-center">
                  <span className="material-symbols-outlined text-black text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                </div>
                <h3 className="text-[#151C25] font-black text-xl tracking-tight">{f.heading}</h3>
                <p className="text-[#656464] text-sm leading-relaxed tracking-wide">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 max-w-5xl mx-auto mt-16 mb-8">
        <div className="bg-[#151C25] p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" style={{ background: '#CCFF00' }} />
          <div className="absolute bottom-0 left-0 w-96 h-96 opacity-10 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]" style={{ background: '#506600' }} />
          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <span className="inline-block bg-[#CCFF00] text-black text-[10px] font-black tracking-[0.4em] px-5 py-2 uppercase">KINETIC PERFORMANCE</span>
            <h2 className="text-white font-black text-5xl md:text-6xl tracking-tighter leading-tight">בניית תוכנית<br />תוספים אישית</h2>
            <p className="text-white/40 text-xs tracking-[0.2em] uppercase max-w-xs mx-auto">הוסף את התוספים שלך ועקוב אחר ההתקדמות יום אחר יום</p>
            <button
              onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
              className="inline-flex items-center gap-2 bg-[#CCFF00] text-black px-10 py-4 font-black text-xs tracking-[0.3em] active:scale-95 duration-200 hover:bg-white transition-all uppercase"
            >
              <span className="material-symbols-outlined text-base">add</span>
              הוסף תוסף ראשון
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function SupplementCard({ supp, info, onTake, featured }) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const takenToday = supp.last_taken === today

  return (
    <div className={`bg-white transition-all duration-500 hover:-translate-y-2 border-2 ${featured ? 'border-[#CCFF00]' : supp.low_stock ? 'border-orange-400' : 'border-black/10'}`}>
      <div className="p-8">
        {/* Header row */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1 min-w-0">
            {info?.category ? (
              <span className="inline-block bg-[#EEF4FF] text-[#506600] text-[9px] font-black tracking-[0.4em] px-3 py-1 mb-3 uppercase">{info.category}</span>
            ) : (
              <span className="inline-block bg-[#EEF4FF] text-[#506600] text-[9px] font-black tracking-[0.4em] px-3 py-1 mb-3 uppercase">SUPPLEMENT</span>
            )}
            <h3 className="text-[#151C25] font-black text-3xl leading-none tracking-tight">{supp.name}</h3>
            {info?.shortDesc && <p className="text-[#656464] text-xs mt-2 tracking-wider">{info.shortDesc}</p>}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm">🔥</span>
              <span className="font-black text-xs tracking-[0.3em] text-[#506600] uppercase">Day Streak {supp.current_streak}</span>
            </div>
          </div>
          <button
            onClick={onTake}
            disabled={takenToday}
            className={`mr-5 px-5 py-3 font-black text-xs tracking-[0.3em] uppercase active:scale-95 duration-200 transition-all shrink-0 ${
              takenToday ? 'bg-[#EEF4FF] text-[#656464] cursor-default' : 'bg-[#CCFF00] text-black hover:bg-black hover:text-[#CCFF00]'
            }`}
          >
            {takenToday ? 'לקחתי ✓' : 'לקחתי'}
          </button>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-[#656464] text-[9px] font-black tracking-[0.4em] uppercase">כמות שנשארה</span>
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: supp.low_stock ? '#f97316' : '#506600' }}>
              {supp.servings_remaining} / {supp.servings_total} מנות
            </span>
          </div>
          <div className="w-full h-1 bg-[#EEF4FF] overflow-hidden">
            <div className="h-full transition-all duration-700" style={{ width: `${supp.pct_remaining}%`, backgroundColor: supp.low_stock ? '#f97316' : '#CCFF00' }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { value: Math.round(supp.servings_remaining), label: 'מנות' },
            { value: Math.round(supp.servings_remaining), label: 'ימים נותרו' },
            { value: `${supp.pct_remaining}%`, label: 'נשאר' },
          ].map((stat, i) => (
            <div key={i} className="text-center bg-[#F8F9FF] py-4 space-y-1">
              <span className={`block font-black text-2xl ${supp.low_stock && i === 0 ? 'text-orange-500' : 'text-[#151C25]'}`}>{stat.value}</span>
              <span className="text-[#656464] text-[8px] font-black tracking-[0.4em] uppercase block">{stat.label}</span>
            </div>
          ))}
        </div>

        {supp.low_stock && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-r-4 border-orange-400 mb-6">
            <span className="material-symbols-outlined text-orange-500 text-sm">warning</span>
            <span className="text-orange-600 text-[10px] font-black tracking-widest uppercase">מלאי נמוך — הזמן מחדש</span>
          </div>
        )}

        {info && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-black/10 text-[#656464] text-[10px] font-black tracking-[0.3em] uppercase hover:border-black/30 hover:text-[#151C25] active:scale-[0.98] duration-200 transition-all"
          >
            {expanded ? 'סגור ↑' : 'פרטים נוספים ↓'}
          </button>
        )}
      </div>
      {info && expanded && <InfoPanel info={info} />}
    </div>
  )
}

function CatalogCard({ preset, info, onAdd }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white border-2 border-black hover:bg-[#CCFF00] transition-all duration-300 hover:-translate-y-1 group">
      <div className="p-5">
        <span className="inline-block bg-[#CCFF00] group-hover:bg-black text-black group-hover:text-[#CCFF00] text-[10px] font-black tracking-widest px-2 py-0.5 mb-3 transition-colors">{preset.category}</span>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-[#F8F9FF] group-hover:bg-black/10 flex items-center justify-center shrink-0 transition-colors">
            <span className="material-symbols-outlined text-[#506600] group-hover:text-black text-xl transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>{preset.icon}</span>
          </div>
          <div className="text-right flex-1 min-w-0">
            <span className="text-[#151C25] font-black text-base block">{preset.name}</span>
            <span className="text-[#656464] group-hover:text-black/60 text-xs transition-colors">{info?.shortDesc || `${preset.desc} · ${preset.servings} מנות`}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {info && (
            <button onClick={() => setExpanded(v => !v)} className="flex-1 py-2 border-2 border-black text-[#151C25] text-xs font-black hover:bg-black hover:text-[#CCFF00] active:scale-90 duration-200 transition-all">
              {expanded ? 'סגור ↑' : 'פרטים ↓'}
            </button>
          )}
          <button onClick={onAdd} className="flex-[2] flex items-center justify-center gap-1 bg-black text-[#CCFF00] group-hover:bg-white group-hover:text-black px-3 py-2 font-black text-xs active:scale-90 duration-200 transition-all">
            <span className="material-symbols-outlined text-base">add</span>
            הוסף
          </button>
        </div>
      </div>
      {info && expanded && <InfoPanel info={info} />}
    </div>
  )
}

function InfoPanel({ info }) {
  return (
    <div className="px-5 pb-5 space-y-4 border-t-2 border-black/10 pt-4 bg-[#F8F9FF]">
      <p className="text-[#656464] text-sm leading-relaxed">{info.description}</p>
      <ul className="space-y-2">
        {info.benefits.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 shrink-0 bg-[#CCFF00]" />
            <span className="text-[#151C25] text-sm">{b}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-black/10 p-3 space-y-0.5">
          <span className="text-[#656464] text-[10px] font-black tracking-widest uppercase block">מינון</span>
          <p className="text-[#151C25] font-black text-sm">{info.dosage}</p>
        </div>
        <div className="bg-white border border-black/10 p-3 space-y-0.5">
          <span className="text-[#656464] text-[10px] font-black tracking-widest uppercase block">תזמון</span>
          <p className="text-[#151C25] font-black text-sm">{info.timing}</p>
        </div>
      </div>
      {info.warnings && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200">
          <span className="material-symbols-outlined text-orange-500 text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span className="text-orange-600 text-xs font-black">{info.warnings}</span>
        </div>
      )}
      {info.buyLinks?.length > 0 && (
        <div className="space-y-2">
          <span className="text-[#656464] text-[10px] font-black tracking-widest uppercase">קנה אצל</span>
          <div className="flex flex-wrap gap-2">
            {info.buyLinks.map(link => (
              <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#EEF4FF] border border-[#CCFF00]/50 text-[#506600] px-3 py-2 text-xs font-black hover:bg-[#CCFF00] hover:text-black active:scale-95 duration-200 transition-all">
                <span>{link.flag}</span>{link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
