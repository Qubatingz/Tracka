-- Tracka v0.3 database update = patch-01 + patch-02. Run ONCE: Supabase → SQL Editor → New query → paste everything → Run.

-- Tracka patch 01: tell the admins when a new promoter signs up.
create or replace function public.notify_new_seller() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    perform public.notify_admins('New promoter to verify: ' || new.name, '/admin/promoters');
  end if;
  return new;
end $$;

create or replace trigger sellers_notify_new after insert on public.sellers
  for each row execute function public.notify_new_seller();

-- Tracka patch 02: promoter packages (several dates), "Hot on Tracka" chart, safer draft prices.

-- ---------- 1. Packages: a promoter sells several plays for one price ----------
create table if not exists public.seller_packages (
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references public.sellers(id) on delete cascade,
  plays      int not null check (plays between 2 and 30),
  price      int not null check (price > 0),
  note       text not null default '' check (char_length(note) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists seller_packages_seller_idx on public.seller_packages (seller_id, plays);
alter table public.seller_packages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'seller_packages' and policyname = 'packages: everyone reads') then
    create policy "packages: everyone reads" on public.seller_packages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'seller_packages' and policyname = 'packages: I manage mine') then
    create policy "packages: I manage mine" on public.seller_packages for all
      using (seller_id = public.my_seller_id() or public.is_admin())
      with check (seller_id = public.my_seller_id() or public.is_admin());
  end if;
end $$;

-- ---------- 2. Bookings remember the package and every date ----------
alter table public.bookings
  add column if not exists package_id uuid references public.seller_packages(id) on delete set null,
  add column if not exists plays      int not null default 1 check (plays between 1 and 30),
  add column if not exists want_dates date[] not null default '{}',
  add column if not exists run_dates  date[] not null default '{}';

-- Copy the old single dates into the new lists (before the new trigger exists).
update public.bookings set want_dates = array[want_date] where want_date is not null and cardinality(want_dates) = 0;
update public.bookings set run_dates  = array[run_date]  where run_date  is not null and cardinality(run_dates)  = 0;

-- ---------- 3. Price, plays and dates always come from the promoter, never the browser ----------
-- Runs on new bookings and on changes while the campaign is still a draft.
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
  if new.package_id is not null then
    select * into v_pkg from public.seller_packages where id = new.package_id and seller_id = new.seller_id;
    if v_pkg.id is null then raise exception 'This package is not available'; end if;
    v_price := v_pkg.price; v_plays := v_pkg.plays;
  end if;
  -- an older screen may still send only one date
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
create or replace trigger bookings_defaults before insert or update on public.bookings
  for each row execute function public.booking_defaults();

-- ---------- 4. Calendars count every date of a package ----------
create or replace view public.booked_days as
  select seller_id, d as day, count(*) as n
  from (select b.seller_id,
               unnest(case when cardinality(b.run_dates) > 0 then b.run_dates
                           when cardinality(b.want_dates) > 0 then b.want_dates
                           else array[coalesce(b.run_date, b.want_date)] end) as d
        from public.bookings b
        where b.status not in ('declined', 'refunded')) x
  where d is not null
  group by seller_id, d;
grant select on public.booked_days to anon, authenticated;

-- ---------- 5. The promoter confirms all the dates at once ----------
create or replace function public.schedule_booking_dates(p_booking uuid, p_dates date[]) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; s public.sellers; v date[]; d date; n int;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status <> 'booked' or b.accepted_at is null then raise exception 'Accept the booking first'; end if;
  select coalesce(array_agg(x order by x), '{}') into v
    from (select distinct x from unnest(p_dates) as t(x) where x is not null) y;
  if cardinality(v) <> b.plays then
    raise exception '%', case when b.plays = 1 then 'Pick the date' else 'Pick ' || b.plays || ' different dates' end;
  end if;
  if v[1] < current_date then raise exception 'Pick dates from today'; end if;
  select * into s from public.sellers where id = b.seller_id;
  foreach d in array v loop
    select count(*) into n from public.bookings o
     where o.seller_id = b.seller_id and o.id <> b.id and o.status not in ('declined', 'refunded')
       and d = any (case when cardinality(o.run_dates) > 0 then o.run_dates else array[o.run_date] end);
    if n >= s.cal_capacity then raise exception '% is full', to_char(d, 'Dy DD Mon'); end if;
  end loop;
  update public.bookings
     set status = 'scheduled', run_dates = v, run_date = v[1], scheduled_at = now(),
         due_date = greatest(coalesce(due_date, current_date), v[cardinality(v)] + 2)
   where id = p_booking;
  perform public.notify(public.booking_artist(p_booking),
    s.name || case when cardinality(v) = 1 then ' set the date: ' else ' set the dates: ' end
      || (select string_agg(to_char(x, 'Dy DD Mon'), ', ' order by x) from unnest(v) as t(x)) || '.',
    '/artist/c/' || b.campaign_id);
end $$;

-- The old one-date step now uses the same rules.
create or replace function public.schedule_booking(p_booking uuid, p_date date) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.schedule_booking_dates(p_booking, array[p_date]);
end $$;

-- ---------- 6. Proof is never due before the last wanted date ----------
create or replace function public.admin_approve_song(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; r record;
begin
  perform public.require_admin();
  update public.campaigns set status = 'active', reviewed_at = now() where id = p_campaign and status = 'review' returning * into c;
  if c.id is null then raise exception 'No song waiting'; end if;
  update public.bookings b
     set status = 'booked',
         due_date = greatest(current_date + coalesce(s.delivery_days, 7),
                             coalesce((select max(x) from unnest(b.want_dates) as t(x)), b.want_date, current_date) + 2)
    from public.sellers s
   where s.id = b.seller_id and b.campaign_id = p_campaign and b.status = 'pending_payment';
  perform public.notify(c.artist_id, public.q(c.title) || ' is approved! It''s on its way to your promoters. 🚀', '/artist/c/' || p_campaign);
  for r in select s.profile_id, b.price, b.plays from public.bookings b join public.sellers s on s.id = b.seller_id where b.campaign_id = p_campaign loop
    perform public.notify(r.profile_id, 'New booking: ' || public.q(c.title) || ' · '
      || case when r.plays > 1 then r.plays || ' plays · ' else '' end || r.price || ' RWF. Accept within 48 hours.', '/seller');
  end loop;
end $$;

-- ---------- 7. "Hot on Tracka this week" (only songs that are already out) ----------
create or replace function public.trending_songs(p_days int default 7, p_limit int default 5)
returns table (campaign_id uuid, title text, genre text, artist_name text, photo_path text, avatar jsonb, use_avatar boolean,
               promoters int, channels int, plays int, last_live timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.genre, p.display_name, p.photo_path, p.avatar, p.use_avatar,
         count(distinct b.seller_id)::int, count(distinct s.category)::int, sum(b.plays)::int,
         max(coalesce(b.live_at, b.proof_at, b.approved_at))
  from public.bookings b
  join public.campaigns c on c.id = b.campaign_id
  join public.sellers s   on s.id = b.seller_id
  join public.profiles p  on p.id = c.artist_id
  where b.status in ('live', 'proof_submitted', 'approved', 'paid_out')
    and coalesce(b.live_at, b.proof_at, b.approved_at) > now() - make_interval(days => greatest(1, least(p_days, 90)))
  group by c.id, p.id
  order by sum(b.plays) desc, count(distinct b.seller_id) desc, max(coalesce(b.live_at, b.proof_at, b.approved_at)) desc
  limit greatest(1, least(p_limit, 20));
$$;

-- ---------- 8. Who may call what ----------
revoke execute on function public.schedule_booking_dates(uuid, date[]) from public, anon;
grant execute on function public.schedule_booking_dates(uuid, date[]) to authenticated;
revoke execute on function public.trending_songs(int, int) from public;
grant execute on function public.trending_songs(int, int) to anon, authenticated;

select 'Tracka v0.3 database update done ✅' as result;
