import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePosts } from '../../context/PostsContext'
import { useToast } from '../../context/ToastContext'
import { useUsers } from '../../context/UsersContext'
import { notifyNewUpload } from '../../services/emailService'
import StepIndicator from './StepIndicator'
import Step1Dealership from './Step1Dealership'
import Step2Platform from './Step2Platform'
import Step3ContentType from './Step3ContentType'
import Step4Upload from './Step4Upload'
import Step5Optional from './Step5Optional'

const INITIAL_FORM = {
  dealership_id: '',
  platform: '',
  content_type: '',
  caption: '',
  hashtags: [],
  alt_text: '',
  file_name: '',
  file_size: 0,
  file_type: '',
  file_preview: null,
  file_url: null,
  target_audience: '',
  posting_reason: '',
  optimal_posting_time: '',
  scheduled_for: '',
}

const DEMO_FORM = {
  dealership_id: 'nalley-honda',
  platform: 'instagram',
  content_type: 'reel',
  caption: 'Summer savings event is HERE! Stop by Nalley Honda this weekend and drive home in your dream car. Low APR financing available on select models.',
  hashtags: ['#NalleyHonda', '#HondaDeals', '#CollegePark', '#SummerSavings'],
  alt_text: 'Red Honda CR-V parked in front of Nalley Honda on a sunny day',
  file_name: 'nalley_crv_promo.mp4',
  file_size: 24500000,
  file_type: 'video/mp4',
  file_preview: null,
  target_audience: 'Honda owners in College Park, ages 25–54',
  posting_reason: 'Monthly sales event — drive weekend foot traffic',
  optimal_posting_time: '12:00',
  scheduled_for: '2026-04-25',
}

export default function FormWizard() {
  const params = new URLSearchParams(window.location.search)
  const demoStep = parseInt(params.get('demo') || '0')
  const [step, setStep] = useState(demoStep >= 1 && demoStep <= 5 ? demoStep : 1)
  const [formData, setFormData] = useState(demoStep >= 2 ? DEMO_FORM : INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currentUser } = useAuth()
  const { addPost } = usePosts()
  const { addToast } = useToast()
  const { getAdmins, getSocialTeam } = useUsers()
  const navigate = useNavigate()

  const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }))

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 600))

    const post = addPost({
      ...formData,
      uploaded_by:      currentUser.email,
      uploaded_by_name: currentUser.name,
    })

    const admins     = getAdmins()
    const socialTeam = getSocialTeam()
    const admin      = admins[0] || { name: 'Chad Mitchell', email: 'chad.mitchell@asburyauto.com' }
    notifyNewUpload({ post, uploader: currentUser, socialTeam, admin }).catch(() => {})

    addToast('Content submitted — your team has been notified.', 'success')
    setIsSubmitting(false)
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <StepIndicator currentStep={step} />

        {step === 1 && <Step1Dealership data={formData} onUpdate={updateForm} onNext={() => setStep(2)} />}
        {step === 2 && <Step2Platform   data={formData} onUpdate={updateForm} onNext={() => setStep(3)} onPrev={() => setStep(1)} />}
        {step === 3 && <Step3ContentType data={formData} onUpdate={updateForm} onNext={() => setStep(4)} onPrev={() => setStep(2)} />}
        {step === 4 && <Step4Upload     data={formData} onUpdate={updateForm} onNext={() => setStep(5)} onPrev={() => setStep(3)} />}
        {step === 5 && (
          <Step5Optional
            data={formData}
            onUpdate={updateForm}
            onSubmit={handleSubmit}
            onPrev={() => setStep(4)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  )
}
