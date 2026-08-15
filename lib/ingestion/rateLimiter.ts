/**
 * Rate Limiter & Resilience Guard
 * Prevents exceeding API quotas (Finnhub 60/min, Marketaux 100/day, Gemini, etc.)
 * Implements exponential backoff with jitter on 429 / 5xx errors.
 */

interface RateLimitState {
  lastCallTimestamp: number;
  minIntervalMs: number;
  callsThisMinute: number;
  minuteResetTimestamp: number;
  maxPerMinute: number;
}

const rateLimiters: Record<string, RateLimitState> = {
  finnhub: {
    lastCallTimestamp: 0,
    minIntervalMs: 1000, // max 1 call/sec per stream
    callsThisMinute: 0,
    minuteResetTimestamp: Date.now() + 60000,
    maxPerMinute: 50, // keep safety buffer below 60/min
  },
  marketaux: {
    lastCallTimestamp: 0,
    minIntervalMs: 2500,
    callsThisMinute: 0,
    minuteResetTimestamp: Date.now() + 60000,
    maxPerMinute: 15,
  },
  gemini: {
    lastCallTimestamp: 0,
    minIntervalMs: 1500,
    callsThisMinute: 0,
    minuteResetTimestamp: Date.now() + 60000,
    maxPerMinute: 15,
  },
};

export async function rateLimitGuard(provider: 'finnhub' | 'marketaux' | 'gemini'): Promise<void> {
  const limiter = rateLimiters[provider];
  if (!limiter) return;

  const now = Date.now();

  // Reset minute counter if interval passed
  if (now > limiter.minuteResetTimestamp) {
    limiter.callsThisMinute = 0;
    limiter.minuteResetTimestamp = now + 60000;
  }

  // Check if per-minute ceiling is reached
  if (limiter.callsThisMinute >= limiter.maxPerMinute) {
    const waitTime = limiter.minuteResetTimestamp - now + 100;
    console.warn(`[RateLimitGuard] ${provider} reached per-minute quota. Waiting ${waitTime}ms...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Ensure minimum interval spacing between consecutive calls
  const timeSinceLast = now - limiter.lastCallTimestamp;
  if (timeSinceLast < limiter.minIntervalMs) {
    const waitSpacing = limiter.minIntervalMs - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitSpacing));
  }

  limiter.lastCallTimestamp = Date.now();
  limiter.callsThisMinute += 1;
}

/**
 * Fetch wrapper with retry and exponential backoff
 */
export async function resilientFetch<T>(
  provider: 'finnhub' | 'marketaux' | 'gemini',
  fetchFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await rateLimitGuard(provider);
      return await fetchFn();
    } catch (err: any) {
      attempt++;
      const isRateLimit = err?.status === 429 || err?.message?.includes('429');
      const isServerError = err?.status >= 500 && err?.status < 600;

      if (attempt >= maxRetries || (!isRateLimit && !isServerError && err?.status !== undefined)) {
        throw err;
      }

      // Exponential backoff with jitter: 2^attempt * 1000ms + random jitter
      const backoffDelay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
      console.warn(
        `[Resilience] ${provider} API error (attempt ${attempt}/${maxRetries}): ${err?.message || err}. Retrying in ${backoffDelay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw new Error(`[Resilience] ${provider} API exceeded max retries.`);
}
