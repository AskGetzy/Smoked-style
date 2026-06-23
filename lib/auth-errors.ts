export function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function mapAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Wrong email or password. Please try again.'
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'This email is already registered. Try signing in instead.'
  }
  if (lower.includes('password') && (lower.includes('6') || lower.includes('short'))) {
    return 'Password must be at least 6 characters.'
  }
  if (lower.includes('valid email') || lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Please enter a valid email address.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }

  return message
}
