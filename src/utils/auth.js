const SALT = 'asbury-social-hub-2026'

export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + SALT)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(plain, hashed) {
  return (await hashPassword(plain)) === hashed
}
