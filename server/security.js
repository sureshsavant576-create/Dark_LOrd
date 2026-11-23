const crypto = require('node:crypto');

const COOKIE_NAME = 'lablink_demo';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const configuredSecret = process.env.LABLINK_SESSION_SECRET;
if (configuredSecret && Buffer.byteLength(configuredSecret) < 32) throw new Error('LABLINK_SESSION_SECRET must contain at least 32 bytes.');
const sessionSecret = configuredSecret || crypto.randomBytes(32).toString('base64url');
const windows = new Map();
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10_000;
let nextRateLimitCleanup = 0;

function signature(value) {
  return crypto.createHmac('sha256', sessionSecret).update(value).digest();
}

function issueDemoSession(userId, secure = false) {
  const value = Buffer.from(JSON.stringify({ userId, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString('base64url');
  const token = `${value}.${signature(value).toString('base64url')}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

function clearDemoSession(secure = false) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

function readDemoSession(req) {
  const cookieHeader = req.headers.cookie || '';
  const token = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const encoded = token.slice(0, separator);
  let provided;
  try { provided = Buffer.from(token.slice(separator + 1), 'base64url'); } catch { return null; }
  const expected = signature(encoded);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(payload.userId) || !Number.isSafeInteger(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

function clientKey(req) {
  if (process.env.K_SERVICE) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length < 512) return forwarded.split(',')[0].trim() || 'cloud-run-client';
  }
  return req.socket.remoteAddress || 'unknown-client';
}

function checkRequestLimit(req, pathname) {
  const now = Date.now();
  if (now >= nextRateLimitCleanup) {
    for (const [key, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(key);
    }
    nextRateLimitCleanup = now + RATE_LIMIT_CLEANUP_INTERVAL_MS;
  }
  const expensive = /^\/api\/(assistant|planner\/analyze|analytics\/ai-insights)/.test(pathname);
  const limit = pathname === '/api/demo/session' ? 120 : expensive ? 12 : 180;
  const windowMs = RATE_LIMIT_WINDOW_MS;
  const key = `${clientKey(req)}:${expensive ? 'ai' : pathname === '/api/demo/session' ? 'session' : 'api'}`;
  let bucket = windows.get(key);
  if (!bucket && windows.size >= MAX_RATE_LIMIT_BUCKETS) return Math.ceil(windowMs / 1000);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  windows.set(key, bucket);
  return bucket.count <= limit ? null : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

function assertQueryIdentity(url, principal) {
  const requestedUser = url.searchParams.get('userId');
  if (requestedUser !== null && Number(requestedUser) !== principal.id) {
    throw Object.assign(new Error('The selected demo profile does not match this request.'), { status: 403 });
  }
  const requestedRole = url.searchParams.get('role');
  if (requestedRole && requestedRole !== principal.role) {
    throw Object.assign(new Error('The requested role does not match the selected demo profile.'), { status: 403 });
  }
}

function assertBodyIdentity(req, body) {
  const principal = req.lablinkPrincipal;
  if (!principal) return body;
  for (const field of ['actorId', 'reviewerId', 'approverId', 'verifiedBy', 'clearedBy', 'reporterId', 'performedBy']) {
    if (body[field] !== undefined && body[field] !== null && Number(body[field]) !== principal.id) {
      throw Object.assign(new Error('The acting demo profile does not match this request.'), { status: 403 });
    }
  }
  const mayActOnAnotherStudent = req.lablinkPath === '/api/equipment/scan' || req.lablinkPath === '/api/training/verify';
  if (body.userId !== undefined && body.userId !== null && Number(body.userId) !== principal.id && !mayActOnAnotherStudent) {
    throw Object.assign(new Error('The selected demo profile does not match this request.'), { status: 403 });
  }
  return body;
}

function securityHeaders(res, secure = false) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

module.exports = {
  SESSION_TTL_SECONDS,
  MAX_RATE_LIMIT_BUCKETS,
  issueDemoSession,
  clearDemoSession,
  readDemoSession,
  checkRequestLimit,
  assertQueryIdentity,
  assertBodyIdentity,
  securityHeaders
};
