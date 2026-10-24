/**
 * Credit ledger client. All balance changes go through the SECURITY DEFINER
 * SQL functions consume_credits / refund_credits (see
 * supabase/migrations/20261024000000_server_ledger.sql); the browser can no
 * longer write to the credits table.
 */
const crypto = require('crypto');
const { getServiceClient } = require('./supabaseServer');

const COST = { standard: 1, deep: 5, remix: 1 };

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

module.exports = { COST, InsufficientCreditsError, newRequestId, consumeCredits, refundCredits };
