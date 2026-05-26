function getConfig() {
  try {
    const raw = localStorage.getItem('asbury_emailjs_config')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function logNotification(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem('asbury_notification_log') || '[]')
    logs.unshift({ ...entry, id: `notif-${Date.now()}`, timestamp: new Date().toISOString() })
    localStorage.setItem('asbury_notification_log', JSON.stringify(logs.slice(0, 200)))
  } catch {}
}

async function sendViaEmailJS(config, templateParams) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: templateParams,
      }),
    })
    if (!res.ok) throw new Error(`EmailJS ${res.status}`)
  } finally {
    clearTimeout(timer)
  }
}

// bodyLines joined with <br><br>; otpCode shows the code box; ctaLabel/ctaUrl shows the button
async function sendTo({ recipient, subject, bodyLines, sender, type, postId, otpCode = '', ctaUrl = '', ctaLabel = '' }) {
  const logEntry = {
    type,
    post_id: postId,
    to_name: recipient.name,
    to_email: recipient.email,
    subject,
    body_preview: bodyLines[0] || '',
    sent_via_email: false,
  }

  const config = getConfig()
  const configured = !!(config?.serviceId && config?.templateId && config?.publicKey)
  let error = null

  if (configured) {
    try {
      await sendViaEmailJS(config, {
        to_name:     recipient.name,
        to_email:    recipient.email,
        from_name:   sender?.name  || 'Asbury Social Hub',
        from_email:  sender?.email || 'noreply@asburyauto.com',
        subject,
        message:     bodyLines.join('<br><br>'),
        otp_code:    otpCode,
        otp_display: otpCode   ? 'block' : 'none',
        cta_url:     ctaUrl    || '#',
        cta_label:   ctaLabel  || '',
        cta_display: ctaLabel  ? 'block' : 'none',
      })
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

export async function notifyNewUpload({ post, uploader, socialTeam, admin }) {
  const subject = `New content submitted: ${post.platform} post for ${post.dealership_id}`
  const body = [
    `<strong>${uploader.name}</strong> submitted new content for review.`,
    `<strong>Platform:</strong> ${post.platform}&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Scheduled:</strong> ${post.scheduled_for}`,
    `<strong>Caption:</strong> "${post.caption?.slice(0, 120)}${post.caption?.length > 120 ? '…' : ''}"`,
    `Click below to review and approve it in Asbury Social Hub.`,
  ]
  const recipients = [admin, ...socialTeam.filter(u => u.id !== uploader.id)]
  await Promise.all(
    recipients.map(r =>
      sendTo({ recipient: r, subject, bodyLines: body, sender: uploader, type: 'new_upload', postId: post.id,
        ctaUrl: `${origin()}/`, ctaLabel: 'Review Content' })
    )
  )
}

export async function notifyApproval({ post, uploader, admin, notes }) {
  const subject = `✅ Approved: your ${post.platform} post for ${post.dealership_id}`
  const body = [
    `Great news! Your content has been <strong>approved</strong> and is ready for the publishing queue.`,
    `<strong>Dealership:</strong> ${post.dealership_id}&nbsp;&nbsp;·&nbsp;&nbsp;<strong>Scheduled:</strong> ${post.scheduled_for}`,
    ...(notes ? [`<strong>Manager notes:</strong> ${notes}`] : []),
  ]
  await sendTo({ recipient: uploader, subject, bodyLines: body, sender: admin, type: 'approved', postId: post.id,
    ctaUrl: `${origin()}/`, ctaLabel: 'View in Hub' })
}

export async function notifyRevision({ post, uploader, admin, notes }) {
  const subject = `✏️ Revision requested: your ${post.platform} post for ${post.dealership_id}`
  const body = [
    `Your content submission needs revisions before it can be approved.`,
    `<strong>Feedback from ${admin?.name || 'manager'}:</strong><br>${notes}`,
    `Log in to update and resubmit your content.`,
  ]
  await sendTo({ recipient: uploader, subject, bodyLines: body, sender: admin, type: 'revision_requested', postId: post.id,
    ctaUrl: `${origin()}/`, ctaLabel: 'Update Content' })
}

export async function notifyDeletion({ post, uploader, admin, notes }) {
  const subject = `Content removed: your ${post.platform} post for ${post.dealership_id}`
  const body = [
    `Your content submission has been removed from the staging queue.`,
    ...(notes ? [`<strong>Reason:</strong> ${notes}`] : []),
    `Contact your manager if you have questions.`,
  ]
  await sendTo({ recipient: uploader, subject, bodyLines: body, sender: admin, type: 'deleted', postId: post.id })
}

export async function notifyDueToday({ posts, socialTeam, admin }) {
  if (!posts.length) return
  const subject = `${posts.length} post${posts.length !== 1 ? 's' : ''} scheduled to publish today`
  const postList = posts
    .map(p => `&bull;&nbsp;<strong>${p.platform}</strong> · ${p.dealership_id}: "${p.caption?.slice(0, 60)}…"`)
    .join('<br>')
  const body = [
    `The following approved posts are scheduled for <strong>today's</strong> publication:`,
    postList,
    `Please coordinate with your social media team to publish on time.`,
  ]
  await Promise.all(
    [admin, ...socialTeam].map(r =>
      sendTo({ recipient: r, subject, bodyLines: body, sender: admin, type: 'due_today', postId: null,
        ctaUrl: `${origin()}/calendar`, ctaLabel: 'View Calendar' })
    )
  )
}

export function getNotificationLog() {
  try { return JSON.parse(localStorage.getItem('asbury_notification_log') || '[]') }
  catch { return [] }
}

export function clearNotificationLog() {
  localStorage.removeItem('asbury_notification_log')
}

// ── Auth & user notifications ──────────────────────────────────────────────

export async function sendOtpCode({ recipient, code }) {
  return sendTo({
    recipient,
    subject: 'Your Asbury Social Hub verification code',
    bodyLines: [
      `We received a password reset request for your account.`,
      `Use the verification code below to confirm your identity.`,
      `If you didn't request this, you can safely ignore this email — your account is secure.`,
    ],
    sender: { name: 'Asbury Social Hub', email: 'noreply@asburyauto.com' },
    type: 'otp_code',
    postId: null,
    otpCode: code,
  })
}

export function isEmailServiceConfigured() {
  const config = getConfig()
  return !!(config?.serviceId && config?.templateId && config?.publicKey)
}

export async function notifyNewUserRequest({ user, admins }) {
  const subject = `New access request: ${user.name}`
  const bodyLines = [
    `<strong>${user.name}</strong> has requested access to Asbury Social Hub.`,
    `<strong>Email:</strong> ${user.email}${user.title ? `<br><strong>Title:</strong> ${user.title}` : ''}`,
    `<strong>Submitted:</strong> ${new Date().toLocaleString()}`,
    `Visit Users &amp; Security to approve or reject this request.`,
  ]
  await Promise.all(
    (admins || []).map(admin =>
      sendTo({ recipient: admin, subject, bodyLines, type: 'new_user_request', postId: null,
        ctaUrl: `${origin()}/users`, ctaLabel: 'Review Request' })
    )
  )
}

export async function sendInvite({ invite, invitedBy }) {
  const link = `${origin()}/signup?invite=${invite.token}`
  const roleName = invite.role === 'admin' ? 'Administrator'
    : invite.role === 'viewer' ? 'View Only'
    : 'Social Media Manager'
  await sendTo({
    recipient: { name: invite.name || invite.email, email: invite.email },
    subject: "You've been invited to Asbury Social Hub",
    bodyLines: [
      `<strong>${invite.invited_by_name || 'An administrator'}</strong> has invited you to join the Asbury Social Hub platform.`,
      `<strong>Your role:</strong> ${roleName}`,
      `Click the button below to create your account. This invitation expires in <strong>7 days</strong>.`,
      ...(invitedBy?.name ? [`Questions? Reply to this email or contact ${invitedBy.name} directly.`] : []),
    ],
    sender: invitedBy || { name: 'Asbury Social Hub', email: 'noreply@asburyauto.com' },
    type: 'invite',
    postId: null,
    ctaUrl: link,
    ctaLabel: 'Accept Invitation',
  })
}

export async function notifyUserApproved({ user }) {
  await sendTo({
    recipient: { name: user.name, email: user.email },
    subject: '🎉 Your Asbury Social Hub account is approved',
    bodyLines: [
      `Great news! Your access request has been <strong>approved</strong>.`,
      `You can now sign in using your email address and the password you created during registration.`,
    ],
    type: 'user_approved',
    postId: null,
    ctaUrl: `${origin()}/login`,
    ctaLabel: 'Sign In to Asbury Social Hub',
  })
}

export async function notifyUserRejected({ user }) {
  await sendTo({
    recipient: { name: user.name, email: user.email },
    subject: 'Update on your Asbury Social Hub access request',
    bodyLines: [
      `After review, your access request to Asbury Social Hub was not approved at this time.`,
      `If you believe this is an error or have questions, please contact your manager directly.`,
    ],
    type: 'user_rejected',
    postId: null,
  })
}
