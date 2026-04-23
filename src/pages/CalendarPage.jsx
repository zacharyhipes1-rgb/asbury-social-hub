import CalendarView from '../components/calendar/CalendarView'

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Content Calendar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          View scheduled content across all dealerships. Drag posts to reschedule.
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <CalendarView />
      </div>
    </div>
  )
}
