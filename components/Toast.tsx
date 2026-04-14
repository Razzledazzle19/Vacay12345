'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Single toast bubble ──────────────────────────────────────────────────────
function ToastBubble({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(false)

  // One-frame delay so the CSS transition fires on enter
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 16)
    return () => clearTimeout(t)
  }, [])

  const icon = {
    success: (
      <svg className="h-5 w-5 flex-shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="h-5 w-5 flex-shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  }[item.type]

  const border = {
    success: 'border-green-200',
    error:   'border-red-200',
    warning: 'border-amber-200',
  }[item.type]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        pointer-events-auto flex items-start gap-3
        rounded-xl border bg-white shadow-lg
        px-4 py-3 w-80 max-w-[calc(100vw-2rem)]
        transition-all duration-300 ease-out
        ${border}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
    >
      <span className="mt-0.5">{icon}</span>
      <p className="flex-1 text-sm text-gray-800 leading-snug">{item.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 transition"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = ++counter.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Stack — positioned fixed, bottom-right, above everything */}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((item) => (
          <ToastBubble
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx.toast
}
