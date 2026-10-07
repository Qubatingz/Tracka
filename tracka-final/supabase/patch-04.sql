-- Tracka patch 04: practice bookings with example promoters.
-- Anyone can book example promoters in a "practice campaign" (no real money). The Tracka team plays the
-- example promoters' part from the Control room, so the whole road can be tried from start to finish.
-- Practice never touches the money records. Safe to run more than once. Run after patch-03.

-- A practice campaign = one with example promoters in it.
create or replace function public.is_practice(p_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b join public.sellers s on s.id = b.seller_id
                 where b.campaign_id = p_campaign and s.is_example)
$$;
grant execute on function public.is_practice(uuid) to anon, authenticated;

-- Bookings: price and plays from the promoter; example and real promoters never mix in one campaign.
create or replace function public.booking_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_price int; v_plays int := 1; v_pkg public.seller_packages; v_example boolean;
begin
  if tg_op = 'UPDATE' and (new.status is distinct from 'pending_payment'
     or not exists (select 1 from public.campaigns where id = new.campaign_id and status = 'draft')) then
    return new;
  end if;
  select price, is_example into v_price, v_example from public.sellers where id = new.seller_id and status = 'verified';
  if v_price is null then raise exception 'This seller is not available'; end if;
  if v_example and exists (select 1 from public.bookings o join public.sellers s on s.id = o.seller_id
                           where o.campaign_id = new.campaign_id and o.id <> new.id and not s.is_example) then
    raise exception 'Example promoters are for practice. Book them in a new campaign, not together with real promoters.';
  end if;
  if not v_example and exists (select 1 from public.bookings o join public.sellers s on s.id = o.seller_id
                               where o.campaign_id = new.campaign_id and o.id <> new.id and s.is_example) then
    raise exception 'This is a practice campaign with example promoters. Start a new campaign to book real promoters.';
  end if;
  if new.package_id is not null then
    select * into v_pkg from public.seller_packages where id = new.package_id and seller_id = new.seller_id;
    if v_pkg.id is null then raise exception 'This package is not available'; end if;
    v_price := v_pkg.price; v_plays := v_pkg.plays;
  end if;
  if tg_op = 'INSERT' and cardinality(new.want_dates) = 0 and new.want_date is not null then
    new.want_dates := array[new.want_date];
  elsif tg_op = 'UPDATE' and new.want_date is distinct from old.want_date and new.want_dates = old.want_dates then
    new.want_dates := case when new.want_date is null then '{}'::date[] else array[new.want_date] end;
  end if;
  new.want_dates := coalesce((select array_agg(d order by d) from (
                      select distinct d from unnest(new.want_dates) as t(d)
                      where d is not null and d >= current_date order by d limit v_plays) x), '{}');
  new.want_date := new.want_dates[1];
  new.price := v_price; new.plays := v_plays; new.status := 'pending_payment';
  return new;
end $$;

-- Payment confirmed: practice campaigns are not real money.
create or replace function public.admin_confirm_payment(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; total int; practice boolean;
begin
  perform public.require_admin();
  select * into c from public.campaigns where id = p_campaign for update;
  if c.status <> 'payment_submitted' then raise exception 'No payment waiting'; end if;
  practice := public.is_practice(p_campaign);
  select coalesce(sum(price), 0) into total from public.bookings where campaign_id = p_campaign;
  update public.campaigns set status = 'review', paid_at = now() where id = p_campaign;
  if not practice then
    insert into public.money_events (kind, amount, campaign_id, ref, created_by)
    values ('artist_payment', total + round(total * c.fee_percent / 100)::int, p_campaign, c.momo_txn, auth.uid());
  end if;
  perform public.notify(c.artist_id, case when practice then 'Practice payment confirmed ✓ ' else 'Payment confirmed ✓ ' end
    || 'Our team is listening to ' || public.q(c.title) || ' now.', '/artist/c/' || p_campaign);
end $$;

-- Payout: practice promoters get nothing real, so nothing goes in the money records.
create or replace function public.admin_mark_paid(p_booking uuid, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  perform public.require_admin();
  update public.bookings set status = 'paid_out', paid_out_at = now() where id = p_booking and status = 'approved' returning * into b;
  if b.id is null then raise exception 'Nothing to pay'; end if;
  if not exists (select 1 from public.sellers where id = b.seller_id and is_example) then
    insert into public.money_events (kind, amount, campaign_id, booking_id, ref, created_by) values ('seller_payout', b.price, b.campaign_id, b.id, p_ref, auth.uid());
  end if;
  perform public.notify(public.booking_seller_profile(p_booking), 'Paid! ' || b.price || ' RWF sent to your MoMo.', '/seller/money');
  perform public.notify(public.booking_artist(p_booking), 'Done! Your receipt is ready.', '/artist/c/' || b.campaign_id || '/receipt');
  perform public.maybe_complete(b.campaign_id);
end $$;

create or replace function public.admin_mark_refund_sent(p_booking uuid, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  perform public.require_admin();
  update public.bookings set refund_sent_at = now() where id = p_booking and status in ('declined', 'refunded') and refund_sent_at is null returning * into b;
  if b.id is null then raise exception 'No refund waiting'; end if;
  if not exists (select 1 from public.sellers where id = b.seller_id and is_example) then
    insert into public.money_events (kind, amount, campaign_id, booking_id, ref, created_by) values ('refund', b.price, b.campaign_id, b.id, p_ref, auth.uid());
  end if;
  perform public.notify(public.booking_artist(p_booking),
    case when exists (select 1 from public.sellers where id = b.seller_id and is_example) then 'Practice refund done.'
         else 'Refund sent: ' || b.price || ' RWF went to your MoMo.' end, '/artist/c/' || b.campaign_id || '/receipt');
end $$;

-- Tips are real money, so they only go to real promoters.
create or replace function public.submit_tip(p_booking uuid, p_amount int, p_txn text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null or public.booking_artist(p_booking) is distinct from auth.uid() then raise exception 'Not your booking'; end if;
  if b.status not in ('approved', 'paid_out') then raise exception 'Tips come after the job is done'; end if;
  if exists (select 1 from public.sellers where id = b.seller_id and is_example) then raise exception 'Tips are for real promoters only.'; end if;
  insert into public.tips (booking_id, amount, momo_txn) values (p_booking, p_amount, trim(p_txn));
  perform public.notify_admins('Tip to check: ' || p_amount || ' RWF', '/admin/payments');
end $$;

-- The Tracka team plays an example promoter: one step forward (accept → dates → live → proof).
create or replace function public.admin_practice_step(p_booking uuid) returns text
language plpgsql security definer set search_path = public as $$
declare b public.bookings; s public.sellers; v date[]; d date; i int := 0;
begin
  perform public.require_admin();
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  select * into s from public.sellers where id = b.seller_id;
  if not s.is_example then raise exception 'Only example promoters can be moved from here'; end if;
  if b.status = 'booked' and b.accepted_at is null then
    update public.bookings set accepted_at = now() where id = p_booking;
    perform public.notify(public.booking_artist(p_booking), s.name || ' accepted your song. ✅', '/artist/c/' || b.campaign_id);
    return 'accepted';
  elsif b.status = 'booked' then
    -- the artist's dates first (from today), then the next days
    select coalesce(array_agg(x order by x), '{}') into v
      from (select distinct x from unnest(b.want_dates) as t(x) where x >= current_date order by x limit b.plays) y;
    while cardinality(v) < b.plays loop
      d := current_date + i;
      if not (d = any (v)) then v := array_append(v, d); end if;
      i := i + 1;
    end loop;
    select array_agg(x order by x) into v from unnest(v) as t(x);
    update public.bookings set status = 'scheduled', run_dates = v, run_date = v[1], scheduled_at = now(),
           due_date = greatest(coalesce(due_date, current_date), v[cardinality(v)] + 2)
     where id = p_booking;
    perform public.notify(public.booking_artist(p_booking),
      s.name || case when cardinality(v) = 1 then ' set the date: ' else ' set the dates: ' end
        || (select string_agg(to_char(x, 'Dy DD Mon'), ', ' order by x) from unnest(v) as t(x)) || '.', '/artist/c/' || b.campaign_id);
    return 'scheduled';
  elsif b.status = 'scheduled' then
    update public.bookings set status = 'live', live_at = now() where id = p_booking;
    perform public.notify(public.booking_artist(p_booking), 'Your song is out now! 🎶', '/artist/c/' || b.campaign_id);
    return 'live';
  elsif b.status = 'live' then
    insert into public.proofs (booking_id, kind, note, created_by)
    values (p_booking, 'proof', 'Practice proof from ' || s.name || ': '
      || case when s.category in ('radio', 'tv', 'dj') then 'played' else 'posted' end
      || case when b.plays > 1 then ' ' || b.plays || ' times' else '' end || '. (Example promoter, no real play.)', auth.uid());
    update public.bookings set status = 'proof_submitted', proof_at = now() where id = p_booking;
    perform public.notify(public.booking_artist(p_booking), 'Result arrived: see the proof.', '/artist/c/' || b.campaign_id);
    return 'proof';
  end if;
  raise exception 'Nothing to do for this booking now';
end $$;

-- Every example booking that can move, one step forward (optionally only in one campaign).
create or replace function public.admin_practice_all(p_campaign uuid default null) returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  perform public.require_admin();
  for r in select b.id from public.bookings b join public.sellers s on s.id = b.seller_id
           join public.campaigns c on c.id = b.campaign_id
           where s.is_example and c.status = 'active' and b.status in ('booked', 'scheduled', 'live')
             and (p_campaign is null or b.campaign_id = p_campaign) loop
    perform public.admin_practice_step(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.admin_practice_step(uuid), public.admin_practice_all(uuid) from public, anon;
grant execute on function public.admin_practice_step(uuid), public.admin_practice_all(uuid) to authenticated;

select 'Tracka patch 04 done ✅' as result;
