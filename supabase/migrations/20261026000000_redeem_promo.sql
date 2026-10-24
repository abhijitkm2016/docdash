-- DD-104: server-side promo redemption.
--
-- Same warning as the other ADR-001 migrations: do not apply to production until
-- the whole set is ready. This one also CLOSES TWO HOLES:
--   * promo_codes was readable by everyone ("Anyone can read promo codes"), so
--     any visitor could list every active code.
--   * promo_redemptions was writable from the browser, and uses_count was never
--     incremented (no UPDATE policy), so max_uses was not enforced.

create or replace function public.redeem_promo(p_user uuid, p_code text)
returns table (credits_granted integer, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code    promo_codes%rowtype;
  v_balance integer;
begin
  -- Row lock serialises concurrent redemptions of the same code, so max_uses
  -- and the once-per-user rule cannot be raced.
  select * into v_code from promo_codes
   where code = upper(btrim(p_code))
   for update;

  if not found then
    raise exception 'invalid_code' using errcode = 'P0001';
  end if;
  if v_code.expires_at < now() then
    raise exception 'code_expired' using errcode = 'P0001';
  end if;
  if v_code.uses_count >= v_code.max_uses then
    raise exception 'code_exhausted' using errcode = 'P0001';
  end if;
  if exists (select 1 from promo_redemptions where user_id = p_user and code_id = v_code.id) then
    raise exception 'already_redeemed' using errcode = 'P0001';
  end if;

  insert into promo_redemptions (user_id, code_id) values (p_user, v_code.id);
  update promo_codes set uses_count = uses_count + 1 where id = v_code.id;

  select g.balance into v_balance
    from grant_credits(
      p_user, v_code.credits_granted, 'Promo code redeemed: ' || v_code.code,
      'promo:' || v_code.id || ':' || p_user,
      jsonb_build_object('planId', 'promo', 'transactionType', 'promo', 'promoCode', v_code.code)
    ) g;

  return query select v_code.credits_granted, v_balance;
end;
$$;

revoke execute on function public.redeem_promo(uuid, text) from public, anon, authenticated;
grant  execute on function public.redeem_promo(uuid, text) to service_role;

-- Close the holes. Admin policies (admin_select/insert_promo_codes) are untouched,
-- so the admin panel keeps working.
drop policy if exists "Anyone can read promo codes"      on public.promo_codes;
drop policy if exists "Users can insert own redemptions" on public.promo_redemptions;
revoke select on public.promo_codes from anon;
revoke insert, update, delete on public.promo_redemptions from anon, authenticated;
revoke update, delete on public.promo_codes from anon, authenticated;
