import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto'
import { redis } from './redis'

// Two-step auth challenges (login + register) backed by Redis.
//
// Flow shared by both endpoints:
//
//   1. The client posts credentials. The endpoint validates them, then
//      calls `createXxxChallenge` to produce a one-shot challenge with
//      a 6-digit numeric code. The challenge id is returned to the
//      client as `challengeId` (an opaque random string).
//   2. The endpoint emails the code to the user via mailer + a
//      template.
//   3. The client posts `{ challengeId, code }`. The endpoint calls
//      `consumeChallenge`, which validates the code, increments the
//      attempt counter, and on success returns the original payload —
//      then the endpoint issues the session JWT.
//
// Storage layout:
//
//   Key: `auth:challenge:<challengeId>` (TTL 10 min)
//   Value: JSON { kind, codeHash, attempts, payload }
//
// We store a SHA-256 hash of the code instead of the code itself so
// that a Redis dump cannot be replayed. The hash is fine here because
// the input space is only 1e6 and the challenge is single-use within
// 10 minutes — but it raises the bar for casual leaks.

const CHALLENGE_PREFIX = 'auth:challenge:'
const CHALLENGE_TTL_SEC = 10 * 60
const MAX_ATTEMPTS = 5
// Mandatory cooldown between two codes of the same challenge.
// Prevents the user (or an attacker) from spamming emails by
// refreshing the code in a tight loop. The IP rate-limit complements
// this at the IP level; this one acts per-challenge.
export const RESEND_COOLDOWN_SEC = 60

// Recovery tickets: once the code is validated we issue an ephemeral
// ticket that authorises the password change in the next step. This
// decouples "verify identity" from "change password" so they can
// live on two separate screens.
const RECOVERY_TICKET_PREFIX = 'auth:recovery-ticket:'
const RECOVERY_TICKET_TTL_SEC = 10 * 60

export type ChallengeKind = 'login' | 'register' | 'recovery'

export interface LoginPayload {
  kind: 'login'
  userId: string
}

export interface RegisterPayload {
  kind: 'register'
  email: string
  username: string
  passwordHash: string
  locale: 'en_en' | 'es_es' | 'fr_fr'
}

export interface RecoveryPayload {
  kind: 'recovery'
  userId: string
  email: string
}

export type ChallengePayload = LoginPayload | RegisterPayload | RecoveryPayload

interface StoredChallenge {
  kind: ChallengeKind
  codeHash: string
  attempts: number
  payload: ChallengePayload
  // Unix ms of the last code send (creation or resend). Used to
  // enforce the resend cooldown. Optional for back-compat with
  // legacy challenges still in Redis after a deploy.
  lastSentAt?: number
}

export interface CreatedChallenge {
  challengeId: string
  code: string
  expiresAt: string
  resendAvailableAt: string
}

function newChallengeId(): string {
  return randomBytes(24).toString('base64url')
}

function newCode(): string {
  // 6-digit code, zero-padded — randomInt is uniform over [0, max).
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

// Constant-time comparison of two hex hashes. timingSafeEqual
// requires equal-length buffers; SHA-256 hex hashes are always 64
// chars but we double-check length to be safe.
function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

export async function createChallenge(payload: ChallengePayload): Promise<CreatedChallenge> {
  const challengeId = newChallengeId()
  const code = newCode()
  const now = Date.now()
  const stored: StoredChallenge = {
    kind: payload.kind,
    codeHash: hashCode(code),
    attempts: 0,
    payload,
    lastSentAt: now,
  }
  await redis.set(
    CHALLENGE_PREFIX + challengeId,
    JSON.stringify(stored),
    'EX',
    CHALLENGE_TTL_SEC,
  )
  return {
    challengeId,
    code,
    expiresAt: new Date(now + CHALLENGE_TTL_SEC * 1000).toISOString(),
    resendAvailableAt: new Date(now + RESEND_COOLDOWN_SEC * 1000).toISOString(),
  }
}

export type ConsumeOutcome =
  | { ok: true; payload: ChallengePayload }
  | { ok: false; reason: 'not_found' | 'too_many_attempts' | 'wrong_code'; remaining?: number }

export async function consumeChallenge(
  challengeId: string,
  code: string,
  expectedKind: ChallengeKind,
): Promise<ConsumeOutcome> {
  const key = CHALLENGE_PREFIX + challengeId
  const raw = await redis.get(key)
  if (!raw) return { ok: false, reason: 'not_found' }

  let stored: StoredChallenge
  try {
    stored = JSON.parse(raw) as StoredChallenge
  } catch {
    await redis.del(key)
    return { ok: false, reason: 'not_found' }
  }

  if (stored.kind !== expectedKind) {
    await redis.del(key)
    return { ok: false, reason: 'not_found' }
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    await redis.del(key)
    return { ok: false, reason: 'too_many_attempts' }
  }

  if (!constantTimeEqualHex(hashCode(code), stored.codeHash)) {
    const nextAttempts = stored.attempts + 1
    if (nextAttempts >= MAX_ATTEMPTS) {
      await redis.del(key)
      return { ok: false, reason: 'too_many_attempts', remaining: 0 }
    }
    stored.attempts = nextAttempts
    const ttl = await redis.ttl(key)
    await redis.set(key, JSON.stringify(stored), 'EX', ttl > 0 ? ttl : CHALLENGE_TTL_SEC)
    return { ok: false, reason: 'wrong_code', remaining: MAX_ATTEMPTS - nextAttempts }
  }

  // Success — single-use, drop the challenge.
  await redis.del(key)
  return { ok: true, payload: stored.payload }
}

// ── Recovery tickets ──
// Ephemeral one-shot tokens used between /verify-code and /verify
// in the password-recovery flow. Created after a successful code
// validation, consumed when the user submits the new password.

export interface CreatedRecoveryTicket {
  ticket: string
  expiresAt: string
}

export async function createRecoveryTicket(userId: string): Promise<CreatedRecoveryTicket> {
  const ticket = newChallengeId()
  await redis.set(
    RECOVERY_TICKET_PREFIX + ticket,
    JSON.stringify({ userId }),
    'EX',
    RECOVERY_TICKET_TTL_SEC,
  )
  return {
    ticket,
    expiresAt: new Date(Date.now() + RECOVERY_TICKET_TTL_SEC * 1000).toISOString(),
  }
}

export async function consumeRecoveryTicket(ticket: string): Promise<string | null> {
  const key = RECOVERY_TICKET_PREFIX + ticket
  const raw = await redis.get(key)
  if (!raw) return null
  await redis.del(key)
  try {
    const parsed = JSON.parse(raw) as { userId?: string }
    return parsed.userId ?? null
  } catch {
    return null
  }
}

export async function getChallengeMeta(challengeId: string): Promise<{
  kind: ChallengeKind
} | null> {
  const raw = await redis.get(CHALLENGE_PREFIX + challengeId)
  if (!raw) return null
  try {
    const stored = JSON.parse(raw) as StoredChallenge
    return { kind: stored.kind }
  } catch {
    return null
  }
}

export type RefreshOutcome =
  | { ok: true; code: string; resendAvailableAt: string }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'cooldown'; retryAfterSec: number }

// Re-issues a new code for the same challenge. Keeps the attempt
// counter so a brute-force attacker cannot reset it by resending.
// Enforces a per-challenge cooldown (RESEND_COOLDOWN_SEC) so the
// user cannot spam emails by hammering the resend button.
export async function refreshChallengeCode(challengeId: string): Promise<RefreshOutcome> {
  const key = CHALLENGE_PREFIX + challengeId
  const raw = await redis.get(key)
  if (!raw) return { ok: false, reason: 'not_found' }

  let stored: StoredChallenge
  try {
    stored = JSON.parse(raw) as StoredChallenge
  } catch {
    return { ok: false, reason: 'not_found' }
  }

  const now = Date.now()
  if (stored.lastSentAt) {
    const elapsed = now - stored.lastSentAt
    const cooldownMs = RESEND_COOLDOWN_SEC * 1000
    if (elapsed < cooldownMs) {
      return {
        ok: false,
        reason: 'cooldown',
        retryAfterSec: Math.ceil((cooldownMs - elapsed) / 1000),
      }
    }
  }

  const code = newCode()
  stored.codeHash = hashCode(code)
  stored.lastSentAt = now
  // Refresh the TTL so the 10-minute clock restarts from the newly
  // issued code — matches the "only the latest code, valid for 10
  // min" contract surfaced to the user.
  await redis.set(key, JSON.stringify(stored), 'EX', CHALLENGE_TTL_SEC)
  return {
    ok: true,
    code,
    resendAvailableAt: new Date(now + RESEND_COOLDOWN_SEC * 1000).toISOString(),
  }
}
