import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { CategoryIcon } from './CategoryIcon'
import { formatRupiah } from '../lib/utils'

/* Catatan 1 baris. Kalau terpotong, baris induknya diberi class "is-cut". */
export function TxNote({ text, fallback = null }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const row = el.closest('.tx-item')
    const check = () => row?.classList.toggle('is-cut', el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => { ro.disconnect(); row?.classList.remove('is-cut') }
  }, [text])

  return <div ref={ref} className="tx-note">{text || fallback}</div>
}

/* Hook: pasang onRowClick di .tx-item, render {dialog} sekali di halaman. */
export function useNoteDialog() {
  const [data, setData] = useState(null)

  function onRowClick(e, tx, who) {
    if (e.target.closest('button, a')) return          // abaikan tombol edit/hapus
    if (!e.currentTarget.classList.contains('is-cut')) return
    setData({ tx, who })
  }

  const dialog = data && <NoteDialog {...data} onClose={() => setData(null)} />
  return { onRowClick, dialog }
}

function NoteDialog({ tx, who, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const color = tx.categories?.color || '#6b7280'
  const isIncome = tx.type === 'income'
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(tx.date + 'T00:00:00'))

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }} role="dialog" aria-label="Catatan transaksi">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CategoryIcon icon={tx.categories?.icon} size={18} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{tx.categories?.name || 'Tidak diketahui'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {dateLabel}{who ? ` · ${who.name.split(' ')[0]}` : ''}
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14, color: isIncome ? 'var(--green)' : 'var(--text)' }}>
          {isIncome ? '+' : '-'}{formatRupiah(tx.amount)}
        </div>

        <div className="form-label">Catatan</div>
        <div style={{
          padding: '12px 14px', background: 'var(--bg-card2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', fontSize: 14, lineHeight: 1.6, color: 'var(--text)',
          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text',
        }}>
          {tx.note}
        </div>
      </div>
    </div>
  )
}