import { useEffect, useState, useRef } from 'react'
import { premiumFetch, authFetch } from '../api'

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`

export default function Nutrition() {
  const [data, setData] = useState(null)
  const [presets, setPresets] = useState([])
  const [gapFiller, setGapFiller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState('')
  const [showBarcode, setShowBarcode] = useState(false)
  const [addModal, setAddModal] = useState(null) // null | slot label
  const [addSearch, setAddSearch] = useState('')
  const [recentMeals, setRecentMeals] = useState([])
  const [addBarcode, setAddBarcode] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedFood, setSelectedFood] = useState(null) // { name, calories, protein, carbs, fat, per }
  const [grams, setGrams] = useState(100)
  const searchTimerRef = useRef(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([
      authFetch(`${API}/nutrition?date=${today}`).then(r => r.json()),
      authFetch(`${API}/nutrition/presets`).then(r => r.json()),
    ]).then(([nutrition, p]) => {
      setData(nutrition)
      setPresets(p)
    }).finally(() => setLoading(false))
    // auto-fetch gap filler on load
    fetchGapFiller()
    // fetch recent meals for "+" modal
    authFetch(`${API}/nutrition/recent`).then(r => r.json()).then(setRecentMeals).catch(() => {})
  }, [])

  async function quickLog(presetKey) {
    const res = await authFetch(`${API}/nutrition/quick-log/${presetKey}`, { method: 'POST' })
    const meal = await res.json()
    toast(`✓ נוסף: ${meal.meal_name}`)
    // Refresh
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
    setAddSearch(q)
    setSelectedFood(null)
    clearTimeout(searchTimerRef.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimerRef.current = setTimeout(async () => {
      const res = await authFetch(`${API}/nutrition/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(Array.isArray(data) ? data : [])
    }, 300)
  }

  function toast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  if (loading) return (
    <main className="pt-24 pb-32 px-6 min-h-screen flex items-center justify-center">
      <span className="font-headline text-2xl font-bold animate-pulse text-primary-fixed-dim">LOADING...</span>
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
    <main className="pt-24 pb-32 px-6 max-w-3xl mx-auto space-y-8 min-h-screen">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary-container text-on-primary-fixed px-6 py-3 rounded-xl font-headline font-bold text-sm shadow-xl">
          {toastMsg}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-4">
        <span className="font-label text-primary-fixed-dim text-xs tracking-[0.2em] font-bold">TODAY</span>
        <h1 className="font-headline text-4xl font-bold tracking-tight uppercase">תזונה</h1>
      </div>

      {/* Macro Rings */}
      <div className="grid grid-cols-2 gap-4">
        <MacroRing label="קלוריות" current={Math.round(totals.calories || 0)} target={targets.calories} unit="kcal" color="#CCFF00" pct={calPct} />
        <MacroRing label="חלבון" current={Math.round(totals.protein || 0)} target={targets.protein} unit="g" color="#ff734a" pct={protPct} />
      </div>

      {/* Macro detail row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'פחמימות', val: Math.round(totals.carbs || 0), unit: 'g' },
          { label: 'שומן', val: Math.round(totals.fat || 0), unit: 'g' },
          { label: 'ארוחות', val: data?.meals?.length || 0, unit: '' },
        ].map((m, i) => (
          <div key={i} className="bg-surface-container-high rounded-xl p-4 text-center">
            <span className="block font-headline font-bold text-2xl">{m.val}<span className="text-sm text-on-surface-variant">{m.unit}</span></span>
            <span className="font-label text-[10px] text-on-surface-variant uppercase">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Barcode Scanner */}
      <div className="bg-surface-container-low rounded-xl p-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-headline font-bold text-base uppercase">סריקת ברקוד</h3>
            <p className="font-body text-xs text-on-surface-variant">הוסף מוצר לפי מספר ברקוד</p>
          </div>
          <button
            onClick={() => setShowBarcode(s => !s)}
            className="flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-lg font-headline font-bold text-xs tracking-widest active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-primary-fixed-dim text-base">barcode_scanner</span>
            סרוק
          </button>
        </div>
        {showBarcode && (
          <BarcodeScanner
            onAdd={async (meal) => {
              await fetch(`${API}/nutrition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...meal, date: today, entry_method: 'barcode' }),
              })
              toast(`✓ נוסף: ${meal.meal_name}`)
              const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
              setData(updated)
              setShowBarcode(false)
            }}
          />
        )}
      </div>

      {/* GAP FILLER Pro */}
      {gapFiller && (
        <div className="bg-surface-container-low rounded-xl p-6 space-y-4 animate-fade-up">
          {/* Post-workout banner */}
          {gapFiller.postWorkoutWindow && (
            <div className="flex items-center gap-3 bg-[#ffa500]/10 border border-[#ffa500]/30 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-[#ffa500]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <div>
                <span className="font-headline font-bold text-sm text-[#ffa500] block">חלון ריקברי פתוח — 45 דקות</span>
                <span className="font-label text-xs text-on-surface-variant">תזון עכשיו לשיקום מקסימלי</span>
              </div>
              {gapFiller.caloriesBurned > 0 && (
                <span className="font-headline font-bold text-sm text-[#ffa500] ml-auto">~{gapFiller.caloriesBurned} קאל נשרפו</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline font-bold text-lg uppercase">GAP FILLER</h3>
              <p className="font-label text-xs text-on-surface-variant">{gapFiller.message}</p>
            </div>
            <button onClick={fetchGapFiller} className="text-on-surface-variant opacity-60 hover:opacity-100 active:scale-90 duration-200">
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>

          {/* Gap bars */}
          {gapFiller.caloriesGap > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container rounded-xl p-3 text-center">
                <span className="font-headline font-black text-2xl text-primary-fixed-dim">{gapFiller.caloriesGap}</span>
                <span className="font-label text-[10px] text-on-surface-variant uppercase block">קאל נותרו</span>
              </div>
              <div className="bg-surface-container rounded-xl p-3 text-center">
                <span className="font-headline font-black text-2xl text-secondary">{gapFiller.proteinGap > 0 ? gapFiller.proteinGap : 0}g</span>
                <span className="font-label text-[10px] text-on-surface-variant uppercase block">חלבון נותר</span>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {gapFiller.suggestions.length > 0 && (
            <div className="space-y-2">
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">המלצות</span>
              {gapFiller.suggestions.map((s, i) => (
                <div key={i} className="bg-surface-container rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <span className="font-headline font-bold text-sm block">{s.name}</span>
                    <div className="flex gap-3 mt-0.5">
                      <span className="font-label text-xs text-secondary">{s.protein}g חלבון</span>
                      <span className="font-label text-xs text-on-surface-variant">{s.calories} kcal</span>
                      <span className="font-label text-xs text-[#ffa500]">{s.timing}</span>
                    </div>
                    <span className="font-label text-[10px] text-on-surface-variant">{s.reason}</span>
                  </div>
                  <button
                    onClick={async () => {
                      await authFetch(`${API}/nutrition`, {
                        method: 'POST',
                        body: JSON.stringify({ meal_name: s.name, calories: s.calories, protein: s.protein, carbs: 0, fat: 0, date: today, entry_method: 'gap_filler' }),
                      })
                      toast(`✓ נוסף: ${s.name}`)
                      const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                      setData(updated)
                      fetchGapFiller()
                    }}
                    className="bg-primary-container text-on-primary-fixed px-3 py-2 rounded-lg font-headline font-bold text-xs active:scale-90 duration-200 shrink-0"
                  >
                    הוסף
                  </button>
                </div>
              ))}
            </div>
          )}

          {gapFiller.caloriesGap <= 0 && (
            <div className="flex items-center gap-2 text-primary-fixed-dim">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="font-headline font-bold text-sm">{gapFiller.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Add Meal Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center px-4 pb-8"
          onClick={e => { if (e.target === e.currentTarget) { setAddModal(null); setAddSearch(''); setAddBarcode(false); setSelectedFood(null); setSearchResults([]) } }}>
          <div className="bg-surface-container-low rounded-2xl p-5 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg">הוסף ל{addModal}</h3>
              <button onClick={() => { setAddModal(null); setAddSearch(''); setAddBarcode(false); setSelectedFood(null); setSearchResults([]) }}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Search input */}
            <input
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm font-body text-on-surface placeholder:text-on-surface-variant/40 outline-none"
              placeholder="חפש מזון — אורז, עוף, ביצה..."
              value={addSearch}
              onChange={e => handleSearchChange(e.target.value)}
              dir="rtl"
              autoFocus
            />

            {/* Grams slider — shown after selecting a food */}
            {selectedFood && (
              <div className="bg-surface-container rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-headline font-bold text-sm">{selectedFood.name}</span>
                  <button onClick={() => setSelectedFood(null)} className="text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-label text-xs text-on-surface-variant">כמות</span>
                    <span className="font-headline font-bold text-primary-fixed-dim">{grams}g</span>
                  </div>
                  <input
                    type="range" min="10" max="500" step="5"
                    value={grams}
                    onChange={e => setGrams(Number(e.target.value))}
                    className="w-full accent-[#CCFF00]"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'קאל', val: Math.round(selectedFood.calories * grams / 100), color: '#CCFF00' },
                    { label: 'חלבון', val: `${Math.round(selectedFood.protein * grams / 10) / 10}g`, color: '#ff734a' },
                    { label: 'פחמ׳', val: `${Math.round(selectedFood.carbs * grams / 10) / 10}g`, color: '#00b4d8' },
                    { label: 'שומן', val: `${Math.round(selectedFood.fat * grams / 10) / 10}g`, color: '#c77dff' },
                  ].map(m => (
                    <div key={m.label} className="bg-surface-container-highest rounded-lg py-2">
                      <span className="block font-headline font-bold text-sm" style={{ color: m.color }}>{m.val}</span>
                      <span className="font-label text-[9px] text-on-surface-variant">{m.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={async () => {
                    const cal = Math.round(selectedFood.calories * grams / 100)
                    const prot = Math.round(selectedFood.protein * grams / 10) / 10
                    const carb = Math.round(selectedFood.carbs * grams / 10) / 10
                    const fat = Math.round(selectedFood.fat * grams / 10) / 10
                    await authFetch(`${API}/nutrition`, {
                      method: 'POST',
                      body: JSON.stringify({ meal_name: `${selectedFood.name} (${grams}g)`, calories: cal, protein: prot, carbs: carb, fat, date: today, entry_method: 'search' }),
                    })
                    toast(`✓ נוסף: ${selectedFood.name}`)
                    const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                    setData(updated)
                    setAddModal(null); setAddSearch(''); setSelectedFood(null); setSearchResults([])
                  }}
                  className="w-full bg-primary-container text-on-primary-fixed py-3 rounded-xl font-headline font-bold text-sm active:scale-[0.98] duration-200"
                >
                  הוסף {grams}g
                </button>
              </div>
            )}

            {/* Search results */}
            {!selectedFood && addSearch && (
              <div className="space-y-2">
                <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">תוצאות</span>
                {searchResults.length === 0
                  ? <p className="font-label text-xs text-on-surface-variant text-center py-2">לא נמצאו תוצאות</p>
                  : searchResults.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedFood(f); setGrams(100) }}
                      className="w-full bg-surface-container rounded-xl p-3 flex justify-between items-center active:scale-[0.98] duration-200 text-right"
                    >
                      <div>
                        <span className="font-headline font-bold text-sm">{f.name}</span>
                        <div className="flex gap-3 mt-0.5">
                          <span className="font-label text-[10px] text-on-surface-variant">{f.calories} kcal/100g</span>
                          <span className="font-label text-[10px] text-secondary">{f.protein}g חלבון</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-primary-fixed-dim">chevron_left</span>
                    </button>
                  ))
                }
              </div>
            )}

            {/* Barcode button */}
            {!selectedFood && (
              <button
                onClick={() => setAddBarcode(v => !v)}
                className="w-full flex items-center justify-center gap-2 bg-surface-container-highest rounded-lg px-4 py-3 font-headline font-bold text-sm active:scale-[0.98] duration-200"
              >
                <span className="material-symbols-outlined text-primary-fixed-dim text-base">barcode_scanner</span>
                סריקת ברקוד
              </button>
            )}

            {addBarcode && (
              <BarcodeScanner
                onAdd={async (meal) => {
                  await authFetch(`${API}/nutrition`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...meal, date: today, entry_method: 'barcode' }),
                  })
                  toast(`✓ נוסף: ${meal.meal_name}`)
                  const updated = await authFetch(`${API}/nutrition?date=${today}`).then(r => r.json())
                  setData(updated)
                  setAddModal(null); setAddBarcode(false)
                }}
              />
            )}

            {/* Recent meals */}
            {!addSearch && !selectedFood && recentMeals.length > 0 && (
              <div className="space-y-2">
                <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">ארוחות אחרונות</span>
                {recentMeals.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedFood({ name: m.meal_name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, per: 100 }); setGrams(100) }}
                    className="w-full bg-surface-container rounded-xl p-3 flex justify-between items-center active:scale-[0.98] duration-200 text-right"
                  >
                    <div>
                      <span className="font-headline font-bold text-sm">{m.meal_name}</span>
                      <div className="flex gap-3 mt-0.5">
                        <span className="font-label text-[10px] text-on-surface-variant">{m.calories} kcal</span>
                        <span className="font-label text-[10px] text-secondary">{m.protein}g חלבון</span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary-fixed-dim">add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Log */}
      {[
        { label: 'ארוחת בוקר', items: BREAKFAST },
        { label: 'צהריים', items: LUNCH },
        { label: 'ערב', items: DINNER },
        { label: 'חטיפים', items: SNACKS },
      ].map(group => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-sm uppercase text-on-surface-variant tracking-widest">{group.label}</h3>
            <button
              onClick={() => { setAddModal(group.label); setAddSearch(''); setAddBarcode(false) }}
              className="flex items-center gap-1 text-primary-fixed-dim active:scale-90 duration-200"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {group.items.map(p => (
              <button
                key={p.key}
                onClick={() => quickLog(p.key)}
                className="bg-surface-container-high rounded-xl p-4 flex justify-between items-center active:scale-[0.98] duration-200 text-left w-full"
              >
                <div>
                  <span className="font-headline font-bold text-sm">{p.meal_name}</span>
                  <div className="flex gap-3 mt-1">
                    <span className="font-label text-[10px] text-on-surface-variant">{p.calories} kcal</span>
                    <span className="font-label text-[10px] text-secondary">{p.protein}g חלבון</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary-fixed-dim">add_circle</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Today's log */}
      {data?.meals?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-headline font-bold text-sm uppercase text-on-surface-variant tracking-widest">הוזן היום</h3>
          {data.meals.map((m, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl p-4 flex justify-between items-center">
              <div>
                <span className="font-headline font-bold text-sm">{m.meal_name}</span>
                <div className="flex gap-3 mt-1">
                  <span className="font-label text-[10px] text-on-surface-variant">{m.calories} kcal</span>
                  <span className="font-label text-[10px] text-secondary">{m.protein}g חלבון</span>
                </div>
              </div>
              <span className={`font-label text-[9px] px-2 py-0.5 rounded-full ${m.entry_method === 'one_tap' ? 'bg-primary-container/20 text-primary-fixed-dim' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {m.entry_method === 'one_tap' ? 'QUICK' : 'MANUAL'}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
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
    setScanning(true)
    setNotFound(false)
    setProduct(null)
    try {
      const res = await fetch(`${API}/nutrition/scan/${barcode.trim()}`)
      const data = await res.json()
      if (data.found) {
        setProduct(data)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setScanning(false)
    }
  }

  function calcMacro(per100, g) { return parseFloat(((per100 * g) / 100).toFixed(1)) }

  function addToLog() {
    if (!product) return
    onAdd({
      meal_name: product.name,
      calories: Math.round(calcMacro(product.calories_per_100g, grams)),
      protein: calcMacro(product.protein_per_100g, grams),
      carbs: calcMacro(product.carbs_per_100g, grams),
      fat: calcMacro(product.fat_per_100g, grams),
    })
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Input + scan button */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-surface-container-highest rounded-lg px-4 py-3 font-body text-on-surface outline-none focus:ring-2 focus:ring-primary-container text-sm"
          placeholder="הזן מספר ברקוד (למשל: 7290000066219)"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && scan()}
          type="tel"
        />
        <button
          onClick={scan}
          disabled={scanning || !barcode.trim()}
          className="bg-primary-container text-on-primary-fixed px-4 py-3 rounded-lg font-headline font-bold text-sm active:scale-95 duration-200 disabled:opacity-50"
        >
          {scanning ? '...' : 'חפש'}
        </button>
      </div>

      {/* Not found */}
      {notFound && (
        <p className="font-body text-sm text-secondary text-center py-2">המוצר לא נמצא בבסיס הנתונים</p>
      )}

      {/* Product card */}
      {product && (
        <div className="bg-surface-container rounded-xl p-4 space-y-4">
          <div className="flex gap-3 items-start">
            {product.image_url && (
              <img src={product.image_url} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
            )}
            <div>
              <h4 className="font-headline font-bold text-base">{product.name}</h4>
              <p className="font-label text-xs text-on-surface-variant">לכל 100g: {product.calories_per_100g} kcal | {product.protein_per_100g}g חלבון</p>
            </div>
          </div>

          {/* Grams slider */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="font-label text-xs text-on-surface-variant uppercase">כמות</label>
              <span className="font-headline font-bold text-sm text-primary-fixed-dim">{grams}g</span>
            </div>
            <input type="range" min="10" max="500" step="5" value={grams}
              onChange={e => setGrams(parseInt(e.target.value))}
              className="w-full accent-[#CCFF00]" />
          </div>

          {/* Calculated macros */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'קלוריות', val: Math.round(calcMacro(product.calories_per_100g, grams)) },
              { label: 'חלבון', val: calcMacro(product.protein_per_100g, grams) + 'g' },
              { label: 'פחמימות', val: calcMacro(product.carbs_per_100g, grams) + 'g' },
              { label: 'שומן', val: calcMacro(product.fat_per_100g, grams) + 'g' },
            ].map((m, i) => (
              <div key={i} className="bg-surface-container-high rounded-lg py-2">
                <span className="block font-headline font-bold text-sm">{m.val}</span>
                <span className="font-label text-[9px] text-on-surface-variant uppercase">{m.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={addToLog}
            className="w-full bg-primary-container text-on-primary-fixed py-3 rounded-xl font-headline font-bold text-sm tracking-widest active:scale-95 duration-200"
          >
            הוסף לתזונה
          </button>
        </div>
      )}
    </div>
  )
}

function MacroRing({ label, current, target, unit, color, pct }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div className="bg-surface-container-low rounded-xl p-5 flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#262626" strokeWidth="8" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="45" y="50" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Space Grotesk">
          {pct}%
        </text>
      </svg>
      <div>
        <span className="font-label text-[10px] text-on-surface-variant uppercase block">{label}</span>
        <span className="font-headline font-bold text-xl">{current}</span>
        <span className="font-label text-xs text-on-surface-variant">/{target}{unit}</span>
      </div>
    </div>
  )
}
