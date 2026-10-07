-- Tracka patch 03: example promoters and artists (for demos), safely.
-- Example data can't be booked by real artists, users can't change the flag, and the
-- Tracka team removes it all with one button (Control room → Settings).
-- Safe to run more than once.

alter table public.sellers  add column if not exists is_example boolean not null default false;
alter table public.profiles add column if not exists is_example boolean not null default false;

-- Only the Tracka team can change admin or example flags on a profile.
create or replace function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.is_admin is distinct from old.is_admin then raise exception 'Not allowed'; end if;
    new.is_example := old.is_example;
  end if;
  return new;
end $$;

-- Sellers can't verify themselves (or mark themselves as examples).
create or replace function public.protect_seller() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.verified_at := null; new.id_checked := false; new.added_by_admin := false; new.is_example := false;
    if not exists (select 1 from public.categories where key = new.category and (is_open or (key = 'other' and (select allow_custom from public.settings)))) then
      raise exception 'This service is not open yet';
    end if;
  else
    new.status := old.status; new.verified_at := old.verified_at; new.id_checked := old.id_checked;
    new.added_by_admin := old.added_by_admin; new.profile_id := old.profile_id; new.is_example := old.is_example;
  end if;
  return new;
end $$;

-- Same as patch 02, plus: example promoters only take example campaigns.
create or replace function public.booking_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_price int; v_plays int := 1; v_pkg public.seller_packages;
begin
  if tg_op = 'UPDATE' and (new.status is distinct from 'pending_payment'
     or not exists (select 1 from public.campaigns where id = new.campaign_id and status = 'draft')) then
    return new;
  end if;
  select price into v_price from public.sellers where id = new.seller_id and status = 'verified';
  if v_price is null then raise exception 'This seller is not available'; end if;
  if exists (select 1 from public.sellers where id = new.seller_id and is_example)
     and not exists (select 1 from public.campaigns c join public.profiles p on p.id = c.artist_id
                     where c.id = new.campaign_id and p.is_example) then
    raise exception 'This is an example promoter, just for show. Please pick a real one.';
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

-- One button for the Tracka team: remove every example promoter, artist, song and booking.
create or replace function public.remove_examples() returns text
language plpgsql security definer set search_path = public as $$
declare n_s int; n_a int;
begin
  perform public.require_admin();
  select count(*) into n_s from public.sellers where is_example;
  select count(*) into n_a from public.profiles where is_example;
  delete from public.money_events where campaign_id in (select c.id from public.campaigns c join public.profiles p on p.id = c.artist_id where p.is_example);
  delete from public.campaigns where artist_id in (select id from public.profiles where is_example);
  delete from public.bookings where seller_id in (select id from public.sellers where is_example);
  delete from public.sellers where is_example;
  delete from auth.users where id in (select id from public.profiles where is_example);
  delete from public.profiles where is_example;
  return n_s || ' example promoters and ' || n_a || ' example artists removed.';
end $$;
revoke execute on function public.remove_examples() from public, anon;
grant execute on function public.remove_examples() to authenticated;

select 'Tracka patch 03 done ✅' as result;
