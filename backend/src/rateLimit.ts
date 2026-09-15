// Minimal in-memory sliding-window rate limiter. Deliberately not a general-purpose
// middleware — used only by the unauthenticated pairing endpoint, which is the one
// place in this app where an unauthenticated caller can attempt to guess a secret
// (a pairing code) against the server. In-memory means this resets on process
// restart and doesn't share state across instances — acceptable for this app's
// current single-instance deployment; a multi-instance deployment would need a
// shared store (e.g. Redis) instead.
interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > maxAttempts;
}

// Periodic cleanup so the map doesn't grow unbounded over a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= 30 * 60 * 1000) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();
