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
  const timer = setTimeout(() => controller.abort(), 8000)   // 8-second cap
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

async function sendTo({ recipient, subject, bodyLines, sender, type, postId }) {
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
        to_name: recipient.name,
        to_email: recipient.email,
        from_name: sender?.name || 'Asbury Social Hub',
        from_email: sender?.email || 'noreply@asburyauto.com',
        subject,
        message: bodyLines.join('\n\n'),
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

// ── Public API ─────────────────────────────────────────────────────────────

export async function notifyNewUpload({ post, uploader, socialTeam, admin }) {
  const subject = `New content submitted: ${post.platform} post for ${post.dealership_id}`
  const body = [
    `${uploader.name} submitted new content for review.`,
    `Platform: ${post.platform}  |  Scheduled: ${post.scheduled_for}`,
    `Caption: "${post.caption?.slice(0, 120)}${post.caption?.length > 120 ? '…' : ''}"`,
    `Log in to Asbury Social Hub to review and approve.`,
  ]

  const recipients = [admin, ...socialTeam.filter(u => u.id !== uploader.id)]
  await Promise.all(
    recipients.map(r =>
      sendTo({ recipient: r, subject, bodyLines: body, sender: uploader, type: 'new_upload', postId: post.id })
    )
  )
}

export async function notifyApproval({ post, uploader, admin, notes }) {
  const subject = `Approved: your ${post.platform} post for ${post.dealership_id}`
  const body = [
    `Your content submission has been approved and is ready for the publishing queue.`,
    `Dealership: ${post.dealership_id}  |  Scheduled: ${post.scheduled_for}`,
    notes ? `Manager notes: ${notes}` : '',
    `Log in to Asbury Social Hub to view full details.`,
  ].filter(Boolean)

  await sendTo({ recipient: uploader, subject, bodyLines: body, sender: admin, type: 'approved', postId: post.id })
}

export async function notifyRevision({ post, uploader, admin, notes }) {
  const subject = `Revision requested: your ${post.platform} post for ${post.dealership_id}`
  const body = [
    `Your content submission requires revisions before it can be approved.`,
    `Feedback from ${admin?.name || 'manager'}:`,
    notes,
    `Log in to Asbury Social Hub to update and resubmit.`,
  ]

  await sendTo({ recipient: uploader, subject, bodyLines: body, sender: admin, type: 'revision_requested', postId: post.id })
}

export async function notifyDeletion({ post, uploader, admin, notes }) {
  const subject = `Content removed: your ${post.platform} post for ${post.dealership_id}`
  const body = [
    `Your content submission has been removed from the staging queue.`,
    notes ? `Reason: ${notes}` : '',
    `Log in to Asbury Social Hub if you have questions.`,
  ].filter(Boolean)

  await sendTo({ recipient: uploader, subject, bodyLines: body, sender: admin, type: 'deleted', postId: post.id })
}

export async function notifyDueToday({ posts, socialTeam, admin }) {
  if (!posts.length) return
  const subject = `${posts.length} post${posts.length !== 1 ? 's' : ''} scheduled to publish today`
  const body = [
    `The following approved posts are scheduled for today's publication:`,
    posts.map(p => `• ${p.platform} for ${p.dealership_id}: "${p.caption?.slice(0, 60)}…"`).join('\n'),
    `Please coordinate with your social media team to publish on time.`,
  ]

  await Promise.all(
    [admin, ...socialTeam].map(r =>
      sendTo({ recipient: r, subject, bodyLines: body, sender: admin, type: 'due_today', postId: null })
    )
  )
}

export function getNotificationLog() {
  try {
    return JSON.parse(localStorage.getItem('asbury_notification_log') || '[]')
  } catch { return [] }
}

export function clearNotificationLog() {
  localStorage.removeItem('asbury_notification_log')
}

// ── Auth & User notifications ──────────────────────────────────────────────

export async function sendOtpCode({ recipient, code }) {
  return sendTo({
    recipient,
    subject: 'Your Asbury Social Hub verification code',
    bodyLines: [
      `Hi ${recipient.name || 'there'},`,
      `Your verification code is: ${code}`,
      `This code is valid for 10 minutes. Do not share it with anyone.`,
    ],
    sender: { name: 'Asbury Social Hub', email: 'noreply@asburyauto.com' },
    type: 'otp_code',
    postId: null,
  })
}

export function isEmailServiceConfigured() {
  const config = getConfig()
  return !!(config?.serviceId && config?.templateId && config?.publicKey)
}

export async function notifyNewUserRequest({ user, admins }) {
  const subject = `New access request: ${user.name}`
  const bodyLines = [
    `${user.name} has requested access to Asbury Social Hub.`,
    `Email: ${user.email}${user.title ? `\nTitle: ${user.title}` : ''}`,
    `Submitted: ${new Date().toLocaleString()}`,
    `Log in to Asbury Social Hub and visit Users & Security → Pending Requests to approve or reject.`,
  ]
  await Promise.all(
    (admins || []).map(admin =>
      sendTo({ recipient: admin, subject, bodyLines, type: 'new_user_request', postId: null })
    )
  )
}

export async function sendInvite({ invite, invitedBy }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${origin}/signup?invite=${invite.token}`
  const roleName = invite.role === 'admin' ? 'Administrator'
    : invite.role === 'viewer' ? 'View Only'
    : 'Social Media'
  await sendTo({
    recipient: { name: invite.name || invite.email, email: invite.email },
    subject: "You've been invited to Asbury Social Hub",
    bodyLines: [
      `${invite.invited_by_name || 'An administrator'} has invited you to join Asbury Social Hub.`,
      `Role: ${roleName}`,
      `Use the link below to create your account (expires in 7 days):`,
      link,
      `Questions? Contact ${invitedBy?.name || invite.invited_by_name || 'your administrator'}.`,
    ],
    sender: invitedBy || { name: 'Asbury Social Hub', email: 'noreply@asburyauto.com' },
    type: 'invite',
    postId: null,
  })
}

export async function notifyUserApproved({ user }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  await sendTo({
    recipient: { name: user.name, email: user.email },
    subject: 'Your Asbury Social Hub account is approved',
    bodyLines: [
      `Great news, ${user.name}! Your access request has been approved.`,
      `You can now sign in using your email and password:`,
      `${origin}/login`,
    ],
    type: 'user_approved',
    postId: null,
  })
}

export async function notifyUserRejected({ user }) {
  await sendTo({
    recipient: { name: user.name, email: user.email },
    subject: 'Update on your Asbury Social Hub access request',
    bodyLines: [
      `Hi ${user.name},`,
      `After review, your access request to Asbury Social Hub was not approved at this time.`,
      `If you believe this is an error or have questions, please contact your manager.`,
    ],
    type: 'user_rejected',
    postId: null,
  })
}
