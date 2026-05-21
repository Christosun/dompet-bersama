export function SkeletonBlock({ width = '100%', height = 14, radius = 6, style = {} }) {
  return <div className="skeleton" style={{ width, height, borderRadius: radius, flexShrink: 0, ...style }} />
}

export function SkeletonStatGrid() {
  return (
    <div className="stat-grid" style={{ marginBottom: 24 }}>
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
