import rateLimit from 'express-rate-limit';

const tooMany = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

/** Public verification endpoints: generous for humans, stops scraping/enumeration. */
export const verifyLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many verification requests. Please wait a minute and try again.'),
});

/** Login: slows down password guessing. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: tooMany('Too many sign-in attempts. Please try again in 15 minutes.'),
});
