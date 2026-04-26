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
  {
    icon: 'science',
    heading: 'מבוסס מדע',
    text: 'כל תוסף נבחר על בסיס מחקרים קליניים מוכחים לשיפור ביצועים.',
  },
  {
    icon: 'track_changes',
    heading: 'מעקב חכם',
    text: 'KINETIC עוקב אחר המנות שלך, הסטריק היומי והמלאי הנותר אוטומטית.',
  },
  {
    icon: 'trending_up',
    heading: 'תוצאות אמיתיות',
    text: 'שגרת תוספות עקבית מביאה לשיפור של עד 20% בביצועים ובהתאוששות.',
  },
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

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function takeDose(id) {
    const res = await fetch(`${API}/supplements/take/${id}`, { method: 'POST' })
    const data = await res.json()
    if (data.already_taken) {
      toast('כבר נרשמה מנה היום')
    } else {
      toast('✓ מנה נרשמה!')
    }
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
    setNewName('')
    setNewServings('')
    setShowModal(false)
    setSaving(false)
    await load()
    toast('✓ תוסף נוסף!')
  }

  useEffect(() => {
    if (!showModal) return
    function onKey(e) { if (e.key === 'Escape') { setShowModal(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal])

  function toast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  if (loading) return (
    <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto space-y-4 min-h-screen bg-[#0e0e0e]">
      <div className="flex justify-between items-end pt-4">
        <SkeletonCard className="h-12 w-32" />
        <SkeletonCard className="h-10 w-20" />
      </div>
      {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-48" />)}
    </main>
  )

  return (
    <main className="min-h-screen bg-[#0e0e0e] pb-32" dir="rtl">

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#CCFF00] text-black px-6 py-3 rounded-full font-black text-sm shadow-xl transition-all">
          {toastMsg}
        </div>
      )}

      {/* ── Add Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-8 w-full max-w-sm space-y-6">
            <div className="space-y-1">
              <span className="text-[#CCFF00] text-xs font-black tracking-widest">NEW SUPPLEMENT</span>
              <h2 className="text-white font-black text-2xl">תוסף חדש</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-black tracking-widest uppercase">שם התוסף</label>
                <input
                  className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#CCFF00] transition-colors"
                  placeholder="למשל: Vitamin D"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/50 text-xs font-black tracking-widest uppercase">מספר מנות</label>
                <input
                  className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#CCFF00] transition-colors"
                  placeholder="למשל: 60"
                  type="number"
                  min="1"
                  value={newServings}
                  onChange={e => setNewServings(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-xl font-black text-sm active:scale-95 duration-200 hover:bg-white/10 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={addSupplement}
                disabled={saving || !newName.trim() || !newServings}
                className="flex-[2] bg-[#CCFF00] text-black py-3 rounded-xl font-black text-sm tracking-widest active:scale-95 duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'שומר...' : 'הוסף תוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Header ── */}
      <section className="pt-24 px-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-start gap-4 mb-10">
          <div>
            <span className="inline-block bg-[#CCFF00] text-black text-xs font-black tracking-widest px-4 py-1.5 rounded-full mb-3">
              INVENTORY
            </span>
            <h1 className="text-white font-black text-5xl leading-none tracking-tight">תוספים</h1>
            <p className="text-white/50 text-sm mt-2">הדלק המדעי לביצועי שיא</p>
          </div>
          <button
            onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
            className="flex items-center gap-2 bg-[#CCFF00] text-black px-5 py-3 rounded-xl font-black text-sm active:scale-95 duration-200 hover:brightness-110 transition-all shrink-0 mt-2"
          >
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            הוסף
          </button>
        </div>
      </section>

      {/* ── Supplement Cards Grid ── */}
      <section className="px-6 max-w-4xl mx-auto">
        {(supps || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(supps || []).map((s, idx) => (
              <SupplementCard
                key={s.id}
                supp={s}
                info={SUPPLEMENT_INFO[s.name] || null}
                onTake={() => takeDose(s.id)}
                featured={idx === 0}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-white/40 text-xs font-black tracking-widest text-center pb-1">
              תוספים מומלצים — לחץ להוספה מהירה
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEFAULT_CATALOG.map(preset => (
                <CatalogCard
                  key={preset.name}
                  preset={preset}
                  info={SUPPLEMENT_INFO[preset.name] || null}
                  onAdd={() => { setNewName(preset.name); setNewServings(String(preset.servings)); setShowModal(true) }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── "Why Supplements?" Editorial Section ── */}
      <section className="px-6 max-w-4xl mx-auto mt-16">
        <div className="border-t border-white/10 pt-12">
          <div className="mb-8">
            <span className="inline-block bg-[#CCFF00] text-black text-xs font-black tracking-widest px-4 py-1.5 rounded-full mb-3">
              SCIENCE
            </span>
            <h2 className="text-white font-black text-3xl">למה תוספים?</h2>
          </div>
          <div className="space-y-4">
            {WHY_FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-5 bg-[#1A1A1A] rounded-2xl p-6">
                <div className="w-12 h-12 bg-[#CCFF00] rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-black text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {f.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-black text-lg mb-1">{f.heading}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="px-6 max-w-4xl mx-auto mt-12">
        <div className="relative bg-[#141414] border border-white/10 rounded-2xl p-8 text-center overflow-hidden">
          {/* glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 bg-[#CCFF00]/10 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 space-y-4">
            <span className="inline-block bg-[#CCFF00] text-black text-xs font-black tracking-widest px-4 py-1.5 rounded-full">
              KINETIC PERFORMANCE
            </span>
            <h2 className="text-white font-black text-3xl">מוכן להתחיל?</h2>
            <p className="text-white/50 text-sm max-w-sm mx-auto">הוסף את התוספים שלך ועקוב אחר ההתקדמות שלך יום אחר יום.</p>
            <button
              onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
              className="inline-flex items-center gap-2 bg-[#CCFF00] text-black px-8 py-3 rounded-xl font-black text-sm active:scale-95 duration-200 hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              הוסף תוסף ראשון
            </button>
          </div>
        </div>
      </section>

    </main>
  )
}

// ─── Supplement Card ───────────────────────────────────────────────────────────

function SupplementCard({ supp, info, onTake, featured }) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const takenToday = supp.last_taken === today

  return (
    <div
      className={`bg-[#1A1A1A] rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
        featured
          ? 'border-2 border-[#CCFF00]'
          : supp.low_stock
            ? 'border border-[#ffa500]/60'
            : 'border border-white/10'
      }`}
    >
      <div className="p-6">

        {/* Category badge + name row */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1 min-w-0">
            {info?.category ? (
              <span className="inline-block bg-[#CCFF00]/10 text-[#CCFF00] text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full mb-2">
                {info.category}
              </span>
            ) : null}
            <h3 className="text-white font-black text-2xl leading-tight">{supp.name}</h3>
            {info?.shortDesc && (
              <p className="text-white/40 text-xs mt-1">{info.shortDesc}</p>
            )}
            {/* Streak */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-base">🔥</span>
              <span className="font-black text-sm" style={{ color: '#CCFF00' }}>
                {supp.current_streak} ימים
              </span>
            </div>
          </div>

          {/* Take dose button */}
          <button
            onClick={onTake}
            disabled={takenToday}
            className={`mr-4 px-4 py-2.5 rounded-xl font-black text-sm tracking-widest active:scale-95 duration-200 transition-all shrink-0 ${
              takenToday
                ? 'bg-white/5 text-white/30 border border-white/10 cursor-default'
                : 'bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.25)] hover:brightness-110'
            }`}
          >
            {takenToday ? '✓ נלקח' : 'לקחתי'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-5">
          <div className="flex justify-between items-center">
            <span className="text-white/40 text-[10px] font-black tracking-widest uppercase">כמות שנשארה</span>
            <span
              className="text-xs font-black"
              style={{ color: supp.low_stock ? '#ffa500' : '#CCFF00' }}
            >
              {supp.servings_remaining} / {supp.servings_total} מנות
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${supp.pct_remaining}%`,
                backgroundColor: supp.low_stock ? '#ffa500' : '#CCFF00',
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { value: Math.round(supp.servings_remaining), label: 'מנות' },
            { value: Math.round(supp.servings_remaining), label: 'ימים נותרו' },
            { value: `${supp.pct_remaining}%`, label: 'נשאר' },
          ].map((stat, i) => (
            <div key={i} className="text-center bg-[#141414] rounded-xl py-3">
              <span
                className={`block font-black text-xl ${supp.low_stock && i === 0 ? 'text-[#ffa500]' : 'text-white'}`}
              >
                {stat.value}
              </span>
              <span className="text-white/40 text-[9px] font-black tracking-widest uppercase">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Low stock warning */}
        {supp.low_stock && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ffa500]/10 border border-[#ffa500]/30 mb-4">
            <span className="material-symbols-outlined text-[#ffa500] text-sm">warning</span>
            <span className="text-[#ffa500] text-xs font-black">מלאי נמוך — הזמן מחדש!</span>
          </div>
        )}

        {/* Expand toggle */}
        {info && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-black hover:text-white hover:bg-white/10 active:scale-[0.98] duration-200 transition-all"
          >
            {expanded ? 'סגור ↑' : 'פרטים ↓'}
          </button>
        )}
      </div>

      {/* Accordion */}
      {info && expanded && <InfoPanel info={info} />}
    </div>
  )
}

// ─── Catalog Card (empty state) ────────────────────────────────────────────────

function CatalogCard({ preset, info, onAdd }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[#1A1A1A] border border-dashed border-white/20 rounded-2xl hover:border-[#CCFF00]/60 transition-colors duration-300 hover:-translate-y-1 transform">
      <div className="p-5">
        {/* Category badge */}
        <span className="inline-block bg-[#CCFF00] text-black text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full mb-3">
          {preset.category}
        </span>

        {/* Icon + name */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#CCFF00] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {preset.icon}
            </span>
          </div>
          <div className="text-right flex-1 min-w-0">
            <span className="text-white font-black text-base block">{preset.name}</span>
            {info?.shortDesc ? (
              <span className="text-white/40 text-xs">{info.shortDesc}</span>
            ) : (
              <span className="text-white/40 text-xs">{preset.desc} · {preset.servings} מנות</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {info && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-black hover:text-white hover:bg-white/10 active:scale-90 duration-200 transition-all"
            >
              {expanded ? 'סגור ↑' : 'פרטים ↓'}
            </button>
          )}
          <button
            onClick={onAdd}
            className="flex-[2] flex items-center justify-center gap-1 bg-[#CCFF00] text-black px-3 py-2 rounded-xl font-black text-xs active:scale-90 duration-200 hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            הוסף
          </button>
        </div>
      </div>

      {info && expanded && <InfoPanel info={info} />}
    </div>
  )
}

// ─── Shared Info Panel ──────────────────────────────────────────────────────────

function InfoPanel({ info }) {
  return (
    <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
      <p className="text-white/50 text-sm leading-relaxed">{info.description}</p>

      <ul className="space-y-2">
        {info.benefits.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#CCFF00]" />
            <span className="text-white/80 text-sm">{b}</span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#141414] border border-white/10 p-3 rounded-xl space-y-0.5">
          <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block">מינון</span>
          <p className="text-white font-black text-sm">{info.dosage}</p>
        </div>
        <div className="bg-[#141414] border border-white/10 p-3 rounded-xl space-y-0.5">
          <span className="text-white/40 text-[10px] font-black tracking-widest uppercase block">תזמון</span>
          <p className="text-white font-black text-sm">{info.timing}</p>
        </div>
      </div>

      {info.warnings && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#ffa500]/10 border border-[#ffa500]/30">
          <span className="material-symbols-outlined text-[#ffa500] text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span className="text-[#ffa500] text-xs font-black">{info.warnings}</span>
        </div>
      )}

      {info.buyLinks?.length > 0 && (
        <div className="space-y-2">
          <span className="text-white/40 text-[10px] font-black tracking-widest uppercase">קנה אצל</span>
          <div className="flex flex-wrap gap-2">
            {info.buyLinks.map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] px-3 py-2 rounded-xl text-xs font-black hover:bg-[#CCFF00]/20 active:scale-95 duration-200 transition-all"
              >
                <span>{link.flag}</span>
                {link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
