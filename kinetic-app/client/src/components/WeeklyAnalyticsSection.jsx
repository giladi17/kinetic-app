import { useState, useEffect } from 'react'
import {
  ComposedChart, Bar, Cell, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
  LineChart,
} from 'recharts'
import { authFetch } from '../api'

const API          = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LIME         = '#CCFF00'
const ORANGE       = '#ff734a'
const LIME_DIM     = 'rgba(204,255,0,0.35)'
const ORANGE_DIM   = 'rgba(255,115,74,0.35)'
const CAL_TARGET   = 2800
const PROT_TARGET  = 130

function useDarkMode() {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  )
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function NutritionTooltip({ active, payload, label, dark }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl text-right"
      style={{
        backgroundColor: dark ? '#1C1C1E' : '#ffffff',
        border: `1px solid ${dark ? '#2C2C2C' : '#EEF4FF'}`,
      }}
    >
      <p className="font-black text-[10px] uppercase tracking-widest mb-2"
        style={{ color: dark ? '#888' : '#656464' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-black text-sm" style={{ color: p.fill }}>
          {p.dataKey === 'calories'
            ? `קלוריות: ${Math.round(p.value)} kcal`
            : `חלבון: ${Math.round(p.value)}g`}
        </p>
      ))}
    </div>
  )
}

function WeightTooltip({ active, payload, label, dark }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-2xl text-right"
      style={{
        backgroundColor: dark ? '#1C1C1E' : '#ffffff',
        border: `1px solid ${dark ? '#2C2C2C' : '#EEF4FF'}`,
      }}
    >
      <p className="font-black text-[10px] uppercase tracking-widest mb-1"
        style={{ color: dark ? '#888' : '#656464' }}>{label}</p>
      <p className="font-black text-sm" style={{ color: LIME }}>{payload[0].value} ק"ג</p>
    </div>
  )
}

export default function WeeklyAnalyticsSection() {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [weightInput, setWeightInput] = useState('')
  const [saving,      setSaving]      = useState(false)
  const dark = useDarkMode()

  const gridColor = dark ? '#2A2A2A' : '#F0F4FF'
  const tickColor = dark ? '#666666' : '#9CA3AF'

  function fetchData() {
    authFetch(`${API}/api/analytics/weekly-summary`)
      .then(r => r.json())
      .then(d => setData(d && !d.error ? d : null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  async function saveWeight() {
    const w = parseFloat(weightInput)
    if (!w || w < 30 || w > 300) return
    setSaving(true)
    try {
      await authFetch(`${API}/api/weight`, {
        method: 'POST',
        body: JSON.stringify({ weight: w }),
      })
      setWeightInput('')
      fetchData()
    } catch {}
    setSaving(false)
  }

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <span className="animate-pulse font-black text-sm uppercase tracking-widest" style={{ color: LIME }}>
        LOADING...
      </span>
    </div>
  )

  const nutritionData = data?.nutritionData || []
  const weightData    = data?.weightData    || []
  const averages      = data?.averages      || { calories: 0, protein: 0 }

  const hasNutrition  = nutritionData.some(d => d.calories > 0 || d.protein > 0)
  const hasWeight     = weightData.length >= 2
  const latestWeight  = weightData.length > 0 ? weightData[weightData.length - 1].weight : null
  const prevWeight    = weightData.length > 1 ? weightData[weightData.length - 2].weight : null
  const weightDelta   = latestWeight != null && prevWeight != null
    ? (latestWeight - prevWeight).toFixed(1) : null

  return (
    <div className="space-y-6">

      {/* ── Averages strip ── */}
      <div className="flex gap-8 flex-wrap">
        {[
          { label: 'ממוצע קלוריות', value: averages.calories, unit: 'kcal', target: CAL_TARGET, gap: CAL_TARGET - averages.calories },
          { label: 'ממוצע חלבון',   value: averages.protein,  unit: 'g',    target: PROT_TARGET, gap: PROT_TARGET - averages.protein },
        ].map((m, i) => (
          <div key={i} className={i > 0 ? 'border-r border-[#F0F0F0] dark:border-[#2C2C2C] pr-8' : ''}>
            <p className="text-[10px] uppercase tracking-widest text-[#656464] font-black">{m.label}</p>
            <p className="text-2xl font-black text-[#151C25] dark:text-white mt-0.5">
              {m.value}
              <span className="text-xs font-bold text-[#656464] ml-1">{m.unit}</span>
            </p>
            <p className="text-[10px] font-bold mt-0.5"
              style={{ color: m.gap <= 0 ? LIME : '#9CA3AF' }}>
              {m.gap <= 0
                ? `✓ יעד ${m.target}${m.unit} הושג`
                : `${m.gap}${m.unit} מהיעד`}
            </p>
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-5 justify-end">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: LIME }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#656464]">קלוריות · יעד {CAL_TARGET}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ORANGE }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#656464]">חלבון · יעד {PROT_TARGET}g</span>
        </div>
      </div>

      {/* ── Combined Bar Chart: calories + protein ── */}
      {!hasNutrition ? (
        <div className="h-56 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-5xl" style={{ color: gridColor }}>bar_chart</span>
          <p className="text-[#B0B0B0] font-black text-sm uppercase tracking-widest">התחל לתעד תזונה כדי לראות גרף</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={nutritionData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }} barGap={3} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="prot"
              orientation="left"
              domain={[0, 180]}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '' : `${v}g`}
              width={36}
            />
            <YAxis
              yAxisId="cal"
              orientation="right"
              domain={[0, 4000]}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '' : `${(v / 1000).toFixed(1)}k`}
              width={36}
            />
            <Tooltip
              content={<NutritionTooltip dark={dark} />}
              cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', radius: 6 }}
            />
            <ReferenceLine yAxisId="cal"  y={CAL_TARGET}  stroke={LIME}   strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.65} />
            <ReferenceLine yAxisId="prot" y={PROT_TARGET} stroke={ORANGE} strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.65} />
            <Bar yAxisId="cal" dataKey="calories" name="קלוריות" radius={[5, 5, 0, 0]} maxBarSize={26}>
              {nutritionData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.calories >= CAL_TARGET ? LIME : LIME_DIM}
                  style={entry.calories >= CAL_TARGET
                    ? { filter: 'drop-shadow(0 0 8px rgba(204,255,0,0.55))' }
                    : {}}
                />
              ))}
            </Bar>
            <Bar yAxisId="prot" dataKey="protein" name="חלבון" radius={[5, 5, 0, 0]} maxBarSize={26}>
              {nutritionData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.protein >= PROT_TARGET ? ORANGE : ORANGE_DIM}
                  style={entry.protein >= PROT_TARGET
                    ? { filter: 'drop-shadow(0 0 8px rgba(255,115,74,0.55))' }
                    : {}}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── Weight section ── */}
      <div className="pt-5 border-t border-[#F0F0F0] dark:border-[#2C2C2C]">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#656464] font-black mb-0.5">מגמת משקל</p>
            <div className="flex items-baseline gap-2">
              {latestWeight != null && (
                <span className="text-2xl font-black text-[#151C25] dark:text-white">{latestWeight} ק"ג</span>
              )}
              {weightDelta != null && (
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{
                    color: parseFloat(weightDelta) <= 0 ? LIME : '#FF6B6B',
                    backgroundColor: parseFloat(weightDelta) <= 0 ? 'rgba(204,255,0,0.12)' : 'rgba(255,107,107,0.12)',
                  }}
                >
                  {parseFloat(weightDelta) > 0 ? '+' : ''}{weightDelta} ק"ג
                </span>
              )}
            </div>
          </div>
          {/* Quick weight entry */}
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveWeight()}
              placeholder='ק"ג'
              className="w-24 rounded-xl px-3 py-2 text-sm font-black border outline-none transition-all
                bg-[#F8F9FF] dark:bg-[#2C2C2C] text-[#151C25] dark:text-white
                border-[#E8EEF8] dark:border-[#3C3C3C]
                focus:border-[#CCFF00] focus:ring-2 focus:ring-[#CCFF00]/20"
            />
            <button
              onClick={saveWeight}
              disabled={saving}
              className="px-3 py-2 rounded-xl font-black text-xs uppercase tracking-widest text-[#121212] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: LIME }}
            >
              {saving ? '...' : 'שמור'}
            </button>
          </div>
        </div>

        {!hasWeight ? (
          <div className="h-32 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl" style={{ color: gridColor }}>monitor_weight</span>
            <p className="text-[#B0B0B0] font-black text-xs uppercase tracking-widest">הוסף לפחות 2 שקילות לגרף</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={weightData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 10, fontWeight: 700, fontFamily: 'inherit' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: tickColor, fontSize: 10, fontFamily: 'inherit' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}`}
                width={32}
              />
              <Tooltip
                content={<WeightTooltip dark={dark} />}
                cursor={{ stroke: LIME, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={LIME}
                strokeWidth={2.5}
                dot={{ fill: LIME, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
