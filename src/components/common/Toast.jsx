import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

const ICONS = {
  success: <CheckCircle size={18} className="text-green-500" />,
  warning: <AlertTriangle size={18} className="text-amber-500" />,
  error: <XCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
}

const BG = {
  success: 'border-green-200 bg-green-50',
  warning: 'border-amber-200 bg-amber-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg pointer-events-auto
            max-w-sm w-full animate-in slide-in-from-right-4 ${BG[toast.type] || BG.info}`}
        >
          <span className="flex-shrink-0 mt-0.5">{ICONS[toast.type] || ICONS.info}</span>
          <p className="text-sm text-slate-800 flex-1 leading-snug">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
