import { useState, useEffect, useRef } from 'react'
import { Download, ChevronDown, FileText, FileSpreadsheet, Loader2, Check } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

const OPTIONS = [
  {
    key: 'pdf', title: 'Laporan PDF', tag: 'PDF', Icon: FileText, busy: 'Menyusun PDF…',
    desc: 'Ringkasan, grafik, perbandingan, kontribusi & seluruh transaksi dengan tampilan khas aplikasi.',
    ok: 'Laporan PDF berhasil diunduh',
  },
  {
    key: 'csv', title: 'Data CSV', tag: 'CSV', Icon: FileSpreadsheet, busy: 'Menyiapkan CSV…',
    desc: 'Data lengkap per bagian, siap dibuka di Excel atau Google Sheets.',
    ok: 'File CSV berhasil diunduh',
  },
]

export default function ExportMenu({ onExport, periodLabel, count = 0 }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [done, setDone] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = e => { if (!busy && rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape' && !busy) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, busy])

  async function pick(opt) {
    if (busy) return
    setBusy(opt.key)
    try {
      await onExport(opt.key)
      setDone(opt.key)
      toast.success(opt.ok)
      setTimeout(() => { setOpen(false); setDone(null) }, 900)
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat file: ' + (err?.message || 'terjadi kesalahan'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost export-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => !busy && setOpen(o => !o)}
      >
        <Download size={15} /> Export <ChevronDown size={14} className="export-chev" />
      </button>

      {open && (
        <>
          <div className="export-backdrop" onClick={() => !busy && setOpen(false)} />
          <div className="export-panel" role="menu">
            <div className="export-grabber" />
            <div className="export-head">
              <div className="export-head-title">Export Laporan</div>
              <div className="export-head-sub">{periodLabel} · {count} transaksi</div>
            </div>

            {OPTIONS.map(opt => {
              const isBusy = busy === opt.key
              const isDone = done === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="menuitem"
                  className={`export-option ${isBusy ? 'is-busy' : ''} ${isDone ? 'is-done' : ''}`}
                  disabled={!!busy || !!done}
                  onClick={() => pick(opt)}
                >
                  <span className={`export-ico ${opt.key}`}><opt.Icon size={20} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="export-title">{isBusy ? opt.busy : isDone ? 'Berhasil diunduh' : opt.title}</span>
                    <span className="export-desc">{opt.desc}</span>
                  </span>
                  <span className="export-state">
                    {isBusy ? <Loader2 size={16} className="export-spin" />
                      : isDone ? <Check size={16} color="var(--green)" />
                      : <span className="export-tag">{opt.tag}</span>}
                  </span>
                </button>
              )
            })}

            <div className="export-foot">Berisi semua yang tampil di halaman Laporan, plus daftar seluruh transaksi bulan ini.</div>
          </div>
        </>
      )}
    </div>
  )
}