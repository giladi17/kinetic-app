import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { authFetch } from '../api'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LIME = '#00BFFF'

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
      className="rounded-xl px-3 py-2 shadow-2xl text-right"
      style={{
        backgroundColor: dark ? '#1C1C1E' : '#ffffff',
        border: `1px solid ${dark ? '#2C2C2C' : '#EEF4FF'}`,
      }}
    >
      <p className="font-black text-[10px] uppercase tracking-widest mb-1"
        style={{ color: dark ? '#888' : '#656464' }}>{label}</p>
      <p className="font-black text-sm" style={{ color: LIME }}>
        {payload[0].value} ק"ג
      </p>
    </div>
  )
}

export default function WeightTracker() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [input,   setInput]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const dark = useDarkMode()

  const gridColor = dark ? '#2A2A2A' : '#F0F4FF'
  const tickColor = dark ? '#666666' : '#9CA3AF'

  function fetchLogs() {
    authFetch(`${API}/api/weight`)
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [])

  async function save() {
    const w = parseFloat(input)
    if (!w || w < 30 || w > 300) return
    setSaving(true)
    try {
      await authFetch(`${API}/api/weight`, {
        method: 'POST',
        body: JSON.stringify({ weight: w }),
      })
      setInput('')
      fetchLogs()
    } catch {}
    setSaving(false)
  }

  const current = logs.length > 0 ? logs[logs.length - 1].weight : null
  const prev    = logs.length > 1 ? logs[logs.length - 2].weight : null
  const delta   = current != null && prev != null ? (current - prev).toFixed(1) : null

  return (
    <div>
      {/* Header row */}
      <div className="flex justify-between items-end mb-5">
        <div>
          {current != null && (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#151C25] dark:text-white">{current}</span>
              <span className="text-sm font-bold text-[#656464]">ק"ג</span>
              {delta != null && (
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{
                    color: parseFloat(delta) <= 0 ? LIME : '#FF6B6B',
                    backgroundColor: parseFloat(delta) <= 0 ? 'rgba(0,191,255,0.12)' : 'rgba(255,107,107,0.12)',
                  }}
                >
                  {parseFloat(delta) > 0 ? '+' : ''}{delta} ק"ג
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#656464]">
          {logs.length} שקילות
        </span>
      </div>

      {/* Input row */}
      <div className="flex gap-2 mb-5">
        <input
          type="number"
          step="0.1"
          min="30"
          max="300"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder='משקל (ק"ג)'
          className="flex-1 rounded-xl px-4 py-2.5 text-sm font-black border outline-none transition-all
            bg-[#F8F9FF] dark:bg-[#2C2C2C] text-[#151C25] dark:text-white
            border-[#E8EEF8] dark:border-[#3C3C3C]
            focus:border-[#00BFFF] focus:ring-2 focus:ring-[#00BFFF]/20"
        />
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-[#121212] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: LIME }}
        >
          {saving ? '...' : 'שמור שקילה'}
        </button>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <span className="animate-pulse font-black text-xs uppercase tracking-widest" style={{ color: LIME }}>
            LOADING...
          </span>
        </div>
      ) : logs.length < 2 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-4xl" style={{ color: gridColor }}>monitor_weight</span>
          <p className="text-[#B0B0B0] font-black text-xs uppercase tracking-widest">הוסף לפחות 2 שקילות לגרף</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={logs} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ stroke: LIME, strokeWidth: 1, strokeDasharray: '4 4' }} />
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
  )
}
