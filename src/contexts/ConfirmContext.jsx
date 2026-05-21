import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback((opts) => new Promise(resolve => setState({ ...opts, resolve })), [])

  function handleConfirm() { state?.resolve(true); setState(null) }
  function handleCancel() { state?.resolve(false); setState(null) }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-backdrop" style={{ zIndex: 2000 }} onClick={e => e.target === e.currentTarget && handleCancel()}>
          <div className="modal" style={{ maxWidth: 360 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '8px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={22} color="var(--red)" />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{state.title || 'Konfirmasi'}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{state.message || 'Yakin ingin melanjutkan?'}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button className="btn btn-ghost" onClick={handleCancel} style={{ flex: 1, justifyContent: 'center' }}>Batal</button>
                <button onClick={handleConfirm} style={{ flex: 1, justifyContent: 'center', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'var(--red)', color: 'white', transition: 'opacity 0.15s' }}>
                  {state.confirmLabel || 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
