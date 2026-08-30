import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'error') => {
    const id = ++idCounter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-5 pt-14">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-[380px] items-center gap-2.5 rounded-theme px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === 'error'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-success text-success-foreground'
            }`}
          >
            <iconify-icon
              icon={toast.type === 'error' ? 'lucide:triangle-alert' : 'lucide:check-circle-2'}
              class="shrink-0 text-lg"
            ></iconify-icon>
            <span className="min-w-0">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
