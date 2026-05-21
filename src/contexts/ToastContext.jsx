import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle size={16} color="#4ade80" />,
  error: <XCircle size={16} color="#f87171" />,
  warning: <AlertTriangle size={16} color="#fbbf24" />,
  info: <Info size={16} color="#60a5fa" />,
}

const BORDER = {
  success: 'rgba(74,222,128,0.3)',
  error: 'rgba(248,113,113,0.3)',
  warning: 'rgba(251,191,36,0.3)',
  info: 'rgba(96,165,250,0.3)',
}

function ToastItem({ toast, onRemove }) {
  return (
    <div className="toast" style={{ borderColor: BORDER[toast.type] || 'rgba(255,255,255,0.1)' }}>
      <span className="toast-icon">{ICONS[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      {toast.action && (
        <button className="toast-action" onClick={() => { toast.action.onClick(); onRemove(toast.id) }}>
          {toast.action.label}
        </button>
      )}
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <X size={14} />
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="toast-container">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback(({ message, type = 'info', duration = 3500, action }) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { id, message, type, action }])
    if (duration > 0) timers.current[id] = setTimeout(() => removeToast(id), duration)
    return id
  }, [removeToast])

  const toast = {
    success: (msg, opts) => addToast({ message: msg, type: 'success', ...opts }),
    error: (msg, opts) => addToast({ message: msg, type: 'error', duration: 5000, ...opts }),
    warning: (msg, opts) => addToast({ message: msg, type: 'warning', ...opts }),
    info: (msg, opts) => addToast({ message: msg, type: 'info', ...opts }),
    remove: removeToast,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
