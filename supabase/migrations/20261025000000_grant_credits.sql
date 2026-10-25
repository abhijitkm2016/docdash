-- DD-103: server-side payment credit grant.
--
-- Called only by the backend (service_role) after it has verified the Razorpay
-- signature and checked the order. Idempotent on p_request_id (the backend uses
-- `payment:<razorpay_payment_id>`), so a retry or double click never grants twice.
--
-- Same warning as 20261024000000_server_ledger.sql: do not apply to production
-- before the whole ADR-001 set is ready.

create or replace function public.grant_credits(
  p_user       uuid,
  p_amount     integer,
  p_reason     text,
  p_request_id text,
  p_meta       jsonb default '{}'::jsonb
) returns table (balance integer, already_granted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_owner   uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if p_request_id is null or length(p_request_id) = 0 then
    raise exception 'invalid_request_id' using errcode = '22023';
  end if;

  insert into credit_events (user_id, request_id, delta, reason)
  values (p_user, p_request_id, p_amount, p_reason)
  on conflict (request_id) do nothing;

  if not found then
    -- Already granted: report the current balance, change nothing.
    select user_id into v_owner from credit_events where request_id = p_request_id;
    if v_owner is distinct from p_user then
      raise exception 'request_id_conflict' using errcode = '23505';
    end if;
    select credits_remaining into v_balance from credits where user_id = p_user;
    return query select v_balance, true;
    return;
  end if;

  update credits
     set credits_remaining  = credits_remaining + p_amount,
         last_purchase_at   = now(),
         last_purchase_type = coalesce(p_meta->>'planId', 'purchase')
   where user_id = p_user
  returning credits_remaining into v_balance;

  if not found then
    insert into credits (user_id, credits_remaining, credits_used, last_purchase_at, last_purchase_type)
    values (p_user, p_amount, 0, now(), coalesce(p_meta->>'planId', 'purchase'))
    returning credits_remaining into v_balance;
  end if;

  insert into transactions (
    user_id, transaction_type, plan_id, credits_delta, amount_paise, currency,
    razorpay_payment_id, razorpay_order_id, promo_code, description
  ) values (
    p_user, coalesce(p_meta->>'transactionType', 'purchase'), p_meta->>'planId', p_amount,
    nullif(p_meta->>'amountPaise', '')::integer, 'INR',
    p_meta->>'paymentId', p_meta->>'orderId', p_meta->>'promoCode',
    coalesce(p_reason, 'Credits purchased')
  );

  return query select v_balance, false;
end;
$$;

revoke execute on function public.grant_credits(uuid, integer, text, text, jsonb) from public, anon, authenticated;
grant  execute on function public.grant_credits(uuid, integer, text, text, jsonb) to service_role;
