import { Clock } from 'lucide-react'

export default function IdleWarningModal({ countdown, onStay }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-7 w-full max-w-sm mx-4 text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4 border border-amber-100">
          <Clock size={24} className="text-amber-500" />
        </div>

        <h2 className="text-lg font-bold text-slate-900">Still there?</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          You've been inactive. For security, you'll be automatically signed out in{' '}
          <span className="font-bold text-amber-600 tabular-nums">{countdown}s</span>.
        </p>

        <button
          onClick={onStay}
          className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' }}
        >
          Stay signed in
        </button>
      </div>
    </div>
  )
}
