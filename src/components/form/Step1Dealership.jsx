import { MapPin, ChevronRight } from 'lucide-react'
import { DEALERSHIPS } from '../../data/dealerships'

export default function Step1Dealership({ data, onUpdate, onNext }) {
  const selected = data.dealership_id

  const handleSelect = (id) => {
    onUpdate({ dealership_id: id })
  }

  const grouped = DEALERSHIPS.reduce((acc, d) => {
    const brand = d.brand
    if (!acc[brand]) acc[brand] = []
    acc[brand].push(d)
    return acc
  }, {})

  const brandOrder = ['Honda', 'BMW', 'Lexus', 'Acura', 'Toyota', 'Corporate']

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Select Dealership</h3>
        <p className="text-sm text-slate-500 mt-1">
          Choose the dealership this content is being created for. Each dealership has its own content calendar and approval workflow.
        </p>
      </div>

      <div className="space-y-5">
        {brandOrder.map(brand => {
          const dealerships = grouped[brand]
          if (!dealerships) return null
          return (
            <div key={brand}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{brand}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dealerships.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelect(d.id)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                      ${selected === d.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                      }
                    `}
                  >
                    <MapPin size={16} className={selected === d.id ? 'text-slate-300' : 'text-slate-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{d.name}</p>
                      <p className={`text-xs mt-0.5 truncate ${selected === d.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {d.location}
                      </p>
                    </div>
                    {selected === d.id && <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm
            hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continue
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
