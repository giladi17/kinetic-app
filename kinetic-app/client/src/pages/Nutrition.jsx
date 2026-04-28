import { useEffect, useState, useRef } from 'react'
import { premiumFetch, authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

function MacroRing({ label, current, target, unit, color, pct }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="bg-[#1A1A1A] rounded-lg p-5 border-b-4 border-[#CCFF00] flex items-center gap-4 hover:-translate-y-1 transition-all duration-300">
      <svg width="80" height="80" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#262626" strokeWidth="8" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        <text x="45" y="50" textAnchor="middle" fill="#CCFF00" fontSize="14" fontWeight="bold" fontFamily="Space Grotesk">{pct}%</text>
      </svg>
      <div>
        <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block mb-1">{label}</span>
        <span className="text-white font-black text-3xl leading-none">{current}</span>
        <span className="text-white/40 text-xs">/{target}{unit}</span>
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
        <input className="flex-1 bg-[#262626] rounded-lg px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-[#CCFF00]" placeholder="הזן מספר ברקוד..." value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => e.key === 'Enter' && scan()} type="tel" />
        <button onClick={scan} disabled={scanning || !barcode.trim()} className="bg-[#CCFF00] text-black px-4 py-3 rounded-lg font-black text-sm active:scale-95 disabled:opacity-50">{scanning ? '...' : 'חפש'}</button>
      </div>
      {notFound && <p className="text-white/40 text-sm text-center">המוצר לא נמצא</p>}
      {product && (
        <div className="bg-[#262626] rounded-lg p-4 space-y-4">
          <div className="flex gap-3">
            {product.image_url && <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />}
            <div>
              <h4 className="font-black text-white text-base">{product.name}</h4>
              <p className="text-white/40 text-xs">{product.calories_per_100g} kcal | {product.protein_per_100g}g חלבון לכל 100g</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1"><span className="text-white/40 text-xs uppercase">כמות</span><span className="text-[#CCFF00] font-black text-sm">{grams}g</span></div>
            <input type="range" min="10" max="500" step="5" value={grams} onChange={e => setGrams(parseInt(e.target.value))} className="w-full accent-[#CCFF00]" />
          </div>
          <button onClick={() => onAdd({ meal_name: product.name, calories: Math.round(calc(product.calories_per_100g, grams)), protein: calc(product.protein_per_100g, grams), carbs: calc(product.carbs_per_100g, grams), fat: calc(product.fat_per_100g, grams) })} className="w-full bg-[#CCFF00] text-black py-3 rounded-lg font-black text-sm active:scale-95">הוסף לתזונה</button>
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
    toast(`✓ נוסף: ${meal.meal_name}`)
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
    <main className="pt-24 pb-32 px-6 min-h-screen bg-[#0E0E0E] flex items-center justify-center">
      <span className="text-[#CCFF00] text-2xl font-black animate-pulse uppercase tracking-widest">LOADING...</span>
    </main>
  )

  const totals = data?.totals || {}
  const targets = data?.targets || { calories: 2500, protein: 160 }
  const calPct = Math.min(100, Math.round(((totals.calories || 0) / targets.calories) * 100))
  const protPct = Math.min(100, Math.round(((totals.protein || 0) / targets.protein) * 100))
  const BREAKFAST = presets.filter(p => p.key.startsWith('breakfast'))
  const LUNCH = presets.filter(p => p.key.startsWith('lunch'))
  const DINNER = presets.filter(p => p.key.startsWith('dinner'))
  const SNACKS = presets.filter(p => p.key.startsWith('snack'))

  return (
    <main className="min-h-screen bg-[#0E0E0E] pb-32" dir="rtl">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#CCFF00] text-black px-6 py-3 rounded-lg font-black text-sm shadow-xl">{toastMsg}</div>
      )}

      {/* Page Header */}
      <div className="px-6 pt-24 pb-6 border-b border-white/5">
        <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block mb-2">DAILY FUEL</span>
        <h1 className="text-7xl font-black text-white tracking-tighter leading-none">תזונה</h1>
      </div>

      <div className="px-6 pt-6 max-w-3xl mx-auto space-y-6">

        {/* Macro Rings - Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MacroRing label="קלוריות" current={Math.round(totals.calories || 0)} target={targets.calories} unit="kcal" color="#CCFF00" pct={calPct} />
          <MacroRing label="חלבון" current={Math.round(totals.protein || 0)} target={targets.protein} unit="g" color="#ff734a" pct={protPct} />
        </div>

        {/* Secondary macro stats - 3 column bento */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'פחמימות', val: Math.round(totals.carbs || 0), unit: 'g' },
            { label: 'שומן', val: Math.round(totals.fat || 0), unit: 'g' },
            { label: 'ארוחות', val: data?.meals?.length || 0, unit: '' }
          ].map((m, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-lg p-4 text-center border-b-4 border-[#CCFF00] hover:-translate-y-1 transition-all duration-300">
              <span className="block font-black text-white text-2xl leading-none">{m.val}<span className="text-sm text-white/40">{m.unit}</span></span>
              <span className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mt-1 block">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Barcode Scanner Card */}
        <div className="bg-[#1A1A1A] rounded-lg p-5">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block mb-1">SCAN</span>
              <h3 className="font-black text-white text-lg uppercase tracking-tight leading-none">סריקת ברקוד</h3>
              <p className="text-white/40 text-xs mt-1">הוסף מוצר לפי מספר ברקוד</p>
            </div>
            <button onClick={() => setShowBarcode(s => !s)} className="bg-[#CCFF00] text-black px-4 py-2 rounded-lg font-black text-xs tracking-widest active:scale-95 hover:-translate-y-0.5 transition-all duration-300">סרוק</button>
          </div>
          {showBarcode && (
            <BarcodeScanner onAdd={async (meal) => {
              await fetch(`${API}/nutrition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...meal, date: today, entry_method: 'barcode' }) })
              toast(`✓ נוסף: ${meal.meal_name}`)
              const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
              setData(updated); setShowBarcode(false)
            }} />
          )}
        </div>

        {/* Gap Filler Card */}
        {gapFiller && (
          <div className="bg-[#1A1A1A] rounded-lg p-6 space-y-4">
            {gapFiller.postWorkoutWindow && (
              <div className="flex items-center gap-3 bg-[#ffa500]/10 border border-[#ffa500]/30 rounded-lg px-4 py-3">
                <span className="text-[#ffa500] text-xl">🔥</span>
                <div>
                  <span className="font-black text-sm text-[#ffa500] block">חלון ריקברי פתוח — 45 דקות</span>
                  <span className="text-white/40 text-xs">תזון עכשיו לשיקום מקסימלי</span>
                </div>
                {gapFiller.caloriesBurned > 0 && <span className="font-black text-sm text-[#ffa500] mr-auto">~{gapFiller.caloriesBurned} קאל נשרפו</span>}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block mb-1">AI ASSIST</span>
                <h3 className="font-black text-white text-xl uppercase tracking-tight leading-none">GAP FILLER</h3>
                <p className="text-white/40 text-xs mt-1">{gapFiller.message}</p>
              </div>
              <button onClick={fetchGapFiller} className="text-white/40 hover:text-[#CCFF00] active:scale-90 text-lg transition-all duration-300">↻</button>
            </div>
            {gapFiller.caloriesGap > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#262626] rounded-lg p-3 text-center border-b-2 border-[#CCFF00]">
                  <span className="font-black text-2xl text-[#CCFF00] block leading-none">{gapFiller.caloriesGap}</span>
                  <span className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1 block">קאל נותרו</span>
                </div>
                <div className="bg-[#262626] rounded-lg p-3 text-center border-b-2 border-white/20">
                  <span className="font-black text-2xl text-white/70 block leading-none">{gapFiller.proteinGap > 0 ? gapFiller.proteinGap : 0}g</span>
                  <span className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1 block">חלבון נותר</span>
                </div>
              </div>
            )}
            {gapFiller.suggestions.length > 0 && (
              <div className="space-y-2">
                <span className="text-white/40 text-[10px] uppercase tracking-widest font-black">המלצות</span>
                {gapFiller.suggestions.map((s, i) => (
                  <div key={i} className="bg-[#262626] rounded-lg p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex-1">
                      <span className="font-black text-white text-sm block">{s.name}</span>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[#CCFF00] text-xs font-black">{s.protein}g חלבון</span>
                        <span className="text-white/40 text-xs">{s.calories} kcal</span>
                      </div>
                    </div>
                    <button onClick={async () => {
                      await authFetch(`${API}/nutrition`, { method: 'POST', body: JSON.stringify({ meal_name: s.name, calories: s.calories, protein: s.protein, carbs: 0, fat: 0, date: today, entry_method: 'gap_filler' }) })
                      toast(`✓ נוסף: ${s.name}`)
                      const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                      setData(updated); fetchGapFiller()
                    }} className="bg-[#CCFF00] text-black px-3 py-2 rounded-lg font-black text-xs active:scale-90 hover:-translate-y-0.5 transition-all duration-300">הוסף</button>
                  </div>
                ))}
              </div>
            )}
            {gapFiller.caloriesGap <= 0 && (
              <div className="flex items-center gap-2 text-[#CCFF00]">
                <span className="font-black">✓</span>
                <span className="font-black text-sm">{gapFiller.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Meal Groups */}
        {[
          { label: 'ארוחת בוקר', eyebrow: 'BREAKFAST', items: BREAKFAST },
          { label: 'צהריים', eyebrow: 'LUNCH', items: LUNCH },
          { label: 'ערב', eyebrow: 'DINNER', items: DINNER },
          { label: 'חטיפים', eyebrow: 'SNACKS', items: SNACKS }
        ].map(group => (
          <div key={group.label} className="space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block">{group.eyebrow}</span>
                <h3 className="font-black text-white text-2xl uppercase tracking-tight leading-none">{group.label}</h3>
              </div>
              <button
                onClick={() => { setAddModal(group.label); setAddSearch(''); setAddBarcode(false) }}
                className="bg-[#CCFF00] text-black w-9 h-9 rounded-lg font-black text-xl flex items-center justify-center active:scale-90 hover:-translate-y-0.5 transition-all duration-300"
              >+</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {group.items.map(p => (
                <button
                  key={p.key}
                  onClick={() => quickLog(p.key)}
                  className="bg-[#1A1A1A] rounded-lg p-4 flex justify-between items-center active:scale-[0.98] w-full hover:bg-[#222] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="text-right">
                    <span className="font-black text-white text-sm block">{p.meal_name}</span>
                    <div className="flex gap-3 mt-1">
                      <span className="text-white/40 text-[10px]">{p.calories} kcal</span>
                      <span className="text-[#CCFF00] text-[10px] font-black">{p.protein}g חלבון</span>
                    </div>
                  </div>
                  <span className="text-[#CCFF00] text-xl font-black">+</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Today's Log */}
        {data?.meals?.length > 0 && (
          <div className="space-y-3">
            <div className="border-b border-white/10 pb-3">
              <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block">TODAY</span>
              <h3 className="font-black text-white text-2xl uppercase tracking-tight leading-none">הוזן היום</h3>
            </div>
            {data.meals.map((m, i) => (
              <div key={i} className="bg-[#1A1A1A] rounded-lg p-4 flex justify-between items-center hover:-translate-y-0.5 transition-all duration-300">
                <div className="text-right">
                  <span className="font-black text-white text-sm block">{m.meal_name}</span>
                  <div className="flex gap-3 mt-1">
                    <span className="text-white/40 text-[10px]">{m.calories} kcal</span>
                    <span className="text-[#CCFF00] text-[10px] font-black">{m.protein}g חלבון</span>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${m.entry_method === 'one_tap' ? 'bg-[#CCFF00]/20 text-[#CCFF00]' : 'bg-white/10 text-white/40'}`}>
                  {m.entry_method === 'one_tap' ? 'QUICK' : 'MANUAL'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Food Modal */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center px-4 pb-8"
          onClick={e => { if (e.target === e.currentTarget) { setAddModal(null); setAddSearch(''); setAddBarcode(false); setSelectedFood(null); setSearchResults([]) } }}
        >
          <div className="bg-[#1A1A1A] rounded-lg p-5 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div>
                <span className="text-[#CCFF00] text-[10px] font-black tracking-widest uppercase block mb-1">ADD FOOD</span>
                <h3 className="font-black text-white text-xl uppercase tracking-tight leading-none">הוסף ל{addModal}</h3>
              </div>
              <button
                onClick={() => { setAddModal(null); setAddSearch(''); setAddBarcode(false); setSelectedFood(null); setSearchResults([]) }}
                className="text-white/40 hover:text-white text-xl font-black w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all duration-300"
              >✕</button>
            </div>
            <input
              className="w-full bg-[#262626] rounded-lg px-4 py-3 text-white text-sm outline-none focus:ring-2 focus:ring-[#CCFF00]"
              placeholder="חפש מזון — אורז, עוף, ביצה..."
              value={addSearch}
              onChange={e => handleSearchChange(e.target.value)}
              dir="rtl"
              autoFocus
            />
            {selectedFood && (
              <div className="bg-[#262626] rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-white text-sm">{selectedFood.name}</span>
                  <button onClick={() => setSelectedFood(null)} className="text-white/40 hover:text-white transition-colors">✕</button>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/40 text-xs uppercase font-black tracking-widest">כמות</span>
                    <span className="text-[#CCFF00] font-black text-sm">{grams}g</span>
                  </div>
                  <input type="range" min="10" max="500" step="5" value={grams} onChange={e => setGrams(Number(e.target.value))} className="w-full accent-[#CCFF00]" />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'קאל', val: Math.round(selectedFood.calories * grams / 100), color: '#CCFF00' },
                    { label: 'חלבון', val: `${Math.round(selectedFood.protein * grams / 10) / 10}g`, color: '#ff734a' },
                    { label: "פחמ'", val: `${Math.round(selectedFood.carbs * grams / 10) / 10}g`, color: '#00b4d8' },
                    { label: 'שומן', val: `${Math.round(selectedFood.fat * grams / 10) / 10}g`, color: '#c77dff' }
                  ].map(m => (
                    <div key={m.label} className="bg-[#1A1A1A] rounded-lg py-2">
                      <span className="block font-black text-sm" style={{ color: m.color }}>{m.val}</span>
                      <span className="text-white/40 text-[9px] uppercase tracking-widest">{m.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const cal = Math.round(selectedFood.calories * grams / 100)
                    const prot = Math.round(selectedFood.protein * grams / 10) / 10
                    const carb = Math.round(selectedFood.carbs * grams / 10) / 10
                    const fat = Math.round(selectedFood.fat * grams / 10) / 10
                    await authFetch(`${API}/nutrition`, { method: 'POST', body: JSON.stringify({ meal_name: `${selectedFood.name} (${grams}g)`, calories: cal, protein: prot, carbs: carb, fat, date: today, entry_method: 'search' }) })
                    toast(`✓ נוסף: ${selectedFood.name}`)
                    const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                    setData(updated); setAddModal(null); setAddSearch(''); setSelectedFood(null); setSearchResults([])
                  }}
                  className="w-full bg-[#CCFF00] text-black py-3 rounded-lg font-black text-sm active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300"
                >הוסף {grams}g</button>
              </div>
            )}
            {!selectedFood && addSearch && (
              <div className="space-y-2">
                <span className="text-white/40 text-[9px] uppercase tracking-widest font-black">תוצאות</span>
                {searchResults.length === 0
                  ? <p className="text-white/40 text-xs text-center py-2">לא נמצאו תוצאות</p>
                  : searchResults.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedFood(f); setGrams(100) }}
                      className="w-full bg-[#262626] rounded-lg p-3 flex justify-between items-center active:scale-[0.98] text-right hover:bg-[#2a2a2a] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div>
                        <span className="font-black text-white text-sm block">{f.name}</span>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-white/40 text-[10px]">{f.calories} kcal/100g</span>
                          <span className="text-[#CCFF00] text-[10px] font-black">{f.protein}g חלבון</span>
                        </div>
                      </div>
                      <span className="text-[#CCFF00] font-black">›</span>
                    </button>
                  ))
                }
              </div>
            )}
            {!selectedFood && (
              <button
                onClick={() => setAddBarcode(v => !v)}
                className="w-full flex items-center justify-center gap-2 bg-[#262626] rounded-lg px-4 py-3 font-black text-white text-sm active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300"
              >📷 סריקת ברקוד</button>
            )}
            {addBarcode && (
              <BarcodeScanner onAdd={async (meal) => {
                await authFetch(`${API}/nutrition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...meal, date: today, entry_method: 'barcode' }) })
                toast(`✓ נוסף: ${meal.meal_name}`)
                const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                setData(updated); setAddModal(null); setAddBarcode(false)
              }} />
            )}
            {!addSearch && !selectedFood && recentMeals.length > 0 && (
              <div className="space-y-2">
                <span className="text-white/40 text-[9px] uppercase tracking-widest font-black">ארוחות אחרונות</span>
                {recentMeals.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedFood({ name: m.meal_name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, per: 100 }); setGrams(100) }}
                    className="w-full bg-[#262626] rounded-lg p-3 flex justify-between items-center active:scale-[0.98] text-right hover:bg-[#2a2a2a] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div>
                      <span className="font-black text-white text-sm block">{m.meal_name}</span>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-white/40 text-[10px]">{m.calories} kcal</span>
                        <span className="text-[#CCFF00] text-[10px] font-black">{m.protein}g חלבון</span>
                      </div>
                    </div>
                    <span className="text-[#CCFF00] text-xl font-black">+</span>
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
