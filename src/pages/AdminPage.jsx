import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminQueue from '../components/admin/AdminQueue'

export default function AdminPage() {
  const { isAdmin } = useAuth()

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div>
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Approval Queue</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review, approve, flag, or remove submitted content. Uploaders will be notified of your decision.
        </p>
      </div>
      <AdminQueue />
    </div>
  )
}
