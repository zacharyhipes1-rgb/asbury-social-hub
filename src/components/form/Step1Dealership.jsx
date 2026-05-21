import { useState, useEffect } from 'react'
import { MapPin, ChevronRight, BookOpen, Edit2, Check, X, CheckSquare, Square } from 'lucide-react'
import { DEALERSHIPS } from '../../data/dealerships'
import { useAuth } from '../../context/AuthContext'

function getBriefs() {
  try { return JSON.parse(localStorage.getItem('asbury_dealership_briefs') || '{}') } catch { return {} }
}
function saveBriefs(briefs) {
  localStorage.setItem('asbury_dealership_briefs', JSON.stringify(briefs))
}

function ContentBrief({ dealershipId }) {
  const { isAdmin } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [briefs, setBriefs] = useState(getBriefs)

  useEffect(() => { setDraft(briefs[dealershipId] || '') }, [dealershipId, briefs])

  const save = () => {
    const updated = { ...briefs, [dealershipId]: draft.trim() }
    saveBriefs(updated)
    setBriefs(updated)
    setEditing(false)
  }

  const brief = briefs[dealershipId]
  if (!brief && !isAdmin) return null

  return (
    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
      <div className="flex items-start gap-2">
        <BookOpen size={13} className="text-indigo-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Content Brief</p>
            {isAdmin && !editing && (
              <button onClick={() => setEditing(true)} className="p-0.5 rounded text-indigo-400 hover:text-indigo-700 transition-colors">
                <Edit2 size={11} />
              </button>
            )}
          </div>
          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={3}
                placeholder="Describe this dealership's content focus, tone, key messages..."
                className="w-full text-xs text-slate-700 border border-indigo-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-indigo-400 resize-none"
                autoFocus
              />
              <div className="flex gap-1.5 mt-1.5 justify-end">
                <button onClick={() => { setDraft(brief || ''); setEditing(false) }} className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <X size={10} /> Cancel
                </button>
                <button onClick={save} className="btn-press flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                  <Check size={10} /> Save
                </button>
              </div>
            </>
          ) : brief ? (
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{brief}</p>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2">
              Add a content brief for this dealership…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const BRAND_ORDER = ['Honda', 'BMW', 'Lexus', 'Acura', 'Toyota', 'Corporate']

export default function Step1Dealership({ data, onUpdate, onNext }) {
  const selectedIds = data.dealership_ids || []

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
    onUpdate({ dealership_ids: next })
  }

  const toggleBrand = (brandDealerships) => {
    const brandIds = brandDealerships.map(d => d.id)
    const allSelected = brandIds.every(id => selectedIds.includes(id))
    const next = allSelected
      ? selectedIds.filter(id => !brandIds.includes(id))
      : [...new Set([...selectedIds, ...brandIds])]
    onUpdate({ dealership_ids: next })
  }

  const grouped = DEALERSHIPS.reduce((acc, d) => {
    if (!acc[d.brand]) acc[d.brand] = []
    acc[d.brand].push(d)
    return acc
  }, {})

  const lastSelected = selectedIds.length === 1 ? selectedIds[0] : null

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Select Dealership(s)</h3>
        <p className="text-sm text-slate-500 mt-1">
          Choose one or more dealerships. The same content will be submitted for each location you select.
        </p>
      </div>

      <div className="space-y-5">
        {BRAND_ORDER.map(brand => {
          const dealerships = grouped[brand]
          if (!dealerships) return null
          const allSelected = dealerships.every(d => selectedIds.includes(d.id))
          const someSelected = dealerships.some(d => selectedIds.includes(d.id))

          return (
            <div key={brand}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{brand}</p>
                <button
                  type="button"
                  onClick={() => toggleBrand(dealerships)}
                  className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                    allSelected ? 'text-indigo-600 hover:text-indigo-800' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {allSelected
                    ? <><CheckSquare size={12} /> Deselect all</>
                    : <><Square size={12} /> Select all</>
                  }
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dealerships.map(d => {
                  const isSelected = selectedIds.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggle(d.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400'
                      }`}
                    >
                      <MapPin size={16} className={isSelected ? 'text-slate-300' : 'text-slate-400'} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{d.name}</p>
                        <p className={`text-xs mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {d.location}
                        </p>
                      </div>
                      {isSelected
                        ? <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-white" strokeWidth={3} />
                          </div>
                        : <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                      }
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Content brief for single selected dealership */}
      {lastSelected && <ContentBrief dealershipId={lastSelected} />}

      {/* Multi-selection summary */}
      {selectedIds.length > 1 && (
        <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-700 mb-1.5">
            {selectedIds.length} dealerships selected — content will be submitted for each
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.map(id => {
              const d = DEALERSHIPS.find(x => x.id === id)
              return (
                <span key={id} className="inline-flex items-center gap-1 text-xs bg-white border border-indigo-200 text-indigo-700 rounded-lg px-2 py-0.5">
                  {d?.name}
                  <button type="button" onClick={() => toggle(id)} className="text-indigo-400 hover:text-indigo-700">
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 bg-white border-t border-slate-100 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 mt-6 sm:mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={selectedIds.length === 0}
          className="flex items-center gap-2 px-5 sm:px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm
            hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>
            {selectedIds.length === 0
              ? 'Select a dealership'
              : selectedIds.length === 1
              ? `Continue with ${DEALERSHIPS.find(d => d.id === selectedIds[0])?.name}`
              : `Continue with ${selectedIds.length} dealerships`}
          </span>
          <ChevronRight size={16} className="flex-shrink-0" />
        </button>
      </div>
    </div>
  )
}
