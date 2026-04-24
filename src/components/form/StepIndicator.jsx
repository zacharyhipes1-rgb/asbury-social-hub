import { Check } from 'lucide-react'

const STEPS = [
  { number: 1, label: 'Dealership',    hint: 'Choose which dealership this content belongs to' },
  { number: 2, label: 'Platform',      hint: 'Pick the social media platform for this post' },
  { number: 3, label: 'Content Type',  hint: 'Select the format — image, video, reel, etc.' },
  { number: 4, label: 'Upload',        hint: 'Add your media file, caption, and hashtags' },
  { number: 5, label: 'Details',       hint: 'Set a schedule date and review before submitting' },
]

export default function StepIndicator({ currentStep }) {
  const current = STEPS.find(s => s.number === currentStep)

  return (
    <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-slate-200 bg-white">
      {/* Step dots */}
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep
          const isActive    = step.number === currentStep
          const isUpcoming  = step.number > currentStep

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

      {/* Step context line */}
      {current && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-slate-200">·</span>
          <span className="text-xs text-slate-500">{current.hint}</span>
        </div>
      )}
    </div>
  )
}
