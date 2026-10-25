/**
 * Credit ledger client. All balance changes go through the SECURITY DEFINER
 * SQL functions consume_credits / refund_credits (see
 * supabase/migrations/20261024000000_server_ledger.sql); the browser can no
 * longer write to the credits table.
 */
const crypto = require('crypto');
const { getServiceClient } = require('./supabaseServer');

const COST = { standard: 1, deep: 5, remix: 1 };

const PROMO_ERRORS = {
  invalid_code:     { status: 404, message: 'Invalid code' },
  code_expired:     { status: 410, message: 'This code has expired' },
  code_exhausted:   { status: 409, message: 'This code has been fully redeemed' },
  already_redeemed: { status: 409, message: "You've already used this code" },
};

class PromoError extends Error {
  constructor(code) {
    super(PROMO_ERRORS[code].message);
    this.name = 'PromoError';
    this.code = code;
    this.status = PROMO_ERRORS[code].status;
  }
}

class InsufficientCreditsError extends Error {
  constructor(message = 'Not enough credits.') {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.status = 402;
  }
}

function newRequestId(prefix) {
  return `${prefix}:${crypto.randomUUID()}`;
}

/** Atomically deduct credits. Throws InsufficientCreditsError when balance is too low. */
async function consumeCredits({ userId, amount, reason, requestId, client = getServiceClient() }) {
  const { data, error } = await client.rpc('consume_credits', {
    p_user: userId,
    p_amount: amount,
    p_reason: reason,
    p_request_id: requestId,
  });
  if (error) {
    if ((error.message || '').includes('insufficient_credits')) throw new InsufficientCreditsError();
    throw new Error(`consume_credits failed: ${error.message}`);
  }
  return data; // balance after the charge
}

/** Reverse a prior consume exactly once (safe to call repeatedly). */
async function refundCredits({ requestId, client = getServiceClient() }) {
  const { data, error } = await client.rpc('refund_credits', { p_request_id: requestId });
  if (error) throw new Error(`refund_credits failed: ${error.message}`);
  return data; // balance after the refund
}

/**
 * Grant purchased credits, atomically and idempotently (keyed on requestId,
 * e.g. `payment:<razorpay_payment_id>`). Also writes the purchase transaction.
 */
async function grantCredits({ userId, amount, reason, requestId, meta = {}, client = getServiceClient() }) {
  const { data, error } = await client.rpc('grant_credits', {
    p_user: userId,
    p_amount: amount,
    p_reason: reason,
    p_request_id: requestId,
    p_meta: meta,
  });
  if (error) throw new Error(`grant_credits failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return { balance: row.balance, alreadyGranted: row.already_granted };
}

/** Redeem a promo code for this user. Throws PromoError for expected failures. */
async function redeemPromo({ userId, code, client = getServiceClient() }) {
  const { data, error } = await client.rpc('redeem_promo', { p_user: userId, p_code: code });
  if (error) {
    const known = Object.keys(PROMO_ERRORS).find(k => (error.message || '').includes(k));
    if (known) throw new PromoError(known);
    throw new Error(`redeem_promo failed: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { creditsGranted: row.credits_granted, balance: row.balance };
}

module.exports = { redeemPromo, PromoError, grantCredits, COST, InsufficientCreditsError, newRequestId, consumeCredits, refundCredits };
