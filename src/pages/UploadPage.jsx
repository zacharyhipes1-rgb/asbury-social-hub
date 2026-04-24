import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import FormWizard from '../components/form/FormWizard'

export default function UploadPage() {
  const { isSocialMedia } = useAuth()

  if (!isSocialMedia) return <Navigate to="/" replace />

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-3xl mx-auto mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Upload Content</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Stage a new post for manager review. Complete all required steps — your submission will appear in the approval queue once submitted.
        </p>
      </div>
      <FormWizard />
    </div>
  )
}
