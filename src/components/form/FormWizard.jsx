import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePosts } from '../../context/PostsContext'
import { useAssets } from '../../context/AssetsContext'
import { useToast } from '../../context/ToastContext'
import { useUsers } from '../../context/UsersContext'
import { notifyNewUpload } from '../../services/emailService'
import StepIndicator from './StepIndicator'
import Step1Dealership from './Step1Dealership'
import Step2Platform from './Step2Platform'
import Step3ContentType from './Step3ContentType'
import Step4Upload from './Step4Upload'
import Step5Optional from './Step5Optional'

// The wizard collects multi-select arrays in `dealership_ids` and `platforms`,
// then fans out into one DB row per (dealership × platform) pair at submit time.
// Each persisted post still carries singular `dealership_id` and `platform` —
// that's the schema the rest of the app reads.
const INITIAL_FORM = {
  dealership_ids: [],
  platforms: [],
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
  content_pillar: '',
}

const DEMO_FORM = {
  dealership_ids: ['nalley-honda'],
  platforms: ['instagram'],
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

// When editing an existing post, hydrate the multi arrays from its singular fields
// so the UI shows the original selection in the new multi-select widgets.
function hydrateForEdit(post) {
  return {
    ...INITIAL_FORM,
    ...post,
    dealership_ids: post.dealership_id ? [post.dealership_id] : [],
    platforms:      post.platform      ? [post.platform]      : [],
  }
}

export default function FormWizard() {
  const [searchParams] = useSearchParams()
  const demoStep = parseInt(searchParams.get('demo') || '0')
  const editPostId = searchParams.get('edit')
  const assetId = searchParams.get('asset')

  const { currentUser } = useAuth()
  const { addPost, updatePost, getPostById } = usePosts()
  const { getAssetById, loaded: assetsLoaded } = useAssets()
  const { addToast } = useToast()
  const { getAdmins, getSocialTeam } = useUsers()
  const navigate = useNavigate()

  // If editing a flagged post, pre-fill with its data
  const editingPost = editPostId ? getPostById(editPostId) : null
  const initialData = editingPost
    ? hydrateForEdit(editingPost)
    : demoStep >= 2 ? DEMO_FORM : INITIAL_FORM

  const [step, setStep] = useState(demoStep >= 1 && demoStep <= 5 ? demoStep : 1)
  const [formData, setFormData] = useState(initialData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hydrate file fields from ?asset=<id> once the Assets context has loaded.
  // Falls back to a toast if the asset is missing (e.g., soft-deleted).
  useEffect(() => {
    if (!assetId || editPostId || !assetsLoaded) return
    const asset = getAssetById(assetId)
    if (!asset) {
      addToast('Asset not found — it may have been removed.', 'error')
      return
    }
    setFormData((prev) => ({
      ...prev,
      file_name:    asset.file_name,
      file_size:    asset.file_size,
      file_type:    asset.file_type,
      file_url:     asset.file_url,
      file_preview: asset.file_url,
    }))
  }, [assetId, editPostId, assetsLoaded, getAssetById, addToast])

  const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }))

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Strip the multi-select arrays before persisting; each row carries singular fields.
    const { dealership_ids, platforms, ...sharedFields } = formData
    const dealershipList = dealership_ids?.length ? dealership_ids : []
    const platformList   = platforms?.length      ? platforms      : []

    if (editingPost) {
      // Edit mode updates the existing single row in place. The user can change
      // which (dealership, platform) it points to, but it stays one row — we
      // don't fan out edits because that would orphan the original.
      const targetDealership = dealershipList[0] || editingPost.dealership_id
      const targetPlatform   = platformList[0]   || editingPost.platform
      updatePost(editingPost.id, {
        ...sharedFields,
        dealership_id:    targetDealership,
        platform:         targetPlatform,
        uploaded_by:      currentUser.email,
        uploaded_by_name: currentUser.name,
      })
      const extraCount = (dealershipList.length * platformList.length) - 1
      addToast(
        extraCount > 0
          ? `Post updated and resubmitted. (Note: edits are applied to this single post — additional dealership/platform selections were ignored.)`
          : 'Post updated and resubmitted for approval.',
        'success'
      )
    } else {
      // Fan out: one row per (dealership × platform) pair.
      const admins     = getAdmins()
      const socialTeam = getSocialTeam()
      const admin      = admins[0] || { name: 'Chad Mitchell', email: 'chad.mitchell@asburyauto.com' }

      const created = []
      for (const dId of dealershipList) {
        for (const pId of platformList) {
          // Stagger ids so Date.now() collisions don't produce duplicate keys
          // when the loop runs faster than 1ms per iteration.
          if (created.length > 0) await new Promise((r) => setTimeout(r, 1))
          const post = await addPost({
            ...sharedFields,
            dealership_id:    dId,
            platform:         pId,
            uploaded_by:      currentUser.email,
            uploaded_by_name: currentUser.name,
          })
          created.push(post)
          notifyNewUpload({ post, uploader: currentUser, socialTeam, admin }).catch(() => {})
        }
      }

      const total = created.length
      addToast(
        total > 1
          ? `${total} posts submitted — your team has been notified.`
          : 'Content submitted — your team has been notified.',
        'success'
      )
    }

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
            adminName={(getAdmins()[0] || {}).name || 'your manager'}
          />
        )}
      </div>
    </div>
  )
}
