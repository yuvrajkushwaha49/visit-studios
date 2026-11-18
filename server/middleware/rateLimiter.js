/**
 * Lightweight, zero-dependency production rate limiter.
 * Protects authentication and public API endpoints from brute-force & DDoS.
 */

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const maxRequests = options.max || 100;
  const message = options.message || { error: 'Too many requests, please try again later.' };

  const hits = new Map();

  // Periodic cleanup of stale records every 2 minutes
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 2 * 60 * 1000);

  // Unref timer so it doesn't hold open process shutdown
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = hits.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json(message);
    }

    next();
  };
}

// Strict limiter for authentication & credential endpoints
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 attempts per minute
  message: { error: 'Too many login attempts. Please wait a minute before trying again.' }
});

// General public API limiter
const publicRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: { error: 'Request rate limit exceeded. Please try again later.' }
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  publicRateLimiter
};
