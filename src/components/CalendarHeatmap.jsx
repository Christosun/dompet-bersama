import { formatRupiah } from '../lib/utils'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function CalendarHeatmap({ transactions, month, year }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const dailySpending = {}
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const d = parseInt(t.date.split('-')[2])
    dailySpending[d] = (dailySpending[d] || 0) + Number(t.amount)
  })

  const maxSpend = Math.max(...Object.values(dailySpending), 1)

  function intensity(day) {
    const amt = dailySpending[day] || 0
    if (!amt) return 0
    return Math.ceil((amt / maxSpend) * 4)
  }

  const BG = [
    'var(--bg-card2)',
    'rgba(245,166,35,0.15)',
    'rgba(245,166,35,0.35)',
    'rgba(245,166,35,0.6)',
    'rgba(245,166,35,0.88)',
  ]

  const today = new Date()
  const todayDay = (month === today.getMonth() + 1 && year === today.getFullYear()) ? today.getDate() : 0

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', padding: '3px 0', fontWeight: 500, letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const lvl = intensity(day)
          const isToday = day === todayDay
          const amt = dailySpending[day] || 0
          return (
            <div
              key={day}
              title={amt > 0 ? `${day}: ${formatRupiah(amt)}` : String(day)}
              style={{
                aspectRatio: '1',
                borderRadius: 5,
                background: BG[lvl],
                border: isToday ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10,
                color: lvl >= 3 ? '#1a0e00' : lvl > 0 ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: isToday ? 700 : 400,
                cursor: amt > 0 ? 'default' : 'default',
                userSelect: 'none',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rendah</span>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 3, background: BG[i], border: '1px solid var(--border)' }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tinggi</span>
      </div>
    </div>
  )
}
