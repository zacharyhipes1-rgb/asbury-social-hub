function getConfig() {
  try {
    const raw = localStorage.getItem('asbury_emailjs_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Route each notification type to its own EmailJS template ID.
// Falls back through other configured templates so emails still deliver
// even if only one template is set up.
function getTemplateId(config, type) {
  const specific = {
    otp_code:          config.templateOtp,
    invite:            config.templateInvite,
    approved:          config.templateApproval,
    revision_requested:config.templateApproval,
    deleted:           config.templateApproval,
    user_approved:     config.templateApproval,
    user_rejected:     config.templateApproval,
    new_upload:        config.templateUpload,
    new_user_request:  config.templateUpload,
    due_today:         config.templateUpload,
  }
  return (
    specific[type] ||
    config.templateOtp ||
    config.templateInvite ||
    config.templateApproval ||
    config.templateUpload ||
    config.templateId   // legacy single-template fallback
  )
}

function logNotification(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem('asbury_notification_log') || '[]')
    logs.unshift({ ...entry, id: `notif-${Date.now()}`, timestamp: new Date().toISOString() })
    localStorage.setItem('asbury_notification_log', JSON.stringify(logs.slice(0, 200)))
  } catch {}
}

async function sendViaEmailJS(config, templateId, templateParams) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        service_id:  config.serviceId,
        template_id: templateId,
        user_id:     config.publicKey,
        template_params: templateParams,
      }),
    })
    if (!res.ok) throw new Error(`EmailJS ${res.status}`)
  } finally {
    clearTimeout(timer)
  }
}

// Generic delivery — each email function builds its own templateParams
// to match the variables in that template.
async function sendEmail({ type, postId = null, to, templateParams, logPreview = '' }) {
  const logEntry = {
    type,
    post_id: postId,
    to_name:  to.name,
    to_email: to.email,
    subject:  templateParams.subject || '',
    body_preview: logPreview || templateParams.message?.slice(0, 80) || '',
    sent_via_email: false,
  }

  const config = getConfig()
  const configured = isEmailServiceConfigured()
  let error = null

  if (configured) {
    const templateId = getTemplateId(config, type)
    try {
      await sendViaEmailJS(config, templateId, templateParams)
      logEntry.sent_via_email = true
    } catch (err) {
      logEntry.error = err.message
      error = err.message
    }
  } else {
    logEntry.error = 'EmailJS not configured'
    error = 'not_configured'
  }

  logNotification(logEntry)
  return { sent: logEntry.sent_via_email, configured, error }
}

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '')

// ── Public API ─────────────────────────────────────────────────────────────

export async function sendOtpCode({ recipient, code }) {
  return sendEmail({
    type: 'otp_code',
    to: recipient,
    logPreview: `OTP code for ${recipient.email}`,
    templateParams: {
      to_name:  recipient.name,
      to_email: recipient.email,
      subject:  'Your Asbury Social Hub verification code',
      otp_code: code,
    },
  })
}

export async function sendInvite({ invite, invitedBy }) {
  const link     = `${origin()}/signup?invite=${invite.token}`
  const roleName = invite.role === 'admin'  ? 'Administrator'
    : invite.role === 'viewer' ? 'View Only'
    : 'Social Media Manager'

  return sendEmail({
    type: 'invite',
    to:   { name: invite.name || invite.email, email: invite.email },
    logPreview: `Invite to ${invite.email} as ${roleName}`,
    templateParams: {
      to_name:     invite.name || invite.email,
      to_email:    invite.email,
      subject:     "You've been invited to Asbury Social Hub",
      invited_by:  invite.invited_by_name || invitedBy?.name || 'An administrator',
      role_name:   roleName,
      invite_url:  link,
      expires_note: 'This invitation expires in 7 days.',
    },
  })
}

export async function notifyNewUpload({ post, uploader, socialTeam, admin }) {
  const caption = post.caption?.slice(0, 120) + (post.caption?.length > 120 ? '…' : '')
  const recipients = [admin, ...socialTeam.filter(u => u.id !== uploader.id)]
  await Promise.all(
    recipients.map(r =>
      sendEmail({
        type: 'new_upload',
        to: r,
        postId: post.id,
        logPreview: `New upload by ${uploader.name} for ${post.dealership_id}`,
        templateParams: {
          to_name:        r.name,
          to_email:       r.email,
          subject:        `New content submitted: ${post.platform} · ${post.dealership_id}`,
          uploader_name:  uploader.name,
          platform:       post.platform,
          dealership:     post.dealership_id,
          caption_preview:caption,
          scheduled_for:  post.scheduled_for,
          review_url:     `${origin()}/`,
        },
      })
    )
  )
}

export async function notifyApproval({ post, uploader, admin, notes }) {
  return sendEmail({
    type: 'approved',
    to: uploader,
    postId: post.id,
    logPreview: `Post approved: ${post.platform} · ${post.dealership_id}`,
    templateParams: {
      to_name:      uploader.name,
      to_email:     uploader.email,
      subject:      `✅ Approved: your ${post.platform} post for ${post.dealership_id}`,
      status_icon:  '✅',
      status_label: 'Approved',
      status_color: '#16a34a',
      status_bg:    '#f0fdf4',
      platform:     post.platform,
      dealership:   post.dealership_id,
      scheduled_for:post.scheduled_for,
      notes:        notes || '',
      cta_url:      `${origin()}/`,
      cta_label:    'View in Hub',
    },
  })
}

export async function notifyRevision({ post, uploader, admin, notes }) {
  return sendEmail({
    type: 'revision_requested',
    to: uploader,
    postId: post.id,
    logPreview: `Revision requested: ${post.platform} · ${post.dealership_id}`,
    templateParams: {
      to_name:      uploader.name,
      to_email:     uploader.email,
      subject:      `✏️ Revision requested: your ${post.platform} post for ${post.dealership_id}`,
      status_icon:  '✏️',
      status_label: 'Revision Requested',
      status_color: '#b45309',
      status_bg:    '#fffbeb',
      platform:     post.platform,
      dealership:   post.dealership_id,
      scheduled_for:post.scheduled_for,
      notes:        notes || '',
      cta_url:      `${origin()}/`,
      cta_label:    'Update Content',
    },
  })
}

export async function notifyDeletion({ post, uploader, admin, notes }) {
  return sendEmail({
    type: 'deleted',
    to: uploader,
    postId: post.id,
    logPreview: `Post removed: ${post.platform} · ${post.dealership_id}`,
    templateParams: {
      to_name:      uploader.name,
      to_email:     uploader.email,
      subject:      `Content removed: your ${post.platform} post for ${post.dealership_id}`,
      status_icon:  '🗑️',
      status_label: 'Removed',
      status_color: '#dc2626',
      status_bg:    '#fef2f2',
      platform:     post.platform,
      dealership:   post.dealership_id,
      scheduled_for:post.scheduled_for,
      notes:        notes || 'No reason provided.',
      cta_url:      `${origin()}/`,
      cta_label:    'Go to Hub',
    },
  })
}

export async function notifyDueToday({ posts, socialTeam, admin }) {
  if (!posts.length) return
  await Promise.all(
    [admin, ...socialTeam].map(r =>
      sendEmail({
        type: 'due_today',
        to: r,
        logPreview: `${posts.length} posts due today`,
        templateParams: {
          to_name:       r.name,
          to_email:      r.email,
          subject:       `${posts.length} post${posts.length !== 1 ? 's' : ''} scheduled to publish today`,
          uploader_name: 'Asbury Social Hub',
          platform:      posts.map(p => p.platform).join(', '),
          dealership:    posts.map(p => p.dealership_id).join(', '),
          caption_preview: posts.map(p => `${p.platform} · ${p.dealership_id}: "${p.caption?.slice(0, 60)}…"`).join(' | '),
          scheduled_for: 'Today',
          review_url:    `${origin()}/calendar`,
        },
      })
    )
  )
}

export async function notifyNewUserRequest({ user, admins }) {
  await Promise.all(
    (admins || []).map(admin =>
      sendEmail({
        type: 'new_user_request',
        to: admin,
        logPreview: `New access request: ${user.name}`,
        templateParams: {
          to_name:        admin.name,
          to_email:       admin.email,
          subject:        `New access request: ${user.name}`,
          uploader_name:  user.name,
          platform:       user.email,
          dealership:     user.title || 'No title provided',
          caption_preview:`${user.name} (${user.email}) has requested access to Asbury Social Hub.`,
          scheduled_for:  new Date().toLocaleString(),
          review_url:     `${origin()}/users`,
        },
      })
    )
  )
}

export async function notifyUserApproved({ user }) {
  return sendEmail({
    type: 'user_approved',
    to: { name: user.name, email: user.email },
    logPreview: `Account approved: ${user.email}`,
    templateParams: {
      to_name:      user.name,
      to_email:     user.email,
      subject:      '🎉 Your Asbury Social Hub account is approved',
      status_icon:  '🎉',
      status_label: 'Account Approved',
      status_color: '#16a34a',
      status_bg:    '#f0fdf4',
      platform:     '',
      dealership:   '',
      scheduled_for:'',
      notes:        'You can now sign in with your email and the password you created.',
      cta_url:      `${origin()}/login`,
      cta_label:    'Sign In to Asbury Social Hub',
    },
  })
}

export async function notifyUserRejected({ user }) {
  return sendEmail({
    type: 'user_rejected',
    to: { name: user.name, email: user.email },
    logPreview: `Access rejected: ${user.email}`,
    templateParams: {
      to_name:      user.name,
      to_email:     user.email,
      subject:      'Update on your Asbury Social Hub access request',
      status_icon:  '—',
      status_label: 'Not Approved',
      status_color: '#64748b',
      status_bg:    '#f8fafc',
      platform:     '',
      dealership:   '',
      scheduled_for:'',
      notes:        'If you believe this is an error, please contact your manager directly.',
      cta_url:      '',
      cta_label:    '',
    },
  })
}

export function isEmailServiceConfigured() {
  const config = getConfig()
  if (!config?.serviceId || !config?.publicKey) return false
  return !!(
    config.templateOtp ||
    config.templateInvite ||
    config.templateApproval ||
    config.templateUpload ||
    config.templateId
  )
}

export function getNotificationLog() {
  try { return JSON.parse(localStorage.getItem('asbury_notification_log') || '[]') }
  catch { return [] }
}

export function clearNotificationLog() {
  localStorage.removeItem('asbury_notification_log')
}
