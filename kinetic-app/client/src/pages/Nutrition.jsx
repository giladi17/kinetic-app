import { useEffect, useState, useRef } from 'react'
import { premiumFetch, authFetch } from '../api'
import saladImg from '../assets/salad.jpg'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

/* ── Stitch light-mode macro bar card ── */
function MacroBar({ label, current, target, unit, color, pct, large }) {
  return (
    <div className={`bg-white/80 backdrop-blur-[24px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3 ${large ? 'p-7' : 'p-5'}`}>
      <div className="flex justify-between items-start">
        <span className="text-[#656464] text-[9px] font-black tracking-[0.25em] uppercase">{label}</span>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#EEF4FF]" style={{ color }}>{pct}%</span>
      </div>
      <div>
        <span className={`text-[#151C25] font-bold leading-none ${large ? 'text-4xl' : 'text-2xl'}`}>{current}</span>
        <span className="text-[#656464] text-xs ml-1">/{target}{unit}</span>
      </div>
      <div className="h-1.5 bg-[#DCE3F0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function BarcodeScanner({ onAdd }) {
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState(null)
  const [grams, setGrams] = useState(100)
  const [scanning, setScanning] = useState(false)
  const [notFound, setNotFound] = useState(false)
  async function scan() {
    if (!barcode.trim()) return
    setScanning(true); setNotFound(false); setProduct(null)
    try {
      const res = await fetch(`${API}/nutrition/scan/${barcode.trim()}`)
      const data = await res.json()
      if (data.found) setProduct(data); else setNotFound(true)
    } catch { setNotFound(true) } finally { setScanning(false) }
  }
  const calc = (per100, g) => parseFloat(((per100 * g) / 100).toFixed(1))
  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 bg-[#EEF4FF] rounded-xl px-4 py-3 text-[#151C25] text-sm outline-none placeholder:text-[#656464] focus:bg-[#DCE3F0] transition-colors"
          placeholder="הזן מספר ברקוד..."
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          type="tel"
        />
        <button
          onClick={scan}
          disabled={scanning || !barcode.trim()}
          className="bg-[#CCFF00] text-black px-5 py-3 rounded-xl font-black text-sm shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] active:scale-95 transition-all duration-200 disabled:opacity-50"
        >
          {scanning ? '...' : 'חפש'}
        </button>
      </div>
      {notFound && <p className="text-[#656464] text-sm text-center">המוצר לא נמצא</p>}
      {product && (
        <div className="bg-[#EEF4FF] rounded-xl p-4 space-y-4">
          <div className="flex gap-3">
            {product.image_url && <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-lg" />}
            <div>
              <h4 className="font-black text-[#151C25] text-base">{product.name}</h4>
              <p className="text-[#656464] text-xs mt-0.5">{product.calories_per_100g} kcal | {product.protein_per_100g}g חלבון לכל 100g</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[#656464] text-xs uppercase tracking-widest">כמות</span>
              <span className="text-[#506600] font-black text-sm">{grams}g</span>
            </div>
            <input type="range" min="10" max="500" step="5" value={grams} onChange={e => setGrams(parseInt(e.target.value))} className="w-full accent-[#CCFF00]" />
          </div>
          <button
            onClick={() => onAdd({ meal_name: product.name, calories: Math.round(calc(product.calories_per_100g, grams)), protein: calc(product.protein_per_100g, grams), carbs: calc(product.carbs_per_100g, grams), fat: calc(product.fat_per_100g, grams) })}
            className="w-full bg-[#CCFF00] text-black py-3 rounded-xl font-black text-sm shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
          >
            הוסף לתזונה
          </button>
        </div>
      )}
    </div>
  )
}

export default function Nutrition() {
  const [data, setData] = useState(null)
  const [presets, setPresets] = useState([])
  const [gapFiller, setGapFiller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [showBarcode, setShowBarcode] = useState(false)
  const [addModal, setAddModal] = useState(null)
  const [addSearch, setAddSearch] = useState('')
  const [recentMeals, setRecentMeals] = useState([])
  const [addBarcode, setAddBarcode] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null)
  const [grams, setGrams] = useState(100)
  const searchTimerRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      authFetch(`${API}/nutrition?date=${today}`).then(r => r.json()),
      authFetch(`${API}/nutrition/presets`).then(r => r.json()),
    ]).then(([nutrition, p]) => { setData(nutrition); setPresets(p) }).finally(() => setLoading(false))
    fetchGapFiller()
    authFetch(`${API}/nutrition/recent`).then(r => r.json()).then(setRecentMeals).catch(() => {})
  }, [])

  async function quickLog(presetKey) {
    const res = await authFetch(`${API}/nutrition/quick-log/${presetKey}`, { method: 'POST' })
    const meal = await res.json()
    toast(`נוסף: ${meal.meal_name}`)
    const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
    setData(updated)
  }

  useEffect(() => {
    if (!addModal) return
    function onKey(e) { if (e.key === 'Escape') setAddModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addModal])

  async function fetchGapFiller() {
    const res = await premiumFetch(`${API}/nutrition/gap-filler`)
    if (!res) return
    const g = await res.json()
    setGapFiller(g)
  }

  function handleSearchChange(q) {
    setAddSearch(q); setSelectedFood(null)
    clearTimeout(searchTimerRef.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimerRef.current = setTimeout(async () => {
      const res = await authFetch(`${API}/nutrition/search?q=${encodeURIComponent(q)}`)
      const d = await res.json()
      setSearchResults(Array.isArray(d) ? d : [])
    }, 300)
  }

  function toast(msg) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000) }

  if (loading) return (
    <main className="pt-24 pb-32 px-6 min-h-screen bg-[#F8F9FF] flex items-center justify-center">
      <span className="text-[#506600] text-2xl font-black animate-pulse uppercase tracking-widest">LOADING...</span>
    </main>
  )

  const totals  = data?.totals || {}
  const targets = data?.targets || { calories: 2500, protein: 160 }
  const calPct  = Math.min(100, Math.round(((totals.calories || 0) / targets.calories) * 100))
  const protPct = Math.min(100, Math.round(((totals.protein  || 0) / targets.protein)  * 100))
  const carbPct = Math.min(100, Math.round(((totals.carbs    || 0) / (targets.carbs || 300)) * 100))
  const fatPct  = Math.min(100, Math.round(((totals.fat      || 0) / (targets.fat   ||  80)) * 100))
  const BREAKFAST = presets.filter(p => p.key.startsWith('breakfast'))
  const LUNCH     = presets.filter(p => p.key.startsWith('lunch'))
  const DINNER    = presets.filter(p => p.key.startsWith('dinner'))
  const SNACKS    = presets.filter(p => p.key.startsWith('snack'))

  return (
    <main className="min-h-screen bg-[#F8F9FF] pb-32 text-[#151C25]" dir="rtl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#CCFF00] text-black px-6 py-3 rounded-xl font-black text-sm shadow-2xl">{toastMsg}</div>
      )}

      {/* ── Hero — full-width bleeding, image slides under fixed header ── */}
      <section className="overflow-hidden" style={{ minHeight: '600px' }}>
        <div className="flex flex-col md:flex-row-reverse" style={{ minHeight: '600px' }}>

          {/* Text column — pt-28 clears the fixed header */}
          <div className="md:w-[55%] px-6 md:px-16 pt-28 md:pt-36 pb-10 text-right flex flex-col justify-between">
            <div>
              <span className="text-[#506600] text-[10px] font-black tracking-[0.35em] uppercase block mb-3">OPTIMAL FUELING</span>
              <h1 className="text-[5rem] md:text-[8rem] font-black tracking-tighter leading-none text-[#151C25]">תזונה</h1>
            </div>
            {/* Tagline pinned to bottom — text-6xl, overlaps hero bottom */}
            <p className="text-[#151C25] text-4xl md:text-6xl font-black tracking-tighter leading-tight mt-6">
              הדלק<br/>של האלופים
            </p>
          </div>

          {/* Image column — no padding-top, bleeds from page top behind header */}
          <div className="md:w-[45%] relative overflow-hidden" style={{ minHeight: '420px' }}>
            <img
              src={saladImg}
              alt="nutrition hero"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* ── Content (no max-w-3xl container — full editorial width) ── */}
      <div className="px-5 md:px-10 pt-8 max-w-5xl mx-auto space-y-6">

        {/* ── Macro Bento Grid — asymmetric ── */}
        {/* Row 1: Calories (featured, 2 cols) + Protein (1 col) */}
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <MacroBar large label="קלוריות" current={Math.round(totals.calories || 0)} target={targets.calories} unit="kcal" color="#CCFF00" pct={calPct} />
          </div>
          <MacroBar label="חלבון" current={Math.round(totals.protein || 0)} target={targets.protein} unit="g" color="#ff734a" pct={protPct} />
        </div>
        {/* Row 2: Carbs + Fat + Meals */}
        <div className="grid grid-cols-3 gap-5">
          <MacroBar label="פחמימות" current={Math.round(totals.carbs || 0)} target={targets.carbs || 300} unit="g" color="#00b4d8" pct={carbPct} />
          <MacroBar label="שומן"    current={Math.round(totals.fat   || 0)} target={targets.fat   ||  80} unit="g" color="#c77dff" pct={fatPct} />
          <div className="bg-white/80 backdrop-blur-[24px] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col justify-between">
            <span className="text-[#656464] text-[9px] font-black tracking-[0.25em] uppercase">ארוחות</span>
            <span className="text-[#151C25] font-bold text-2xl leading-none">{data?.meals?.length || 0}</span>
            <span className="text-[#656464] text-[10px] uppercase tracking-wider">היום</span>
          </div>
        </div>

        {/* ── Barcode Scanner ── */}
        <div className="bg-white/80 backdrop-blur-[24px] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[#506600] text-[9px] font-black tracking-[0.3em] uppercase block mb-1">SCAN</span>
              <h3 className="font-black text-[#151C25] text-lg uppercase tracking-tight leading-none">סריקת ברקוד</h3>
              <p className="text-[#656464] text-xs mt-1">הוסף מוצר לפי מספר ברקוד</p>
            </div>
            <button
              onClick={() => setShowBarcode(s => !s)}
              className="bg-[#CCFF00] text-black px-5 py-2.5 rounded-xl font-black text-xs tracking-widest shadow-[0_4px_24px_rgba(204,255,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(204,255,0,0.5)] active:scale-95 transition-all duration-200"
            >
              סרוק
            </button>
          </div>
          {showBarcode && (
            <BarcodeScanner onAdd={async (meal) => {
              await fetch(`${API}/nutrition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...meal, date: today, entry_method: 'barcode' }) })
              toast(`נוסף: ${meal.meal_name}`)
              const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
              setData(updated); setShowBarcode(false)
            }} />
          )}
        </div>

        {/* ── Gap Filler ── */}
        {gapFiller && (
          <div className="bg-white/80 backdrop-blur-[24px] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-4">
            {gapFiller.postWorkoutWindow && (
              <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-4 py-3">
                <span className="text-orange-500 text-xl">🔥</span>
                <div>
                  <span className="font-black text-sm text-orange-600 block">חלון ריקברי פתוח — 45 דקות</span>
                  <span className="text-[#656464] text-xs">תזון עכשיו לשיקום מקסימלי</span>
                </div>
                {gapFiller.caloriesBurned > 0 && <span className="font-black text-sm text-orange-600 mr-auto">~{gapFiller.caloriesBurned} קאל</span>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#506600] text-[9px] font-black tracking-[0.3em] uppercase block mb-1">AI ASSIST</span>
                <h3 className="font-black text-[#151C25] text-xl uppercase tracking-tight leading-none">GAP FILLER</h3>
                <p className="text-[#656464] text-xs mt-1">{gapFiller.message}</p>
              </div>
              <button onClick={fetchGapFiller} className="text-[#656464] hover:text-[#506600] active:scale-90 text-2xl transition-all duration-300">↻</button>
            </div>
            {gapFiller.caloriesGap > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#EEF4FF] rounded-xl p-4 text-center">
                  <span className="font-black text-2xl text-[#506600] block leading-none">{gapFiller.caloriesGap}</span>
                  <span className="text-[#656464] text-[10px] uppercase font-black tracking-widest mt-1 block">קאל נותרו</span>
                </div>
                <div className="bg-[#EEF4FF] rounded-xl p-4 text-center">
                  <span className="font-black text-2xl text-[#151C25] block leading-none">{gapFiller.proteinGap > 0 ? gapFiller.proteinGap : 0}g</span>
                  <span className="text-[#656464] text-[10px] uppercase font-black tracking-widest mt-1 block">חלבון נותר</span>
                </div>
              </div>
            )}
            {gapFiller.suggestions.length > 0 && (
              <div className="space-y-2">
                <span className="text-[#656464] text-[10px] uppercase tracking-widest font-black">המלצות</span>
                {gapFiller.suggestions.map((s, i) => (
                  <div key={i} className="bg-[#EEF4FF] rounded-xl p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex-1">
                      <span className="font-black text-[#151C25] text-sm block">{s.name}</span>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[#506600] text-xs font-black">{s.protein}g חלבון</span>
                        <span className="text-[#656464] text-xs">{s.calories} kcal</span>
                      </div>
                    </div>
                    <button onClick={async () => {
                      await authFetch(`${API}/nutrition`, { method: 'POST', body: JSON.stringify({ meal_name: s.name, calories: s.calories, protein: s.protein, carbs: 0, fat: 0, date: today, entry_method: 'gap_filler' }) })
                      toast(`נוסף: ${s.name}`)
                      const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                      setData(updated); fetchGapFiller()
                    }} className="bg-[#CCFF00] text-black px-4 py-2 rounded-lg font-black text-xs shadow-[0_4px_16px_rgba(204,255,0,0.3)] active:scale-90 hover:-translate-y-0.5 transition-all duration-200">הוסף</button>
                  </div>
                ))}
              </div>
            )}
            {gapFiller.caloriesGap <= 0 && (
              <div className="flex items-center gap-2 text-[#506600]">
                <span className="font-black">✓</span>
                <span className="font-black text-sm">{gapFiller.message}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Meal Groups ── */}
        {[
          { label: 'ארוחת בוקר', eyebrow: 'BREAKFAST', items: BREAKFAST },
          { label: 'צהריים',     eyebrow: 'LUNCH',     items: LUNCH },
          { label: 'ערב',        eyebrow: 'DINNER',    items: DINNER },
          { label: 'חטיפים',     eyebrow: 'SNACKS',    items: SNACKS }
        ].map(group => (
          <div key={group.label} className="space-y-3">
            <div className="flex items-center justify-between pb-3">
              <div>
                <span className="text-[#506600] text-[9px] font-black tracking-[0.3em] uppercase block">{group.eyebrow}</span>
                <h3 className="font-black text-[#151C25] text-2xl uppercase tracking-tight leading-none">{group.label}</h3>
              </div>
              <button
                onClick={() => { setAddModal(group.label); setAddSearch(''); setAddBarcode(false) }}
                className="bg-[#CCFF00] text-black w-10 h-10 rounded-xl font-black text-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(204,255,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(204,255,0,0.5)] active:scale-90 transition-all duration-200"
              >+</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {group.items.map(p => (
                <button
                  key={p.key}
                  onClick={() => quickLog(p.key)}
                  className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 flex justify-between items-center active:scale-[0.98] w-full hover:bg-[#CCFF00] hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="text-right">
                    <span className="font-black text-[#151C25] text-sm block">{p.meal_name}</span>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[#656464] text-[10px] group-hover:text-black/60">{p.calories} kcal</span>
                      <span className="text-[#506600] text-[10px] font-black group-hover:text-black">{p.protein}g חלבון</span>
                    </div>
                  </div>
                  <span className="text-[#CCFF00] group-hover:text-black text-xl font-black transition-colors">+</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* ── Today's Log ── */}
        {data?.meals?.length > 0 && (
          <div className="space-y-3">
            <div className="pb-3">
              <span className="text-[#506600] text-[9px] font-black tracking-[0.3em] uppercase block">TODAY</span>
              <h3 className="font-black text-[#151C25] text-2xl uppercase tracking-tight leading-none">הוזן היום</h3>
            </div>
            {data.meals.map((m, i) => (
              <div key={i} className="bg-white/80 backdrop-blur-[24px] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 flex justify-between items-center hover:-translate-y-0.5 transition-all duration-300">
                <div className="text-right">
                  <span className="font-black text-[#151C25] text-sm block">{m.meal_name}</span>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[#656464] text-[10px]">{m.calories} kcal</span>
                    <span className="text-[#506600] text-[10px] font-black">{m.protein}g חלבון</span>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase ${m.entry_method === 'one_tap' ? 'bg-[#CCFF00] text-black' : 'bg-[#EEF4FF] text-[#656464]'}`}>
                  {m.entry_method === 'one_tap' ? 'QUICK' : 'MANUAL'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Food Modal (light) ── */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 bg-[#151C25]/50 backdrop-blur-sm flex items-end justify-center px-4 pb-8"
          onClick={e => { if (e.target === e.currentTarget) { setAddModal(null); setAddSearch(''); setAddBarcode(false); setSelectedFood(null); setSearchResults([]) } }}
        >
          <div className="bg-[#F8F9FF] rounded-2xl w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex justify-between items-center pb-4 mb-2">
              <div>
                <span className="text-[#506600] text-[9px] font-black tracking-[0.3em] uppercase block mb-1">ADD FOOD</span>
                <h3 className="font-black text-[#151C25] text-xl uppercase tracking-tight leading-none">הוסף ל{addModal}</h3>
              </div>
              <button
                onClick={() => { setAddModal(null); setAddSearch(''); setAddBarcode(false); setSelectedFood(null); setSearchResults([]) }}
                className="text-[#656464] hover:text-[#151C25] text-xl font-black w-8 h-8 flex items-center justify-center hover:bg-[#EEF4FF] rounded-lg transition-all"
              >✕</button>
            </div>

            <input
              className="w-full bg-[#EEF4FF] rounded-xl px-4 py-3 text-[#151C25] text-sm outline-none placeholder:text-[#656464] focus:bg-[#DCE3F0] transition-colors"
              placeholder="חפש מזון — אורז, עוף, ביצה..."
              value={addSearch}
              onChange={e => handleSearchChange(e.target.value)}
              dir="rtl"
              autoFocus
            />

            {selectedFood && (
              <div className="bg-[#EEF4FF] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-[#151C25] text-sm">{selectedFood.name}</span>
                  <button onClick={() => setSelectedFood(null)} className="text-[#656464] hover:text-[#151C25] transition-colors">✕</button>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#656464] text-xs uppercase font-black tracking-widest">כמות</span>
                    <span className="text-[#506600] font-black text-sm">{grams}g</span>
                  </div>
                  <input type="range" min="10" max="500" step="5" value={grams} onChange={e => setGrams(Number(e.target.value))} className="w-full accent-[#CCFF00]" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'קאל',   val: Math.round(selectedFood.calories * grams / 100),           color: '#506600' },
                    { label: 'חלבון', val: `${Math.round(selectedFood.protein * grams / 10) / 10}g`,  color: '#ff734a' },
                    { label: "פחמ'",  val: `${Math.round(selectedFood.carbs   * grams / 10) / 10}g`,  color: '#00b4d8' },
                    { label: 'שומן',  val: `${Math.round(selectedFood.fat     * grams / 10) / 10}g`,  color: '#c77dff' }
                  ].map(m => (
                    <div key={m.label} className="bg-white rounded-lg py-2">
                      <span className="block font-black text-sm" style={{ color: m.color }}>{m.val}</span>
                      <span className="text-[#656464] text-[9px] uppercase tracking-widest">{m.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={async () => {
                  const cal  = Math.round(selectedFood.calories * grams / 100)
                  const prot = Math.round(selectedFood.protein  * grams / 10) / 10
                  const carb = Math.round(selectedFood.carbs    * grams / 10) / 10
                  const fat  = Math.round(selectedFood.fat      * grams / 10) / 10
                  await authFetch(`${API}/nutrition`, { method: 'POST', body: JSON.stringify({ meal_name: `${selectedFood.name} (${grams}g)`, calories: cal, protein: prot, carbs: carb, fat, date: today, entry_method: 'search' }) })
                  toast(`נוסף: ${selectedFood.name}`)
                  const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                  setData(updated); setAddModal(null); setAddSearch(''); setSelectedFood(null); setSearchResults([])
                }} className="w-full bg-[#CCFF00] text-black py-3 rounded-xl font-black text-sm shadow-[0_4px_24px_rgba(204,255,0,0.35)] active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200">הוסף {grams}g</button>
              </div>
            )}

            {!selectedFood && addSearch && (
              <div className="space-y-2">
                <span className="text-[#656464] text-[9px] uppercase tracking-widest font-black">תוצאות</span>
                {searchResults.length === 0
                  ? <p className="text-[#656464] text-xs text-center py-2">לא נמצאו תוצאות</p>
                  : searchResults.map((f, i) => (
                    <button key={i} onClick={() => { setSelectedFood(f); setGrams(100) }}
                      className="w-full bg-white rounded-xl p-3 flex justify-between items-center active:scale-[0.98] text-right hover:bg-[#CCFF00] transition-all duration-300 group">
                      <div>
                        <span className="font-black text-[#151C25] text-sm block">{f.name}</span>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-[#656464] text-[10px]">{f.calories} kcal/100g</span>
                          <span className="text-[#506600] text-[10px] font-black">{f.protein}g חלבון</span>
                        </div>
                      </div>
                      <span className="text-[#656464] group-hover:text-black font-black">›</span>
                    </button>
                  ))
                }
              </div>
            )}

            {!selectedFood && (
              <button
                onClick={() => setAddBarcode(v => !v)}
                className="w-full flex items-center justify-center gap-2 bg-[#EEF4FF] rounded-xl px-4 py-3 font-black text-[#151C25] text-sm active:scale-[0.98] hover:bg-[#DCE3F0] transition-all duration-300"
              >
                📷 סריקת ברקוד
              </button>
            )}

            {addBarcode && (
              <BarcodeScanner onAdd={async (meal) => {
                await authFetch(`${API}/nutrition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...meal, date: today, entry_method: 'barcode' }) })
                toast(`נוסף: ${meal.meal_name}`)
                const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                setData(updated); setAddModal(null); setAddBarcode(false)
              }} />
            )}

            {!addSearch && !selectedFood && recentMeals.length > 0 && (
              <div className="space-y-2">
                <span className="text-[#656464] text-[9px] uppercase tracking-widest font-black">ארוחות אחרונות</span>
                {recentMeals.map((m, i) => (
                  <button key={i}
                    onClick={() => { setSelectedFood({ name: m.meal_name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, per: 100 }); setGrams(100) }}
                    className="w-full bg-white rounded-xl p-3 flex justify-between items-center active:scale-[0.98] text-right hover:bg-[#CCFF00] transition-all duration-300 group">
                    <div>
                      <span className="font-black text-[#151C25] text-sm block">{m.meal_name}</span>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[#656464] text-[10px]">{m.calories} kcal</span>
                        <span className="text-[#506600] text-[10px] font-black">{m.protein}g חלבון</span>
                      </div>
                    </div>
                    <span className="text-[#CCFF00] group-hover:text-black text-xl font-black">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
