import { useEffect, useState } from 'react'
import { authFetch } from '../api'
import { SkeletonCard } from '../components/Skeleton'
import { SUPPLEMENT_INFO } from '../data/supplementsInfo'
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

// ── Stitch original image URLs (from code.html reference design) ──────────
const STITCH_BOTTLES_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3_8LLI97XA8phZo42Gx8Dm-HxEZCglpIxwniu3QLz22SEbB0kOcqQEm1quAL32DDYzuDFTSLeUrS-ge2taj1ZVii-Bju1e58c0Js2vE8w-LuqRt4cBlJAX3Diar3J6ENLIuDZDNlWWo0BIMuPykYwuHBP5UQi3HHNTgQgpDEpnHfyaQquuxc7Vs4UISE1eKKV50JxsP19UEzUGCYn2qD_ysTBetiIRwrNYFTL3UaHInv_RzzcwZ1NosZStnXST3I44uA8dpt3QKA'
const STITCH_ATHLETE_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQwI7CSGQZ9fBkHpafxbqhgtRctlB73VLbokVxSfQk6weLaJl0qe8lRc0ve5F57hKaZDSCT342m9kgIGDnnUID5db7_Azz-cuXdGzoyUh9TFtZ3I05W1ofDGdHnLmxXXFkvM6S3UnUoX33UsqwYce2AxyP7v7VKgxhANPwYsHuljkHkWP9jcMLqOX2Va-UymXShyfhk-z55HitTDjfzCLmGxgZMIzqItBMXsak9eGCxg4QHHtGXcsqzCGSpbWgku8l4UrWYBldwnU'
const STITCH_IMGS = {
  'Whey Protein': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgZz_IkFxzjvHf4KCeTq36KA9Fr0kOVm2LAt7KcTulCqV-ClLl8yQFAFCOEcr3x_bED-REuvPQhEA0ZZNP6IWDdx_8iIUtv79m576dTY4RZF-9_Z-hB7FUUSgyRaZ93B7m3_iLZJxlrq6Hw7iocexE9tqK4171YQ4BXM6UO_Yjgv7JF5J5vJdKZU-WUoSpzhvh1f3JgynG-3-nlkNGeBCLYDqfkmcZdRvxqHJHWD7ldqJ-aXuZC_X4M6IXfMF90mKGZn26XHX6CZ0',
  'Creatine':     'https://lh3.googleusercontent.com/aida-public/AB6AXuDl7Gj3TQQ0THSaHDXKbJ_Ph7FkTnWyznJoysU8BH_YoNkNDu9Wfcxwkx2AoEwp5793eC3XUsje43hvx8brbouwvOsucAxzg84e0JObQHgteZxLrtP4pMy386w7vKM_dZTvysG3ddDJU76deN4FjVn_Nl9udIiEHq-4gCSM2pyo4BYb8Z1sn5IPrT7-oiwlTkUzjCkYN4rtu2pYa2Q4rbNfmG6CJJwoIDy2KaYugvZHuHD9n4t_g0ZUiLGADjUDVT89DbPWedPhND4',
  'Omega-3':      'https://lh3.googleusercontent.com/aida-public/AB6AXuDuhFgaYmUxH65NffqXjchIz94i8DpjAgpKHr-nYoaDE1S76NuIUByIq1s9p8Fy4h8qfuHi1w23OeTlx3_GzCUX3JOGpMqSAbqu3avsV3a9jSTpRNha60cgzGaBqKeVhuduTPGUcuhcNtrrOV91jXoFqZHQxl4gQwNQYzYUuoFv57FUOEn_wsJfFit45PeyH8zWc5fEF8wSi0NpHVzIl0I7ggqBG02Wo3o9i4r6-RYsBUUSWDpwSPMvOegeEEg1lrXwjh3aSL_k6RA',
}

const DEFAULT_CATALOG = [
  { name: 'Whey Protein', desc: 'חלבון מי גבינה', icon: 'fitness_center', servings: 30, category: 'RECOVERY',     img: STITCH_IMGS['Whey Protein'] },
  { name: 'Creatine',     desc: 'קריאטין מונוהידראט', icon: 'bolt',          servings: 60, category: 'PERFORMANCE', img: STITCH_IMGS['Creatine'] },
  { name: 'Omega-3',      desc: 'שמן דגים EPA/DHA',   icon: 'water_drop',    servings: 90, category: 'VITALITY',    img: STITCH_IMGS['Omega-3'] },
]

const WHY_FEATURES = [
  { icon: 'bolt',         heading: 'סגירת פערים תזונתיים', text: 'אפילו בתזונה מושלמת, קשה להגיע לכמויות האופטימליות הנדרשות לספורטאים בעצימות גבוהה.' },
  { icon: 'science',      heading: 'יתרון מבוסס מדע',      text: 'אנחנו משתמשים רק ברכיבים שנבדקו במחקרים קליניים והוכחו כמשפרי ביצועים, כוח וסיבולת.' },
  { icon: 'speed',        heading: 'האצת התאוששות',         text: 'המפתח לביצועים הוא היכולת להתאושש מהר יותר לאימון הבא. התוספים הנכונים מקצרים את זמן תיקון השריר.' },
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
    <main className="min-h-screen bg-[#F8F9FF] pb-32 text-[#121212]" dir="rtl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#CCFF00] text-black px-6 py-3 font-black text-sm shadow-xl tracking-[0.2em] rounded-xl">
          {toastMsg}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-[#121212] rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6">
            <div className="space-y-1 pb-4 mb-2">
              <span className="text-[#CCFF00] text-xs font-black tracking-[0.2em]">NEW SUPPLEMENT</span>
              <h2 className="text-white font-black text-2xl">תוסף חדש</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-white/40 text-xs font-black tracking-[0.2em] uppercase">שם התוסף</label>
                <input
                  className="w-full border-b-2 border-[#CCFF00] bg-[#1a1a1a] px-4 py-3 text-white outline-none font-bold rounded-lg placeholder:text-white/30"
                  placeholder="למשל: Vitamin D"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/40 text-xs font-black tracking-[0.2em] uppercase">מספר מנות</label>
                <input
                  className="w-full border-b-2 border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none font-bold rounded-lg placeholder:text-white/30"
                  placeholder="למשל: 60"
                  type="number" min="1"
                  value={newServings}
                  onChange={e => setNewServings(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-[#1a1a1a] text-white/60 py-3 font-black text-sm rounded-xl shadow-lg hover:text-white transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={addSupplement}
                disabled={saving || !newName.trim() || !newServings}
                className="flex-[2] bg-[#CCFF00] text-black py-3 font-black text-sm tracking-[0.2em] rounded-xl shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] active:scale-95 duration-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'שומר...' : 'הוסף תוסף'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero — Stitch light-mode asymmetric (bottles image right) ── */}
      <section className="pt-24 min-h-[680px] bg-[#F8F9FF] relative overflow-hidden flex items-center">
        <div className="w-full mx-auto px-8 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          {/* Text — right side (RTL) */}
          <div className="text-right">
            <span className="inline-block px-4 py-1 bg-[#CCFF00] text-[#5B7300] text-[10px] font-black tracking-widest mb-6 rounded-full uppercase">KINETIC PERFORMANCE</span>
            <h1 className="text-6xl md:text-8xl font-black text-[#151C25] leading-[0.9] tracking-tighter mb-8">
              הדלק המדעי<br /><span style={{ color: '#506600' }}>לביצועי שיא</span>
            </h1>
            <p className="text-xl text-[#656464] max-w-xl leading-relaxed mb-10">
              אופטימיזציה של התאוששות וביצועים באמצעות תוספי תזונה מדויקים. המדע שמאחורי היכולות שלך מתחיל כאן.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
                className="px-8 py-4 rounded-xl font-black text-base text-white shadow-[0_8px_32px_rgba(80,102,0,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #506600 0%, #CCFF00 100%)' }}
              >
                לכל הקטלוג
              </button>
              <button className="px-8 py-4 rounded-xl font-black text-base text-[#151C25] bg-[#EEF4FF] hover:bg-[#DCE3F0] transition-colors">
                קרא את המחקר
              </button>
            </div>
          </div>
          {/* Bottles image — left side (bleeding, object-contain on surface) */}
          <div className="relative h-[520px] hidden lg:flex items-center justify-center">
            <div className="absolute inset-0 bg-[#DCE3F0] rounded-full blur-[120px] opacity-30 -z-10" />
            <img
              src={STITCH_BOTTLES_URL}
              alt="Supplements"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Supplement Cards */}
      <section className="px-8 max-w-5xl mx-auto mt-12">
        {(supps || []).length > 0 ? (
          <>
            <div className="flex items-center gap-4 mb-10">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#121212]">MY SUPPLEMENTS</span>
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
              <span className="text-[10px] font-black tracking-[0.5em] uppercase text-[#121212]">CURATED SELECTION</span>
            </div>
            <h2 className="text-5xl font-black tracking-tighter text-[#121212] mb-12">תוספים מומלצים</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {DEFAULT_CATALOG.map(preset => (
                <CatalogCard key={preset.name} preset={preset} info={SUPPLEMENT_INFO[preset.name] || null}
                  onAdd={() => { setNewName(preset.name); setNewServings(String(preset.servings)); setShowModal(true) }} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Why Supplements — Stitch 5-col grid with athlete image ── */}
      <section className="py-32 px-8 md:px-12 bg-[#F8F9FF] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">

            {/* Athlete image — 2 cols */}
            <div className="lg:col-span-2 relative">
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                style={{ backgroundColor: '#CCFF00' }} />
              <img
                src={STITCH_ATHLETE_URL}
                alt="Athlete"
                className="rounded-xl shadow-[0_24px_80px_rgba(21,28,37,0.15)] relative z-10 w-full object-cover"
                style={{ aspectRatio: '4/5' }}
              />
            </div>

            {/* Features — 3 cols */}
            <div className="lg:col-span-3 text-right">
              <span className="text-[#656464] font-black tracking-widest text-[10px] uppercase block mb-4">
                THE SCIENCE OF ELITE PERFORMANCE
              </span>
              <h2 className="text-6xl font-black tracking-tighter text-[#151C25] mb-10">למה תוספים?</h2>
              <div className="space-y-10">
                {WHY_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-6 flex-row-reverse">
                    <div className="w-14 h-14 bg-[#CCFF00] rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_4px_16px_rgba(204,255,0,0.4)]">
                      <span className="material-symbols-outlined text-[#151C25] text-2xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-[#151C25] mb-2 tracking-tight">{f.heading}</h4>
                      <p className="text-[#656464] leading-relaxed">{f.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 max-w-5xl mx-auto mt-16 mb-8">
        <div className="bg-[#CCFF00] rounded-2xl shadow-2xl p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 opacity-20 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" style={{ background: '#ffffff' }} />
          <div className="absolute bottom-0 left-0 w-96 h-96 opacity-20 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]" style={{ background: '#000000' }} />
          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <span className="inline-block bg-[#121212] text-[#CCFF00] text-[10px] font-black tracking-[0.4em] px-5 py-2 uppercase rounded-xl">KINETIC PERFORMANCE</span>
            <h2 className="text-[#121212] font-black text-6xl md:text-7xl tracking-[-0.04em] leading-[0.88]">בניית תוכנית<br />תוספים אישית</h2>
            <p className="text-[#121212]/60 text-xs tracking-[0.35em] uppercase max-w-xs mx-auto">הוסף את התוספים שלך ועקוב אחר ההתקדמות יום אחר יום</p>
            <button
              onClick={() => { setNewName(''); setNewServings(''); setShowModal(true) }}
              className="inline-flex items-center gap-2 bg-[#121212] text-[#CCFF00] px-10 py-4 font-black text-xs tracking-[0.3em] rounded-xl shadow-xl hover:-translate-y-0.5 active:scale-95 duration-200 transition-all uppercase"
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

function SupplementCard({ supp, info, onTake }) {
  const [expanded, setExpanded] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const takenToday = supp.last_taken === today
  const productImg = STITCH_IMGS[supp.name]

  return (
    <div className="bg-white/80 backdrop-blur-[24px] rounded-2xl shadow-[0_8px_48px_rgba(21,28,37,0.07)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_80px_rgba(21,28,37,0.12)] overflow-hidden">

      {/* Product image — Stitch editorial photo */}
      {productImg && (
        <div className="aspect-square overflow-hidden bg-[#EEF4FF]">
          <img
            src={productImg}
            alt={supp.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
          />
        </div>
      )}

      <div className="p-10">
        {/* Header row */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1 min-w-0 text-right">
            <span className="inline-block bg-[#EEF4FF] text-[#506600] text-[9px] font-black tracking-[0.5em] px-3 py-1 mb-4 uppercase rounded-full">
              {info?.category || 'SUPPLEMENT'}
            </span>
            <h3 className="text-[#151C25] font-black text-4xl md:text-5xl leading-none tracking-tighter">{supp.name}</h3>
            {info?.shortDesc && <p className="text-[#656464] text-xs mt-3 tracking-widest uppercase">{info.shortDesc}</p>}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm">🔥</span>
              <span className="font-black text-xs tracking-[0.3em] uppercase" style={{ color: '#506600' }}>Day Streak {supp.current_streak}</span>
            </div>
          </div>
          <button
            onClick={onTake}
            disabled={takenToday}
            className={`mr-5 px-5 py-3 font-black text-xs tracking-[0.2em] uppercase rounded-xl active:scale-95 duration-200 transition-all shrink-0 ${
              takenToday
                ? 'bg-[#EEF4FF] text-[#656464] cursor-default'
                : 'bg-[#CCFF00] text-[#151C25] shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)]'
            }`}
          >
            {takenToday ? 'לקחתי ✓' : 'לקחתי'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-[#656464] text-[9px] font-black tracking-[0.4em] uppercase">כמות שנשארה</span>
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: supp.low_stock ? '#f97316' : '#506600' }}>
              {supp.servings_remaining} / {supp.servings_total} מנות
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#EEF4FF] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-700 rounded-full"
              style={{ width: `${supp.pct_remaining}%`, backgroundColor: supp.low_stock ? '#f97316' : '#CCFF00' }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { value: Math.round(supp.servings_remaining), label: 'מנות' },
            { value: Math.round(supp.servings_remaining), label: 'ימים נותרו' },
            { value: `${supp.pct_remaining}%`, label: 'נשאר' },
          ].map((stat, i) => (
            <div key={i} className="text-right bg-[#EEF4FF] rounded-xl py-5 px-4 space-y-1">
              <span className={`block font-black text-3xl tracking-tighter ${supp.low_stock && i === 0 ? 'text-orange-500' : 'text-[#151C25]'}`}>
                {stat.value}
              </span>
              <span className="text-[#656464] text-[8px] font-black tracking-[0.4em] uppercase block">{stat.label}</span>
            </div>
          ))}
        </div>

        {supp.low_stock && (
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 rounded-lg mb-6">
            <span className="material-symbols-outlined text-orange-500 text-sm">warning</span>
            <span className="text-orange-500 text-[10px] font-black tracking-widest uppercase">מלאי נמוך — הזמן מחדש</span>
          </div>
        )}

        {info && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#EEF4FF] text-[#656464] text-[10px] font-black tracking-[0.3em] uppercase hover:bg-[#DCE3F0] hover:text-[#151C25] active:scale-[0.98] duration-200 transition-all"
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
    <div className="bg-white/80 backdrop-blur-[24px] rounded-2xl shadow-[0_8px_48px_rgba(21,28,37,0.07)] hover:-translate-y-2 transition-all duration-500 overflow-hidden">
      {/* Product image */}
      {preset.img && (
        <div className="aspect-square overflow-hidden bg-[#EEF4FF]">
          <img
            src={preset.img}
            alt={preset.name}
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
          />
        </div>
      )}
      <div className="p-8">
        <span className="inline-block bg-[#EEF4FF] text-[#506600] text-[9px] font-black tracking-[0.5em] px-3 py-1 mb-5 uppercase rounded-full">{preset.category}</span>
        <div className="text-right mb-5">
          <span className="text-[#151C25] font-black text-2xl tracking-tighter block leading-tight">{preset.name}</span>
          <span className="text-[#656464] text-xs tracking-widest uppercase mt-1 block">{info?.shortDesc || preset.desc}</span>
        </div>
        <div className="flex gap-3">
          {info && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex-1 py-3 bg-[#EEF4FF] text-[#656464] text-xs font-black rounded-xl hover:bg-[#DCE3F0] hover:text-[#151C25] active:scale-90 duration-200 transition-all tracking-widest uppercase"
            >
              {expanded ? 'סגור ↑' : 'פרטים ↓'}
            </button>
          )}
          <button
            onClick={onAdd}
            className="flex-[2] flex items-center justify-center gap-1 bg-[#CCFF00] text-[#151C25] px-3 py-3 font-black text-xs rounded-xl shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] active:scale-90 duration-200 transition-all tracking-widest uppercase"
          >
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
    <div className="px-8 pb-8 space-y-4 pt-5 bg-[#F8F9FF] rounded-b-2xl">
      <p className="text-[#656464] text-sm leading-relaxed">{info.description}</p>
      <ul className="space-y-2">
        {info.benefits.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 shrink-0 bg-[#CCFF00] rounded-full" />
            <span className="text-[#151C25] text-sm">{b}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#EEF4FF] rounded-xl p-3 space-y-0.5">
          <span className="text-[#656464] text-[10px] font-black tracking-[0.2em] uppercase block">מינון</span>
          <p className="text-[#151C25] font-black text-sm">{info.dosage}</p>
        </div>
        <div className="bg-[#EEF4FF] rounded-xl p-3 space-y-0.5">
          <span className="text-[#656464] text-[10px] font-black tracking-[0.2em] uppercase block">תזמון</span>
          <p className="text-[#151C25] font-black text-sm">{info.timing}</p>
        </div>
      </div>
      {info.warnings && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-500/10 rounded-lg">
          <span className="material-symbols-outlined text-orange-500 text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <span className="text-orange-500 text-xs font-black">{info.warnings}</span>
        </div>
      )}
      {info.buyLinks?.length > 0 && (
        <div className="space-y-2">
          <span className="text-[#656464] text-[10px] font-black tracking-[0.2em] uppercase">קנה אצל</span>
          <div className="flex flex-wrap gap-2">
            {info.buyLinks.map(link => (
              <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#CCFF00]/10 text-[#CCFF00] px-3 py-2 text-xs font-black rounded-lg hover:bg-[#CCFF00] hover:text-black active:scale-95 duration-200 transition-all">
                <span>{link.flag}</span>{link.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
