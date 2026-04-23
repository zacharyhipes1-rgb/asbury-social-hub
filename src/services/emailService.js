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
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      template_params: templateParams,
    }),
  })
  if (!res.ok) throw new Error(`EmailJS ${res.status}`)
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
  if (config?.serviceId && config?.templateId && config?.publicKey) {
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
    }
  }

  logNotification(logEntry)
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
