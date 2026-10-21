interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter
 * @param key unique identifier (e.g. IP + endpoint)
 * @param maxRequests maximum allowed requests within window
 * @param windowMs time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests = 10,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, newRecord);
    return { allowed: true, remaining: maxRequests - 1, resetAt: newRecord.resetAt };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Clear expired rate limit entries every 10 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);
