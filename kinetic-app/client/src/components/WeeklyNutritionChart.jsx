import { useState, useEffect } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { authFetch } from '../api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LIME   = '#CCFF00'
const ORANGE = '#ff734a'

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

function CustomTooltip({ active, payload, label, dark }) {
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
        <p key={i} className="font-black text-sm" style={{ color: p.color }}>
          {p.name === 'חלבון' ? `חלבון: ${Math.round(p.value)}g` : `קלוריות: ${Math.round(p.value)} kcal`}
        </p>
      ))}
    </div>
  )
}

export default function WeeklyNutritionChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const dark = useDarkMode()

  const gridColor = dark ? '#2A2A2A' : '#F0F4FF'
  const tickColor = dark ? '#666666' : '#9CA3AF'

  useEffect(() => {
    authFetch(`${API}/api/nutrition/weekly`)
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <span className="animate-pulse font-black text-sm uppercase tracking-widest" style={{ color: LIME }}>
        LOADING...
      </span>
    </div>
  )

  const hasData = data.some(d => d.calories > 0 || d.protein > 0)

  return (
    <div>
      {/* Legend */}
      <div className="flex gap-6 mb-5 justify-end">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: LIME }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#656464]">
            קלוריות · יעד 2800
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-0.5 rounded-full" style={{ backgroundColor: ORANGE }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#656464]">
            חלבון · יעד 130g
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-52 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-5xl" style={{ color: gridColor }}>bar_chart</span>
          <p className="text-[#B0B0B0] font-black text-sm uppercase tracking-widest">התחל לתעד תזונה כדי לראות גרף</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
            />
            {/* Left axis: protein (0–160g) */}
            <YAxis
              yAxisId="prot"
              orientation="left"
              domain={[0, 160]}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '' : `${v}g`}
              width={36}
            />
            {/* Right axis: calories (0–3500 kcal) */}
            <YAxis
              yAxisId="cal"
              orientation="right"
              domain={[0, 3500]}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: 'inherit' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v === 0 ? '' : `${(v / 1000).toFixed(1)}k`}
              width={36}
            />
            <Tooltip
              content={<CustomTooltip dark={dark} />}
              cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', radius: 6 }}
            />
            {/* Calorie target reference */}
            <ReferenceLine
              yAxisId="cal"
              y={2800}
              stroke={LIME}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />
            {/* Protein target reference */}
            <ReferenceLine
              yAxisId="prot"
              y={130}
              stroke={ORANGE}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              strokeOpacity={0.6}
            />
            <Bar
              yAxisId="cal"
              dataKey="calories"
              name="קלוריות"
              fill={LIME}
              radius={[5, 5, 0, 0]}
              maxBarSize={44}
              fillOpacity={dark ? 0.9 : 0.85}
            />
            <Line
              yAxisId="prot"
              type="monotone"
              dataKey="protein"
              name="חלבון"
              stroke={ORANGE}
              strokeWidth={2.5}
              dot={{ fill: ORANGE, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
