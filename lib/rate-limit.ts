// Best-effort, in-memory per-IP rate limiter. State lives in the memory of a
// single serverless instance, so limits are not shared across instances or
// regions — this raises the bar against casual scripted abuse, but is not a
// hard guarantee under high concurrency. Swap for a shared store (e.g.
// Vercel KV / Upstash) if a hard guarantee is needed.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

const MAX_TRACKED_KEYS = 5000

function sweepExpired(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

type RateLimitOptions = {
  limit: number
  windowMs: number
}

export function checkRateLimit(req: Request, scope: string, { limit, windowMs }: RateLimitOptions): boolean {
  const now = Date.now()
  sweepExpired(now)

  const key = `${scope}:${getClientIp(req)}`
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) return false

  bucket.count += 1
  return true
}

export function rateLimitResponse() {
  return new Response(JSON.stringify({ error: 'Too many requests. Please try again shortly.' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  })
}
