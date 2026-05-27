function getConfig() {
  try {
    const raw = localStorage.getItem('asbury_emailjs_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Template routing:
//   templateOtp          → password reset / OTP only
//   templateNotification → invite, approval, revision, upload, user status, etc.
function getTemplateId(config, type) {
  if (type === 'otp_code') {
    return config.templateOtp || config.templateNotification || config.templateId
  }
  return config.templateNotification || config.templateOtp || config.templateId
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

async function sendEmail({ type, postId = null, to, templateParams, logPreview = '' }) {
  const logEntry = {
    type, post_id: postId,
    to_name: to.name, to_email: to.email,
    subject: templateParams.subject || '',
    body_preview: logPreview,
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

// Builds params for the general Notification template
function notifParams({ to, subject, headerSubtitle, statusLabel, statusColor, statusBg,
  bodyText, detailA = '', detailAVal = '', detailB = '', detailBVal = '',
  detailC = '', detailCVal = '', notes = '', ctaUrl = '', ctaLabel = '' }) {
  return {
    to_name:          to.name,
    to_email:         to.email,
    subject,
    header_subtitle:  headerSubtitle,
    status_label:     statusLabel,
    status_color:     statusColor,
    status_bg:        statusBg,
    body_text:        bodyText,
    detail_a:         detailA,
    detail_a_value:   detailAVal,
    detail_b:         detailB,
    detail_b_value:   detailBVal,
    detail_c:         detailC,
    detail_c_value:   detailCVal,
    notes,
    cta_url:          ctaUrl || origin(),
    cta_label:        ctaLabel,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function sendOtpCode({ recipient, code }) {
  return sendEmail({
    type: 'otp_code',
    to: recipient,
    logPreview: `OTP for ${recipient.email}`,
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
  const to = { name: invite.name || invite.email, email: invite.email }
  return sendEmail({
    type: 'invite', to,
    logPreview: `Invite to ${invite.email} as ${roleName}`,
    templateParams: notifParams({
      to,
      subject:        "You've been invited to join Asbury Social Hub",
      headerSubtitle: "You're Invited",
      statusLabel:    'New Invitation',
      statusColor:    '#4f46e5',
      statusBg:       '#eef2ff',
      bodyText:       `${invite.invited_by_name || invitedBy?.name || 'An administrator'} has invited you to join the Asbury Social Hub — the internal platform for social media content, approvals, and scheduling across all dealership locations.`,
      detailA: 'Your Role',  detailAVal: roleName,
      detailB: 'Invited By', detailBVal: invite.invited_by_name || invitedBy?.name || 'Administrator',
      notes:   'This invitation expires in 7 days. No account will be created unless you click the button.',
      ctaUrl:  link,
      ctaLabel:'Accept Invitation',
    }),
  })
}

export async function notifyNewUpload({ post, uploader, socialTeam, admin }) {
  const caption  = `"${post.caption?.slice(0, 150)}${post.caption?.length > 150 ? '…' : ''}"`
  const recipients = [admin, ...socialTeam.filter(u => u.id !== uploader.id)]
  await Promise.all(recipients.map(r =>
    sendEmail({
      type: 'new_upload', to: r, postId: post.id,
      logPreview: `New upload by ${uploader.name}`,
      templateParams: notifParams({
        to: r,
        subject:        `New content submitted: ${post.platform} · ${post.dealership_id}`,
        headerSubtitle: 'Action Required — Content Review',
        statusLabel:    'New Submission',
        statusColor:    '#b45309',
        statusBg:       '#fffbeb',
        bodyText:       `${uploader.name} submitted new content that needs your review and approval before it enters the publishing queue.`,
        detailA: 'Platform',      detailAVal: post.platform,
        detailB: 'Dealership',    detailBVal: post.dealership_id,
        detailC: 'Scheduled For', detailCVal: post.scheduled_for,
        notes:   `Caption: ${caption}`,
        ctaUrl:  `${origin()}/`,
        ctaLabel:'Review Content',
      }),
    })
  ))
}

export async function notifyApproval({ post, uploader, admin, notes }) {
  return sendEmail({
    type: 'approved', to: uploader, postId: post.id,
    logPreview: `Approved: ${post.platform} · ${post.dealership_id}`,
    templateParams: notifParams({
      to: uploader,
      subject:        `✅ Approved: your ${post.platform} post for ${post.dealership_id}`,
      headerSubtitle: 'Content Update',
      statusLabel:    '✅ Approved',
      statusColor:    '#16a34a',
      statusBg:       '#f0fdf4',
      bodyText:       'Great news! Your content submission has been approved and is ready for the publishing queue.',
      detailA: 'Platform',   detailAVal: post.platform,
      detailB: 'Dealership', detailBVal: post.dealership_id,
      detailC: 'Scheduled',  detailCVal: post.scheduled_for,
      notes:   notes || '',
      ctaUrl:  `${origin()}/`,
      ctaLabel:'View in Hub',
    }),
  })
}

export async function notifyRevision({ post, uploader, admin, notes }) {
  return sendEmail({
    type: 'revision_requested', to: uploader, postId: post.id,
    logPreview: `Revision: ${post.platform} · ${post.dealership_id}`,
    templateParams: notifParams({
      to: uploader,
      subject:        `✏️ Revision requested: your ${post.platform} post for ${post.dealership_id}`,
      headerSubtitle: 'Content Update',
      statusLabel:    '✏️ Revision Requested',
      statusColor:    '#b45309',
      statusBg:       '#fffbeb',
      bodyText:       'Your content submission needs revisions before it can be approved. Please review the feedback below and resubmit.',
      detailA: 'Platform',   detailAVal: post.platform,
      detailB: 'Dealership', detailBVal: post.dealership_id,
      detailC: 'Scheduled',  detailCVal: post.scheduled_for,
      notes:   `Feedback from ${admin?.name || 'manager'}: ${notes}`,
      ctaUrl:  `${origin()}/`,
      ctaLabel:'Update Content',
    }),
  })
}

export async function notifyDeletion({ post, uploader, admin, notes }) {
  return sendEmail({
    type: 'deleted', to: uploader, postId: post.id,
    logPreview: `Removed: ${post.platform} · ${post.dealership_id}`,
    templateParams: notifParams({
      to: uploader,
      subject:        `Content removed: your ${post.platform} post for ${post.dealership_id}`,
      headerSubtitle: 'Content Update',
      statusLabel:    'Removed',
      statusColor:    '#dc2626',
      statusBg:       '#fef2f2',
      bodyText:       'Your content submission has been removed from the staging queue.',
      detailA: 'Platform',   detailAVal: post.platform,
      detailB: 'Dealership', detailBVal: post.dealership_id,
      detailC: 'Scheduled',  detailCVal: post.scheduled_for,
      notes:   notes ? `Reason: ${notes}` : 'Contact your manager if you have questions.',
      ctaUrl:  `${origin()}/`,
      ctaLabel:'Go to Hub',
    }),
  })
}

export async function notifyDueToday({ posts, socialTeam, admin }) {
  if (!posts.length) return
  const summary = posts.map(p => `${p.platform} · ${p.dealership_id}`).join(', ')
  await Promise.all([admin, ...socialTeam].map(r =>
    sendEmail({
      type: 'due_today', to: r,
      logPreview: `${posts.length} posts due today`,
      templateParams: notifParams({
        to: r,
        subject:        `${posts.length} post${posts.length !== 1 ? 's' : ''} scheduled to publish today`,
        headerSubtitle: 'Publishing Reminder',
        statusLabel:    'Due Today',
        statusColor:    '#0284c7',
        statusBg:       '#f0f9ff',
        bodyText:       `${posts.length} approved post${posts.length !== 1 ? 's are' : ' is'} scheduled to publish today. Please coordinate with your social media team to publish on time.`,
        detailA: 'Posts',     detailAVal: `${posts.length}`,
        detailB: 'Platforms', detailBVal: summary,
        notes:   '',
        ctaUrl:  `${origin()}/calendar`,
        ctaLabel:'View Calendar',
      }),
    })
  ))
}

export async function notifyNewUserRequest({ user, admins }) {
  await Promise.all((admins || []).map(admin =>
    sendEmail({
      type: 'new_user_request', to: admin,
      logPreview: `Access request: ${user.name}`,
      templateParams: notifParams({
        to: admin,
        subject:        `New access request: ${user.name}`,
        headerSubtitle: 'Account Request',
        statusLabel:    'Pending Approval',
        statusColor:    '#7c3aed',
        statusBg:       '#f5f3ff',
        bodyText:       `${user.name} has requested access to Asbury Social Hub. Visit Users & Security to approve or reject this request.`,
        detailA: 'Name',      detailAVal: user.name,
        detailB: 'Email',     detailBVal: user.email,
        detailC: 'Title',     detailCVal: user.title || 'Not provided',
        notes:   `Submitted: ${new Date().toLocaleString()}`,
        ctaUrl:  `${origin()}/users`,
        ctaLabel:'Review Request',
      }),
    })
  ))
}

export async function notifyUserApproved({ user }) {
  const to = { name: user.name, email: user.email }
  return sendEmail({
    type: 'user_approved', to,
    logPreview: `Account approved: ${user.email}`,
    templateParams: notifParams({
      to,
      subject:        '🎉 Your Asbury Social Hub account is approved',
      headerSubtitle: 'Account Update',
      statusLabel:    '🎉 Account Approved',
      statusColor:    '#16a34a',
      statusBg:       '#f0fdf4',
      bodyText:       'Great news! Your access request has been approved. You can now sign in using your email address and the password you created during registration.',
      notes:   '',
      ctaUrl:  `${origin()}/login`,
      ctaLabel:'Sign In to Asbury Social Hub',
    }),
  })
}

export async function notifyUserRejected({ user }) {
  const to = { name: user.name, email: user.email }
  return sendEmail({
    type: 'user_rejected', to,
    logPreview: `Access rejected: ${user.email}`,
    templateParams: notifParams({
      to,
      subject:        'Update on your Asbury Social Hub access request',
      headerSubtitle: 'Account Update',
      statusLabel:    'Not Approved',
      statusColor:    '#64748b',
      statusBg:       '#f8fafc',
      bodyText:       'After review, your access request to Asbury Social Hub was not approved at this time.',
      notes:   'If you believe this is an error or have questions, please contact your manager directly.',
      ctaUrl:  '',
      ctaLabel:'',
    }),
  })
}

export function isEmailServiceConfigured() {
  const config = getConfig()
  if (!config?.serviceId || !config?.publicKey) return false
  return !!(config.templateOtp || config.templateNotification || config.templateId)
}

export function getNotificationLog() {
  try { return JSON.parse(localStorage.getItem('asbury_notification_log') || '[]') }
  catch { return [] }
}

export function clearNotificationLog() {
  localStorage.removeItem('asbury_notification_log')
}
