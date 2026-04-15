import { useEffect, useState } from 'react'
import { authFetch } from '../api'
import { SkeletonCard } from '../components/Skeleton'
import { SUPPLEMENT_INFO } from '../data/supplementsInfo'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

const DEFAULT_CATALOG = [
  { name: 'Whey Protein', desc: 'חלבון מי גבינה', icon: 'fitness_center', servings: 30 },
  { name: 'Creatine', desc: 'קריאטין מונוהידראט', icon: 'bolt', servings: 60 },
  { name: 'Omega-3', desc: 'שמן דגים EPA/DHA', icon: 'water_drop', servings: 90 },
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
    <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-4 min-h-screen">
      <div className="flex justify-between items-end pt-4">
        <SkeletonCard className="h-12 w-32" />
        <SkeletonCard className="h-10 w-20" />
      </div>
      {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-40" />)}
    </main>
  )

  return (
    <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-6 min-h-screen">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary-container text-on-primary-fixed px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-xl transition-all">
          {toastMsg}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-surface-container-low rounded-xl p-8 w-full max-w-sm space-y-6">
            <h2 className="font-headline text-xl font-bold uppercase">תוסף חדש</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-label text-xs text-on-surface-variant uppercase">שם התוסף</label>
                <input
                  className="w-full bg-surface-container-highest rounded-lg px-4 py-3 font-body text-on-surface outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="למשל: Vitamin D"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-1">
                <label className="font-label text-xs text-on-surface-variant uppercase">מספר מנות</label>
                <input
                  className="w-full bg-surface-container-highest rounded-lg px-4 py-3 font-body text-on-surface outline-none focus:ring-2 focus:ring-primary-container"
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
                className="flex-1 bg-surface-container-highest py-3 rounded-xl font-headline font-bold text-sm active:scale-95 duration-200"
              >
                ביטול
              </button>
              <button
                onClick={addSupplement}
                disabled={saving || !newName.trim() || !newServings}
                className="flex-[2] bg-primary-container text-on-primary-fixed py-3 rounded-xl font-headline font-bold text-sm tracking-widest active:scale-95 duration-200 disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'הוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-end pt-4">
        <div>
          <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold block">INVENTORY</span>
          <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">תוספים</h1>
        </div>
        <button
          onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary-container text-on-primary-fixed px-4 py-2 rounded-xl font-headline font-bold text-sm active:scale-95 duration-200"
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          הוסף
        </button>
      </div>

      {/* Supplement Cards */}
      <div className="space-y-4">
        {(supps || []).map(s => (
          <SupplementCard
            key={s.id}
            supp={s}
            info={SUPPLEMENT_INFO[s.name] || null}
            onTake={() => takeDose(s.id)}
          />
        ))}
        {(supps || []).length === 0 && (
          <>
            <p className="font-label text-xs text-on-surface-variant text-center pb-1">תוספים מומלצים — לחץ להוספה מהירה</p>
            {DEFAULT_CATALOG.map(preset => (
              <CatalogCard
                key={preset.name}
                preset={preset}
                info={SUPPLEMENT_INFO[preset.name] || null}
                onAdd={() => { setNewName(preset.name); setNewServings(String(preset.servings)); setShowModal(true) }}
              />
            ))}
          </>
        )}
      </div>
    </main>
  )
}

// ─── Supplement Card (existing, with accordion) ────────────────────────────

function SupplementCard({ supp, info, onTake }) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const takenToday = supp.last_taken === today

  return (
    <div className={`bg-surface-container-low rounded-xl border-l-4 transition-colors ${
      supp.low_stock ? 'border-[#ffa500]' : 'border-primary-container'
    }`}>
      <div className="p-6">
        {/* Top row */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="font-headline font-bold text-xl">{supp.name}</h3>
            {info && (
              <>
                <p className="font-label text-[10px] text-on-surface-variant mt-0.5">{info.fullName}</p>
                {info.shortDesc && (
                  <p className="font-body text-xs text-on-surface-variant/80 mt-1 max-w-[180px]">{info.shortDesc}</p>
                )}
              </>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="material-symbols-outlined text-base text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                local_fire_department
              </span>
              <span className="font-label text-xs font-bold text-primary-fixed-dim">
                {supp.current_streak} DAY STREAK
              </span>
            </div>
          </div>

          <button
            onClick={onTake}
            disabled={takenToday}
            className={`px-5 py-3 rounded-xl font-headline font-bold text-base tracking-widest active:scale-95 duration-200 transition-all ${
              takenToday
                ? 'bg-surface-container-highest text-on-surface-variant cursor-default'
                : 'bg-primary-container text-on-primary-fixed shadow-[0_0_15px_rgba(202,253,0,0.2)]'
            }`}
          >
            {takenToday ? '✓ נלקח' : 'לקחתי ✓'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="font-label text-[10px] text-on-surface-variant uppercase">כמות שנשארה</span>
            <span className="font-label text-xs font-bold" style={{ color: supp.low_stock ? '#ffa500' : '#beee00' }}>
              {supp.servings_remaining} / {supp.servings_total} מנות
            </span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${supp.pct_remaining}%`, backgroundColor: supp.low_stock ? '#ffa500' : '#cafd00' }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-surface-container rounded-lg py-2">
            <span className={`block font-headline font-bold text-xl ${supp.low_stock ? 'text-[#ffa500]' : ''}`}>
              {Math.round(supp.servings_remaining)}
            </span>
            <span className="font-label text-[9px] text-on-surface-variant uppercase">מנות</span>
          </div>
          <div className="text-center bg-surface-container rounded-lg py-2">
            <span className="block font-headline font-bold text-xl">
              {Math.round(supp.servings_remaining)}
            </span>
            <span className="font-label text-[9px] text-on-surface-variant uppercase">ימים נותרו</span>
          </div>
          <div className="text-center bg-surface-container rounded-lg py-2">
            <span className="block font-headline font-bold text-xl">{supp.pct_remaining}%</span>
            <span className="font-label text-[9px] text-on-surface-variant uppercase">נשאר</span>
          </div>
        </div>

        {/* Low stock warning */}
        {supp.low_stock && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ffa500]/10 border border-[#ffa500]/30">
            <span className="material-symbols-outlined text-[#ffa500] text-sm">warning</span>
            <span className="font-label text-xs font-bold text-[#ffa500]">מלאי נמוך — !הזמן מחדש</span>
          </div>
        )}

        {/* Toggle button — only if info exists */}
        {info && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-container text-on-surface-variant font-label text-xs font-bold active:scale-[0.98] duration-200 hover:text-on-surface transition-colors"
          >
            {expanded ? 'סגור ↑' : 'פרטים ↓'}
          </button>
        )}
      </div>

      {/* Accordion info panel */}
      {info && expanded && (
        <InfoPanel info={info} />
      )}
    </div>
  )
}

// ─── Catalog Card (empty state, with accordion) ────────────────────────────

function CatalogCard({ preset, info, onAdd }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-surface-container-low rounded-xl border border-dashed border-outline-variant hover:border-primary-container transition-colors">
      <div className="p-5 flex items-center gap-4">
        <span className="material-symbols-outlined text-primary-fixed-dim text-3xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          {preset.icon}
        </span>
        <div className="flex-1 min-w-0 text-right">
          <span className="font-headline font-bold text-base block">{preset.name}</span>
          {info?.shortDesc ? (
            <span className="font-body text-xs text-on-surface-variant">{info.shortDesc}</span>
          ) : (
            <span className="font-label text-xs text-on-surface-variant">{preset.desc} · {preset.servings} מנות</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {info && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="px-3 py-2 rounded-lg bg-surface-container font-label text-xs font-bold text-on-surface-variant hover:text-on-surface active:scale-90 duration-200 transition-colors"
            >
              {expanded ? 'סגור ↑' : 'פרטים ↓'}
            </button>
          )}
          <button
            onClick={onAdd}
            className="flex items-center gap-1 bg-primary-container text-on-primary-fixed px-3 py-2 rounded-lg font-headline font-bold text-xs active:scale-90 duration-200"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            הוסף
          </button>
        </div>
      </div>

      {info && expanded && (
        <InfoPanel info={info} />
      )}
    </div>
  )
}

// ─── Shared Info Panel ──────────────────────────────────────────────────────

function InfoPanel({ info }) {
  return (
    <div className="px-5 pb-5 space-y-4 border-t border-outline-variant/20 pt-4">
      {/* Description */}
      <p className="font-body text-sm text-on-surface-variant">{info.description}</p>

      {/* Benefits */}
      <ul className="space-y-1.5">
        {info.benefits.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#CCFF00' }} />
            <span className="font-body text-sm">{b}</span>
          </li>
        ))}
      </ul>

      {/* Dosage + Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-container p-3 rounded-lg space-y-0.5">
          <span className="font-label text-[10px] text-on-surface-variant uppercase block">מינון</span>
          <p className="font-headline font-bold text-sm">{info.dosage}</p>
        </div>
        <div className="bg-surface-container p-3 rounded-lg space-y-0.5">
          <span className="font-label text-[10px] text-on-surface-variant uppercase block">תזמון</span>
          <p className="font-headline font-bold text-sm">{info.timing}</p>
        </div>
      </div>

      {/* Warning */}
      {info.warnings && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[#ffa500]/10 border border-[#ffa500]/30">
          <span className="material-symbols-outlined text-[#ffa500] text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span className="font-label text-xs text-[#ffa500]">{info.warnings}</span>
        </div>
      )}

      {/* Buy links */}
      {info.buyLinks?.length > 0 && (
        <div className="space-y-2">
          <span className="font-label text-[10px] text-on-surface-variant uppercase">קנה אצל</span>
          <div className="flex flex-wrap gap-2">
            {info.buyLinks.map(link => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-primary-container text-on-primary-container px-3 py-2 rounded-lg text-xs font-bold hover:opacity-80 active:scale-95 duration-200 transition-opacity"
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
