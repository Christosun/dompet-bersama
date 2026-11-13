export function SkeletonBlock({ width = '100%', height = 14, radius = 6, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }} />
}

export function SkeletonStatGrid({ style }) {
  return (
    <div className="stat-grid" style={{ marginBottom: 24, ...style }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="stat-card">
          <SkeletonBlock height={11} width="55%" radius={4} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={24} width="75%" radius={6} style={{ marginBottom: 8 }} />
          <SkeletonBlock height={11} width="40%" radius={4} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTransactionList({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '9px 16px', background: 'var(--bg-card2)', borderBottom: '1px solid var(--border)' }}>
            <SkeletonBlock height={13} width="45%" radius={4} />
          </div>
          {[0, 1].map(j => (
            <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: j === 0 ? '1px solid var(--border)' : 'none' }}>
              <SkeletonBlock width={38} height={38} radius={10} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <SkeletonBlock height={14} width="50%" radius={4} style={{ marginBottom: 6 }} />
                <SkeletonBlock height={11} width="30%" radius={4} />
              </div>
              <SkeletonBlock height={15} width={72} radius={4} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonBudgetList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SkeletonBlock width={40} height={40} radius={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <SkeletonBlock height={14} width="40%" radius={4} />
                <SkeletonBlock height={14} width={28} radius={4} />
              </div>
              <SkeletonBlock height={6} radius={99} style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <SkeletonBlock height={11} width="28%" radius={4} />
                <SkeletonBlock height={11} width="28%" radius={4} />
                <SkeletonBlock height={11} width="28%" radius={4} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCategoryList({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <SkeletonBlock width={36} height={36} radius={8} style={{ flexShrink: 0 }} />
          <SkeletonBlock height={14} width="60%" radius={4} />
        </div>
      ))}
    </div>
  )
}

/* ── Grafik batang (menggantikan spinner di kartu grafik) ── */
export function SkeletonChart({ height = 232 }) {
  const hs = [45, 70, 35, 85, 55, 65, 40, 75, 50, 60]
  return (
    <div style={{ height, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 4px' }}>
      {hs.map((h, i) => (
        <SkeletonBlock key={i} height={`${h}%`} radius={4}
          style={{ width: 'auto', minWidth: 0, flexGrow: 1, flexBasis: 0, flexShrink: 1 }} />
      ))}
    </div>
  )
}

/* ── Donut + legenda ── */
export function SkeletonDonut() {
  const ring = 'radial-gradient(circle, transparent 55px, #000 56px)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '16px 28px', width: '100%', maxWidth: 540, margin: '0 auto' }}>
      <SkeletonBlock width={176} height={176} radius={99} style={{ WebkitMaskImage: ring, maskImage: ring }} />
      <div style={{ flex: '1 1 210px', maxWidth: 320, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SkeletonBlock width={8} height={8} radius={99} />
            <SkeletonBlock height={12} width="40%" radius={4} />
            <SkeletonBlock height={12} width={64} radius={4} style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Halaman Laporan ── */
export function SkeletonReports() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SkeletonStatGrid style={{ marginBottom: 0 }} />

      <div className="grid-2 stack-md">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 36, marginBottom: 14 }}>
            <SkeletonBlock height={11} width={120} radius={4} />
            <SkeletonBlock height={32} width={190} radius={10} />
          </div>
          <SkeletonChart />
        </div>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 36, marginBottom: 14 }}>
            <SkeletonBlock height={11} width={150} radius={4} />
          </div>
          <div style={{ minHeight: 232, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SkeletonDonut />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '24px 24px 20px' }}>
        <SkeletonBlock height={11} width={150} radius={4} style={{ marginBottom: 10 }} />
        <SkeletonBlock height={11} width="45%" radius={4} style={{ marginBottom: 18 }} />
        <SkeletonBlock height={58} radius={12} style={{ marginBottom: 18 }} />
        <SkeletonChart height={220} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i}>
              <SkeletonBlock height={10} width="60%" radius={4} style={{ marginBottom: 8 }} />
              <SkeletonBlock height={15} width="80%" radius={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Goals: isi kartu Rekap Bulanan ── */
export function SkeletonRekapBody() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[0, 1, 2].map(i => <SkeletonBlock key={i} height={46} radius={10} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <SkeletonBlock height={12} width="35%" radius={4} />
        <SkeletonBlock height={30} width={140} radius={10} />
      </div>
    </>
  )
}

/* ── Goals: tab Tabungan ── */
export function SkeletonSavings() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ borderRadius: 20, padding: '28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SkeletonBlock width={32} height={32} radius={10} />
            <SkeletonBlock width={110} height={11} radius={4} />
          </div>
          <SkeletonBlock width={150} height={28} radius={8} />
        </div>
        <SkeletonBlock width="55%" height={40} radius={8} style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ flex: 1, minWidth: 120, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <SkeletonBlock height={10} width="50%" radius={4} style={{ marginBottom: 8 }} />
              <SkeletonBlock height={16} width="70%" radius={4} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <SkeletonBlock height={11} width={110} radius={4} />
          <SkeletonBlock height={40} width={190} radius={12} />
        </div>
        <div style={{ padding: 20 }}><SkeletonRekapBody /></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0, 1].map(i => (
          <div key={i} className="card card-sm" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <SkeletonBlock width={38} height={38} radius={10} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock height={13} width="35%" radius={4} style={{ marginBottom: 6 }} />
              <SkeletonBlock height={11} width="50%" radius={4} />
            </div>
            <SkeletonBlock height={14} width={80} radius={4} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Goals: tab Goals ── */
export function SkeletonGoalList({ count = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-sm">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <SkeletonBlock width={46} height={46} radius={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <SkeletonBlock height={15} width="40%" radius={4} />
                <SkeletonBlock height={14} width={30} radius={4} />
              </div>
              <SkeletonBlock height={12} width="55%" radius={4} style={{ marginBottom: 10 }} />
              <SkeletonBlock height={8} radius={99} style={{ marginBottom: 10 }} />
              <SkeletonBlock height={11} width="35%" radius={4} />
            </div>
            <SkeletonBlock width={72} height={30} radius={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Transaksi berulang ── */
export function SkeletonRecurringList({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SkeletonBlock width={42} height={42} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <SkeletonBlock height={14} width="35%" radius={4} />
                <SkeletonBlock height={15} width={80} radius={4} />
              </div>
              <SkeletonBlock height={11} width="45%" radius={4} />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(j => <SkeletonBlock key={j} width={30} height={30} radius={8} />)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}