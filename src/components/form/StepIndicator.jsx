import { Check } from 'lucide-react'

const STEPS = [
  { number: 1, label: 'Dealership' },
  { number: 2, label: 'Platform'   },
  { number: 3, label: 'Content Type' },
  { number: 4, label: 'Upload'     },
  { number: 5, label: 'Details'    },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="px-6 py-5 border-b border-slate-200 bg-white">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep
          const isActive = step.number === currentStep
          const isUpcoming = step.number > currentStep

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                  ${isCompleted ? 'bg-green-500 text-white'     : ''}
                  ${isActive    ? 'bg-slate-900 text-white ring-4 ring-slate-900/10' : ''}
                  ${isUpcoming  ? 'bg-slate-100 text-slate-400' : ''}
                `}>
                  {isCompleted ? <Check size={14} /> : step.number}
                </div>
                <span className={`
                  mt-1.5 text-xs font-medium hidden sm:block whitespace-nowrap
                  ${isActive    ? 'text-slate-900' : ''}
                  ${isCompleted ? 'text-green-600'  : ''}
                  ${isUpcoming  ? 'text-slate-400'  : ''}
                `}>
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-2 mb-4 transition-all
                  ${step.number < currentStep ? 'bg-green-400' : 'bg-slate-200'}
                `} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
