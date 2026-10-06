-- =====================================================================
--  TRACKA — database v2 (Supabase / Postgres)
--  Run ONCE on a NEW Supabase project: SQL Editor → New query → paste → Run.
--  Money is never moved by the database: it records what the Tracka team does on MoMo.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- 1. Types ----------
create type public.seller_status   as enum ('pending', 'verified', 'rejected', 'suspended');
create type public.campaign_status as enum ('draft', 'payment_submitted', 'review', 'changes', 'active', 'completed');
create type public.booking_status  as enum ('pending_payment', 'booked', 'scheduled', 'live', 'proof_submitted', 'disputed', 'approved', 'paid_out', 'declined', 'refunded');
create type public.tip_status      as enum ('submitted', 'confirmed', 'sent');
create type public.id_kind         as enum ('nid', 'passport');
create type public.money_kind      as enum ('artist_payment', 'seller_payout', 'refund', 'tip_in', 'tip_out');

-- ---------- 2. Settings (one row) and categories ----------
create table public.settings (
  id            int primary key default 1 check (id = 1),
  momo_code     text not null default '',
  fee_percent   numeric(5,2) not null default 0 check (fee_percent between 0 and 50),
  whatsapp      text not null default '',
  phone         text not null default '',
  email         text not null default '',
  rdb           text not null default '',
  company       text not null default '',
  founder_name  text not null default 'Jimmy',
  founder_msg   text not null default '',
  rules_artist  text[] not null default array[
    'Only promote music you own or have permission to use.',
    'No songs that attack people or groups.',
    'Pay once, before promoters start. Our team checks your song first.',
    'Rate promoters honestly after each job.',
    'If a promoter declines, you get that money back.',
    'Your money is held until you see proof.'],
  rules_seller  text[] not null default array[
    'Only share pages and videos that are really yours. No fake streams, bots, bought followers or bought views.',
    'Your price includes everything you listed. No extra charges later.',
    'Accept or decline within 48 hours.',
    'Run the song on the date you set.',
    'Send clear proof: screenshot, recording or link.',
    'You get paid after your proof is approved.',
    'Can''t do it? Decline fast. The artist gets a refund.',
    'Fake proof means you''re removed from Tracka.'],
  allow_custom  boolean not null default false,
  updated_at    timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.categories (
  key      text primary key,
  name     text not null,
  grp      text not null check (grp in ('promotion', 'creative')),
  is_open  boolean not null default false,
  sort     int not null default 0
);
insert into public.categories (key, name, grp, is_open, sort) values
  ('radio', 'Radio', 'promotion', true, 1),
  ('tv', 'TV', 'promotion', true, 2),
  ('tiktok', 'TikTok', 'promotion', true, 3),
  ('youtube', 'YouTube', 'promotion', true, 4),
  ('blog', 'Blog', 'promotion', true, 5),
  ('influencer', 'Influencer', 'promotion', true, 6),
  ('dj', 'DJ', 'promotion', true, 7),
  ('merch', 'Merch & clothing', 'creative', false, 8),
  ('design', 'Design', 'creative', false, 9),
  ('video', 'Video', 'creative', false, 10),
  ('photo', 'Photo', 'creative', false, 11),
  ('other', 'Other', 'creative', false, 99);

-- ---------- 3. People ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  phone        text,
  email        text,
  notify       text[] not null default '{sms}' check (notify <@ array['sms', 'whatsapp', 'email']::text[]),
  photo_path   text,                       -- bucket "faces" (public)
  avatar       jsonb,
  use_avatar   boolean not null default false,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.sellers (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid unique references public.profiles(id) on delete set null,  -- null = added in person, not logged in yet
  contact_phone    text,                   -- links the account when they log in with this phone
  name             text not null check (char_length(name) between 2 and 60),
  category         text not null references public.categories(key),
  custom_category  text check (custom_category is null or char_length(custom_category) <= 30),
  price            int not null check (price > 0),
  included         text not null default '',
  delivery_days    int check (delivery_days between 1 and 60),
  location         text not null default '',
  description      text not null default '',
  genres           text[] not null default '{}',
  pages            text[] not null default '{}',
  status           public.seller_status not null default 'pending',
  id_checked       boolean not null default false,
  verified_at      timestamptz,
  terms_accepted_at timestamptz not null default now(),
  cal_days         int[] not null default '{0,1,2,3,4,5}',   -- 0 = Monday … 6 = Sunday
  cal_capacity     int not null default 2 check (cal_capacity between 1 and 20),
  added_by_admin   boolean not null default false,
  created_at       timestamptz not null default now()
);
create index sellers_status_idx on public.sellers (status, category);

create table public.seller_private (            -- ONLY the seller and the Tracka team can read this
  seller_id       uuid primary key references public.sellers(id) on delete cascade,
  momo            text not null,
  legal_name      text,
  id_type         public.id_kind,
  id_number       text,
  id_image_path   text,                        -- bucket "ids" (private)
  selfie_path     text,
  updated_at      timestamptz not null default now(),
  check (id_type is distinct from 'nid' or id_number ~ '^[0-9]{16}$')
);

create table public.seller_works (               -- the CV: videos of past work
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references public.sellers(id) on delete cascade,
  url        text not null check (url ~* '^https?://'),
  caption    text not null default '',
  created_at timestamptz not null default now()
);

create table public.seller_days_off (
  seller_id  uuid not null references public.sellers(id) on delete cascade,
  day        date not null,
  primary key (seller_id, day)
);

-- ---------- 4. Campaigns, bookings, proof ----------
create table public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 120),
  genre         text not null default '',
  link          text check (link is null or link = '' or link ~* '^https?://'),
  song_path     text,                         -- bucket "songs" (private)
  song_version  int not null default 1,
  status        public.campaign_status not null default 'draft',
  fix_reason    text,
  momo_txn      text,
  pay_phone     text,
  fee_percent   numeric(5,2) not null default 0,
  paid_at       timestamptz,
  reviewed_at   timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index campaigns_artist_idx on public.campaigns (artist_id, created_at desc);
create index campaigns_status_idx on public.campaigns (status);

create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  seller_id       uuid not null references public.sellers(id),
  price           int not null check (price > 0),       -- copied from the seller when booked
  want_date       date,
  run_date        date,
  due_date        date,
  status          public.booking_status not null default 'pending_payment',
  accepted_at     timestamptz,
  scheduled_at    timestamptz,
  live_at         timestamptz,
  proof_at        timestamptz,
  approved_at     timestamptz,
  paid_out_at     timestamptz,
  closed_at       timestamptz,
  problem         text,
  refund_sent_at  timestamptz,
  rating          int check (rating between 1 and 5),
  review          text,
  rated_at        timestamptz,
  reminded_accept boolean not null default false,
  reminded_due    boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (campaign_id, seller_id)
);
create index bookings_seller_idx on public.bookings (seller_id, status);
create index bookings_status_idx on public.bookings (status);

create table public.proofs (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  kind        text not null default 'proof' check (kind in ('proof', 'reply')),
  image_path  text,                              -- bucket "proofs" (private)
  video_path  text,
  link        text check (link is null or link ~* '^https?://'),
  note        text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  check (image_path is not null or video_path is not null or link is not null or note is not null)
);
create index proofs_booking_idx on public.proofs (booking_id, created_at);

create table public.tips (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null unique references public.bookings(id) on delete cascade,
  amount        int not null check (amount >= 500),
  momo_txn      text not null,
  status        public.tip_status not null default 'submitted',
  created_at    timestamptz not null default now(),
  confirmed_at  timestamptz,
  sent_at       timestamptz
);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  text        text not null,
  href        text not null default '',
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.money_events (               -- every MoMo movement, for your accounting
  id           uuid primary key default gen_random_uuid(),
  kind         public.money_kind not null,
  amount       int not null check (amount > 0),
  campaign_id  uuid references public.campaigns(id) on delete set null,
  booking_id   uuid references public.bookings(id) on delete set null,
  ref          text,                              -- MoMo transaction ID
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- ---------- 5. Helpers (run as the database owner, so they can see through privacy rules) ----------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create function public.my_seller_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.sellers where profile_id = auth.uid()
$$;

create function public.campaign_artist(p_campaign uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select artist_id from public.campaigns where id = p_campaign
$$;

create function public.seller_sees_campaign(p_campaign uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b join public.sellers s on s.id = b.seller_id
    where b.campaign_id = p_campaign and s.profile_id = auth.uid() and b.status <> 'pending_payment')
$$;

create function public.booking_artist(p_booking uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select c.artist_id from public.bookings b join public.campaigns c on c.id = b.campaign_id where b.id = p_booking
$$;

create function public.booking_seller_profile(p_booking uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select s.profile_id from public.bookings b join public.sellers s on s.id = b.seller_id where b.id = p_booking
$$;

create function public.booking_is_public(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings where id = p_booking and status in ('approved', 'paid_out'))
$$;

create function public.notify(p_user uuid, p_text text, p_href text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, text, href) values (p_user, p_text, coalesce(p_href, ''));
end $$;

create function public.notify_admins(p_text text, p_href text default '') returns void
language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, text, href)
  select id, p_text, coalesce(p_href, '') from public.profiles where is_admin
$$;

create function public.try_uuid(p text) returns uuid language sql immutable as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end
$$;

create function public.q(p text) returns text language sql immutable as $$ select '“' || coalesce(p, 'a song') || '”' $$;

-- ---------- 6. Automatic rules (triggers) ----------
-- New login → profile; and link a seller that the team added in person with the same phone.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email) values (new.id, new.phone, new.email) on conflict (id) do nothing;
  if new.phone is not null then
    update public.sellers set profile_id = new.id
    where profile_id is null and right(regexp_replace(contact_phone, '[^0-9]', '', 'g'), 9) = right(regexp_replace(new.phone, '[^0-9]', '', 'g'), 9);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody can make themselves admin.
create function public.protect_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null and not public.is_admin() then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- Sellers can't verify themselves; new sign-ups always start as "pending".
create function public.protect_seller() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.verified_at := null; new.id_checked := false; new.added_by_admin := false;
    if not exists (select 1 from public.categories where key = new.category and (is_open or (key = 'other' and (select allow_custom from public.settings)))) then
      raise exception 'This service is not open yet';
    end if;
  else
    new.status := old.status; new.verified_at := old.verified_at; new.id_checked := old.id_checked;
    new.added_by_admin := old.added_by_admin; new.profile_id := old.profile_id;
  end if;
  return new;
end $$;
create trigger sellers_protect before insert or update on public.sellers
  for each row execute function public.protect_seller();

-- Booking price always comes from the seller (nobody can change it in their browser).
create function public.booking_defaults() returns trigger
language plpgsql set search_path = public as $$
declare v_price int;
begin
  select price into v_price from public.sellers where id = new.seller_id and status = 'verified';
  if v_price is null then raise exception 'This seller is not available'; end if;
  new.price := v_price; new.status := 'pending_payment';
  return new;
end $$;
create trigger bookings_defaults before insert on public.bookings
  for each row execute function public.booking_defaults();

-- ---------- 7. Privacy rules (Row Level Security) ----------
alter table public.settings        enable row level security;
alter table public.categories      enable row level security;
alter table public.profiles        enable row level security;
alter table public.sellers         enable row level security;
alter table public.seller_private  enable row level security;
alter table public.seller_works    enable row level security;
alter table public.seller_days_off enable row level security;
alter table public.campaigns       enable row level security;
alter table public.bookings        enable row level security;
alter table public.proofs          enable row level security;
alter table public.tips            enable row level security;
alter table public.notifications   enable row level security;
alter table public.money_events    enable row level security;

create policy "settings: everyone reads"  on public.settings   for select using (true);
create policy "settings: admin edits"     on public.settings   for update using (public.is_admin()) with check (public.is_admin());
create policy "categories: everyone reads" on public.categories for select using (true);
create policy "categories: admin edits"    on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "profiles: me or admin"   on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: I edit mine"   on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "sellers: public sees verified" on public.sellers for select using (status = 'verified' or profile_id = auth.uid() or public.is_admin());
create policy "sellers: I sign up"            on public.sellers for insert with check (profile_id = auth.uid() or public.is_admin());
create policy "sellers: I edit mine"          on public.sellers for update using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());

create policy "private: me or admin" on public.seller_private for select using (seller_id = public.my_seller_id() or public.is_admin());
create policy "private: I add mine"  on public.seller_private for insert with check (seller_id = public.my_seller_id() or public.is_admin());
create policy "private: I edit mine" on public.seller_private for update using (seller_id = public.my_seller_id() or public.is_admin()) with check (seller_id = public.my_seller_id() or public.is_admin());

create policy "works: everyone reads" on public.seller_works for select using (true);
create policy "works: I manage mine"  on public.seller_works for all using (seller_id = public.my_seller_id() or public.is_admin()) with check (seller_id = public.my_seller_id() or public.is_admin());
create policy "days off: everyone reads" on public.seller_days_off for select using (true);
create policy "days off: I manage mine"  on public.seller_days_off for all using (seller_id = public.my_seller_id() or public.is_admin()) with check (seller_id = public.my_seller_id() or public.is_admin());

create policy "campaigns: artist, their sellers, admin" on public.campaigns for select
  using (artist_id = auth.uid() or public.is_admin() or public.seller_sees_campaign(id));
create policy "campaigns: artist creates drafts" on public.campaigns for insert
  with check (artist_id = auth.uid() and status = 'draft');
create policy "campaigns: artist edits drafts" on public.campaigns for update
  using (artist_id = auth.uid() and status = 'draft') with check (artist_id = auth.uid() and status = 'draft');
create policy "campaigns: artist deletes drafts" on public.campaigns for delete
  using (artist_id = auth.uid() and status = 'draft');

create policy "bookings: artist, seller, admin" on public.bookings for select
  using (public.is_admin() or public.campaign_artist(campaign_id) = auth.uid()
         or (seller_id = public.my_seller_id() and status <> 'pending_payment'));
create policy "bookings: artist adds to draft" on public.bookings for insert
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.artist_id = auth.uid() and c.status = 'draft'));
create policy "bookings: artist changes date in draft" on public.bookings for update
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.artist_id = auth.uid() and c.status = 'draft'))
  with check (exists (select 1 from public.campaigns c where c.id = campaign_id and c.artist_id = auth.uid() and c.status = 'draft') and status = 'pending_payment');
create policy "bookings: artist removes from draft" on public.bookings for delete
  using (exists (select 1 from public.campaigns c where c.id = campaign_id and c.artist_id = auth.uid() and c.status = 'draft'));

create policy "proofs: the two sides, admin, or finished work" on public.proofs for select
  using (public.is_admin() or public.booking_artist(booking_id) = auth.uid()
         or public.booking_seller_profile(booking_id) = auth.uid()
         or (kind = 'proof' and public.booking_is_public(booking_id)));
create policy "tips: the two sides or admin" on public.tips for select
  using (public.is_admin() or public.booking_artist(booking_id) = auth.uid() or public.booking_seller_profile(booking_id) = auth.uid());
create policy "notifications: mine" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: I mark read" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "money: admin only" on public.money_events for select using (public.is_admin());

-- Public, safe views (only the columns that are OK to show)
create view public.public_profiles as
  select id, display_name, photo_path, avatar, use_avatar from public.profiles;

create view public.seller_stats as
  select s.id as seller_id,
         count(b.id) filter (where b.status in ('approved', 'paid_out')) as jobs_done,
         round(avg(b.rating)::numeric, 2) as avg_rating,
         count(b.rating) as reviews,
         case when count(b.id) filter (where b.status in ('approved', 'paid_out')) = 0 then null
              else round(100.0 * count(b.id) filter (where b.status in ('approved', 'paid_out')
                     and (b.due_date is null or b.proof_at is null or b.proof_at::date <= b.due_date))
                   / count(b.id) filter (where b.status in ('approved', 'paid_out'))) end as on_time_pct,
         count(b.id) filter (where b.status = 'refunded' and b.problem is not null) as lost_problems
  from public.sellers s left join public.bookings b on b.seller_id = s.id
  group by s.id;

create view public.seller_reviews as
  select b.seller_id, b.rating, b.review, b.rated_at, c.title, p.display_name as artist_name, p.photo_path, p.avatar, p.use_avatar
  from public.bookings b join public.campaigns c on c.id = b.campaign_id join public.profiles p on p.id = c.artist_id
  where b.rating is not null;

create view public.seller_finished_work as
  select b.seller_id, b.id as booking_id, b.run_date, c.title, pr.image_path, pr.video_path, pr.link
  from public.bookings b join public.campaigns c on c.id = b.campaign_id
  join public.proofs pr on pr.booking_id = b.id and pr.kind = 'proof'
  where b.status in ('approved', 'paid_out');

create view public.booked_days as            -- for calendars: how many songs a seller has on a day
  select seller_id, coalesce(run_date, want_date) as day, count(*) as n
  from public.bookings
  where status not in ('declined', 'refunded') and coalesce(run_date, want_date) is not null
  group by seller_id, coalesce(run_date, want_date);

grant select on public.public_profiles, public.seller_stats, public.seller_reviews, public.seller_finished_work, public.booked_days to anon, authenticated;

-- ---------- 8. The road: every step is a function that checks WHO is allowed ----------
create function public.maybe_complete(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.campaigns where id = p_campaign and status in ('active', 'review', 'changes'))
     and not exists (select 1 from public.bookings where campaign_id = p_campaign
                     and status in ('pending_payment', 'booked', 'scheduled', 'live', 'proof_submitted', 'disputed', 'approved')) then
    update public.campaigns set status = 'completed', completed_at = now() where id = p_campaign;
    perform public.notify(public.campaign_artist(p_campaign),
      public.q((select title from public.campaigns where id = p_campaign)) || ' finished its road. Rate your promoters!', '/artist/c/' || p_campaign);
  end if;
end $$;

-- ARTIST
create function public.submit_payment(p_campaign uuid, p_txn text, p_phone text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  if c.id is null or c.artist_id is distinct from auth.uid() then raise exception 'Not your campaign'; end if;
  if c.status <> 'draft' then raise exception 'Already paid'; end if;
  if not exists (select 1 from public.bookings where campaign_id = p_campaign) then raise exception 'Pick at least one promoter'; end if;
  if coalesce(c.song_path, '') = '' and coalesce(c.link, '') = '' then raise exception 'Add your song first'; end if;
  if coalesce(trim(p_txn), '') = '' then raise exception 'Type the transaction ID'; end if;
  update public.campaigns set status = 'payment_submitted', momo_txn = trim(p_txn), pay_phone = p_phone,
         fee_percent = (select fee_percent from public.settings) where id = p_campaign;
  perform public.notify_admins('New payment to check: ' || public.q(c.title), '/admin/payments');
end $$;

create function public.send_new_version(p_campaign uuid, p_song_path text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns;
begin
  select * into c from public.campaigns where id = p_campaign for update;
  if c.id is null or c.artist_id is distinct from auth.uid() then raise exception 'Not your campaign'; end if;
  if c.status <> 'changes' then raise exception 'No new version was asked for'; end if;
  if p_song_path is not null and split_part(p_song_path, '/', 1) is distinct from auth.uid()::text then raise exception 'Wrong file'; end if;
  update public.campaigns set status = 'review', fix_reason = null, song_version = song_version + 1,
         song_path = coalesce(p_song_path, song_path), link = coalesce(nullif(p_link, ''), link) where id = p_campaign;
  perform public.notify_admins('New version to listen to: ' || public.q(c.title), '/admin/songs');
end $$;

create function public.approve_result(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or public.booking_artist(p_booking) is distinct from auth.uid() then raise exception 'Not your booking'; end if;
  if b.status <> 'proof_submitted' then raise exception 'Nothing to approve'; end if;
  update public.bookings set status = 'approved', approved_at = now() where id = p_booking;
  perform public.notify(public.booking_seller_profile(p_booking), 'Your proof was approved. Payment is coming.', '/seller');
  perform public.notify_admins('Ready to pay: ' || (select name from public.sellers where id = b.seller_id), '/admin/payouts');
end $$;

create function public.report_problem(p_booking uuid, p_why text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or public.booking_artist(p_booking) is distinct from auth.uid() then raise exception 'Not your booking'; end if;
  if b.status <> 'proof_submitted' then raise exception 'You can report a problem after the proof arrives'; end if;
  if coalesce(trim(p_why), '') = '' then raise exception 'Tell us what went wrong'; end if;
  update public.bookings set status = 'disputed', problem = trim(p_why) where id = p_booking;
  perform public.notify(public.booking_seller_profile(p_booking), 'The artist reported a problem. You can answer.', '/seller');
  perform public.notify_admins('Problem reported on a booking', '/admin/proofs');
end $$;

create function public.rate_booking(p_booking uuid, p_stars int, p_review text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or public.booking_artist(p_booking) is distinct from auth.uid() then raise exception 'Not your booking'; end if;
  if b.status not in ('approved', 'paid_out') then raise exception 'You can rate after the job is done'; end if;
  if b.rating is not null then raise exception 'Already rated'; end if;
  if p_stars not between 1 and 5 then raise exception 'Pick 1 to 5 stars'; end if;
  update public.bookings set rating = p_stars, review = nullif(trim(p_review), ''), rated_at = now() where id = p_booking;
  perform public.notify(public.booking_seller_profile(p_booking), 'New review: ' || repeat('★', p_stars), '/seller');
end $$;

create function public.submit_tip(p_booking uuid, p_amount int, p_txn text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null or public.booking_artist(p_booking) is distinct from auth.uid() then raise exception 'Not your booking'; end if;
  if b.status not in ('approved', 'paid_out') then raise exception 'Tips come after the job is done'; end if;
  insert into public.tips (booking_id, amount, momo_txn) values (p_booking, p_amount, trim(p_txn));
  perform public.notify_admins('Tip to check: ' || p_amount || ' RWF', '/admin/payments');
end $$;

-- SELLER
create function public.accept_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status <> 'booked' or b.accepted_at is not null then raise exception 'Nothing to accept'; end if;
  update public.bookings set accepted_at = now() where id = p_booking;
  perform public.notify(public.booking_artist(p_booking), (select name from public.sellers where id = b.seller_id) || ' accepted your song. ✅', '/artist/c/' || b.campaign_id);
end $$;

create function public.decline_booking(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status not in ('booked', 'scheduled') then raise exception 'Too late to decline'; end if;
  update public.bookings set status = 'declined', closed_at = now() where id = p_booking;
  perform public.notify(public.booking_artist(p_booking), (select name from public.sellers where id = b.seller_id) || ' declined. ' || b.price || ' RWF comes back to you.', '/artist/c/' || b.campaign_id);
  perform public.notify_admins('Refund needed: ' || b.price || ' RWF', '/admin/payouts');
  perform public.maybe_complete(b.campaign_id);
end $$;

create function public.schedule_booking(p_booking uuid, p_date date) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings; s public.sellers; n int;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status <> 'booked' or b.accepted_at is null then raise exception 'Accept the booking first'; end if;
  if p_date < current_date then raise exception 'Pick a date from today'; end if;
  select * into s from public.sellers where id = b.seller_id;
  select count(*) into n from public.bookings where seller_id = b.seller_id and run_date = p_date and status not in ('declined', 'refunded');
  if n >= s.cal_capacity then raise exception 'That day is full'; end if;
  update public.bookings set status = 'scheduled', run_date = p_date, scheduled_at = now() where id = p_booking;
  perform public.notify(public.booking_artist(p_booking), s.name || ' set the date: ' || to_char(p_date, 'Dy DD Mon') || '.', '/artist/c/' || b.campaign_id);
end $$;

create function public.mark_live(p_booking uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status <> 'scheduled' then raise exception 'Set the date first'; end if;
  update public.bookings set status = 'live', live_at = now() where id = p_booking;
  perform public.notify(public.booking_artist(p_booking), 'Your song is out now! 🎶', '/artist/c/' || b.campaign_id);
end $$;

create function public.submit_proof(p_booking uuid, p_image text, p_video text, p_link text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status not in ('scheduled', 'live') then raise exception 'Not ready for proof'; end if;
  if p_image is null and p_video is null and coalesce(p_link, '') = '' then raise exception 'Add a screenshot, a video or a link'; end if;
  if (p_image is not null and split_part(p_image, '/', 1) is distinct from auth.uid()::text)
     or (p_video is not null and split_part(p_video, '/', 1) is distinct from auth.uid()::text) then raise exception 'Wrong file'; end if;
  insert into public.proofs (booking_id, kind, image_path, video_path, link, note, created_by)
  values (p_booking, 'proof', p_image, p_video, nullif(p_link, ''), nullif(p_note, ''), auth.uid());
  update public.bookings set status = 'proof_submitted', proof_at = now() where id = p_booking;
  perform public.notify(public.booking_artist(p_booking), 'Result arrived: see the screenshot or video.', '/artist/c/' || b.campaign_id);
  perform public.notify_admins('Proof to check', '/admin/proofs');
end $$;

create function public.reply_problem(p_booking uuid, p_note text, p_image text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking;
  if b.id is null or b.seller_id is distinct from public.my_seller_id() then raise exception 'Not your booking'; end if;
  if b.status <> 'disputed' then raise exception 'There is no problem to answer'; end if;
  if p_image is not null and split_part(p_image, '/', 1) is distinct from auth.uid()::text then raise exception 'Wrong file'; end if;
  insert into public.proofs (booking_id, kind, image_path, note, created_by) values (p_booking, 'reply', p_image, p_note, auth.uid());
  perform public.notify_admins('A seller answered a problem', '/admin/proofs');
end $$;

-- ADMIN
create function public.require_admin() returns void language plpgsql stable security definer set search_path = public as $$
begin if not public.is_admin() then raise exception 'Admins only'; end if; end $$;

create function public.admin_confirm_payment(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; total int;
begin
  perform public.require_admin();
  select * into c from public.campaigns where id = p_campaign for update;
  if c.status <> 'payment_submitted' then raise exception 'No payment waiting'; end if;
  select coalesce(sum(price), 0) into total from public.bookings where campaign_id = p_campaign;
  update public.campaigns set status = 'review', paid_at = now() where id = p_campaign;
  insert into public.money_events (kind, amount, campaign_id, ref, created_by)
  values ('artist_payment', total + round(total * c.fee_percent / 100)::int, p_campaign, c.momo_txn, auth.uid());
  perform public.notify(c.artist_id, 'Payment confirmed ✓ Our team is listening to ' || public.q(c.title) || ' now.', '/artist/c/' || p_campaign);
end $$;

create function public.admin_reject_payment(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns;
begin
  perform public.require_admin();
  update public.campaigns set status = 'draft', momo_txn = null where id = p_campaign and status = 'payment_submitted' returning * into c;
  if c.id is null then raise exception 'No payment waiting'; end if;
  perform public.notify(c.artist_id, 'We couldn''t find your payment for ' || public.q(c.title) || '. Check and pay again.', '/artist/c/' || p_campaign);
end $$;

create function public.admin_approve_song(p_campaign uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns; r record;
begin
  perform public.require_admin();
  update public.campaigns set status = 'active', reviewed_at = now() where id = p_campaign and status = 'review' returning * into c;
  if c.id is null then raise exception 'No song waiting'; end if;
  update public.bookings b set status = 'booked', due_date = current_date + coalesce(s.delivery_days, 7)
  from public.sellers s where s.id = b.seller_id and b.campaign_id = p_campaign and b.status = 'pending_payment';
  perform public.notify(c.artist_id, public.q(c.title) || ' is approved! It''s on its way to your promoters. 🚀', '/artist/c/' || p_campaign);
  for r in select s.profile_id, b.price from public.bookings b join public.sellers s on s.id = b.seller_id where b.campaign_id = p_campaign loop
    perform public.notify(r.profile_id, 'New booking: ' || public.q(c.title) || ' · ' || r.price || ' RWF. Accept within 48 hours.', '/seller');
  end loop;
end $$;

create function public.admin_request_changes(p_campaign uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.campaigns;
begin
  perform public.require_admin();
  if coalesce(trim(p_reason), '') = '' then raise exception 'Tell the artist what to change'; end if;
  update public.campaigns set status = 'changes', fix_reason = trim(p_reason) where id = p_campaign and status = 'review' returning * into c;
  if c.id is null then raise exception 'No song waiting'; end if;
  perform public.notify(c.artist_id, 'Please send a new version of ' || public.q(c.title) || ': “' || c.fix_reason || '”', '/artist/c/' || p_campaign);
end $$;

create function public.admin_decide(p_booking uuid, p_action text) returns void   -- approve | send_back | release | refund
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  perform public.require_admin();
  select * into b from public.bookings where id = p_booking for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  if p_action = 'approve' and b.status = 'proof_submitted' then
    update public.bookings set status = 'approved', approved_at = now() where id = p_booking;
    perform public.notify(public.booking_seller_profile(p_booking), 'Your proof was approved. Payment is coming.', '/seller');
  elsif p_action = 'send_back' and b.status = 'proof_submitted' then
    update public.bookings set status = 'live', proof_at = null where id = p_booking;
    perform public.notify(public.booking_seller_profile(p_booking), 'Your proof was sent back. Please send a clearer one.', '/seller');
  elsif p_action = 'release' and b.status = 'disputed' then
    update public.bookings set status = 'approved', approved_at = now() where id = p_booking;
    perform public.notify(public.booking_artist(p_booking), 'We checked the problem and released the payment to the seller.', '/artist/c/' || b.campaign_id);
    perform public.notify(public.booking_seller_profile(p_booking), 'Good news: the payment was released to you.', '/seller');
  elsif p_action = 'refund' and b.status in ('pending_payment', 'booked', 'scheduled', 'live', 'proof_submitted', 'disputed') then
    update public.bookings set status = 'refunded', closed_at = now() where id = p_booking;
    perform public.notify(public.booking_artist(p_booking), 'A refund of ' || b.price || ' RWF is on its way.', '/artist/c/' || b.campaign_id);
    perform public.notify(public.booking_seller_profile(p_booking), 'A booking was cancelled.', '/seller');
    perform public.maybe_complete(b.campaign_id);
  else
    raise exception 'That action is not possible now';
  end if;
end $$;

create function public.admin_mark_paid(p_booking uuid, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  perform public.require_admin();
  update public.bookings set status = 'paid_out', paid_out_at = now() where id = p_booking and status = 'approved' returning * into b;
  if b.id is null then raise exception 'Nothing to pay'; end if;
  insert into public.money_events (kind, amount, campaign_id, booking_id, ref, created_by) values ('seller_payout', b.price, b.campaign_id, b.id, p_ref, auth.uid());
  perform public.notify(public.booking_seller_profile(p_booking), 'Paid! ' || b.price || ' RWF sent to your MoMo.', '/seller/money');
  perform public.notify(public.booking_artist(p_booking), 'Done! Your receipt is ready.', '/artist/c/' || b.campaign_id || '/receipt');
  perform public.maybe_complete(b.campaign_id);
end $$;

create function public.admin_mark_refund_sent(p_booking uuid, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  perform public.require_admin();
  update public.bookings set refund_sent_at = now() where id = p_booking and status in ('declined', 'refunded') and refund_sent_at is null returning * into b;
  if b.id is null then raise exception 'No refund waiting'; end if;
  insert into public.money_events (kind, amount, campaign_id, booking_id, ref, created_by) values ('refund', b.price, b.campaign_id, b.id, p_ref, auth.uid());
  perform public.notify(public.booking_artist(p_booking), 'Refund sent: ' || b.price || ' RWF went to your MoMo.', '/artist/c/' || b.campaign_id || '/receipt');
end $$;

create function public.admin_tip(p_tip uuid, p_action text, p_ref text default null) returns void   -- confirm | reject | sent
language plpgsql security definer set search_path = public as $$
declare t public.tips; b public.bookings;
begin
  perform public.require_admin();
  select * into t from public.tips where id = p_tip for update;
  if t.id is null then raise exception 'Tip not found'; end if;
  select * into b from public.bookings where id = t.booking_id;
  if p_action = 'confirm' and t.status = 'submitted' then
    update public.tips set status = 'confirmed', confirmed_at = now() where id = p_tip;
    insert into public.money_events (kind, amount, booking_id, ref, created_by) values ('tip_in', t.amount, t.booking_id, t.momo_txn, auth.uid());
  elsif p_action = 'reject' and t.status = 'submitted' then
    delete from public.tips where id = p_tip;
    perform public.notify(public.booking_artist(t.booking_id), 'We couldn''t find your tip payment. You can try again.', '/artist/c/' || b.campaign_id);
  elsif p_action = 'sent' and t.status = 'confirmed' then
    update public.tips set status = 'sent', sent_at = now() where id = p_tip;
    insert into public.money_events (kind, amount, booking_id, ref, created_by) values ('tip_out', t.amount, t.booking_id, p_ref, auth.uid());
    perform public.notify(public.booking_seller_profile(t.booking_id), 'You got a tip of ' || t.amount || ' RWF! 🎁', '/seller/money');
    perform public.notify(public.booking_artist(t.booking_id), 'Your tip reached the seller. Thank you!', '/artist/c/' || b.campaign_id);
  else
    raise exception 'That action is not possible now';
  end if;
end $$;

create function public.admin_set_seller_status(p_seller uuid, p_status public.seller_status) returns void
language plpgsql security definer set search_path = public as $$
declare s public.sellers;
begin
  perform public.require_admin();
  update public.sellers set status = p_status,
         verified_at = case when p_status = 'verified' then coalesce(verified_at, now()) else verified_at end,
         id_checked = case when p_status = 'verified' then exists (select 1 from public.seller_private where seller_id = p_seller and id_number is not null) else id_checked end
  where id = p_seller returning * into s;
  if s.id is null then raise exception 'Seller not found'; end if;
  perform public.notify(s.profile_id, case p_status when 'verified' then 'You''re verified! Artists can book you now.'
                                                    when 'rejected' then 'Not approved yet. Improve your profile and try again.'
                                                    when 'suspended' then 'Your account is suspended. Contact Tracka.'
                                                    else 'Your account was updated.' end, '/seller');
end $$;

-- ---------- 9. Reminders (run every hour with pg_cron — see the setup guide) ----------
create function public.run_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select b.id, s.profile_id from public.bookings b join public.sellers s on s.id = b.seller_id
           join public.campaigns c on c.id = b.campaign_id
           where b.status = 'booked' and b.accepted_at is null and not b.reminded_accept and c.reviewed_at < now() - interval '24 hours' loop
    perform public.notify(r.profile_id, 'Reminder: accept your booking today, or it will be cancelled.', '/seller');
    update public.bookings set reminded_accept = true where id = r.id;
  end loop;
  for r in select b.id, s.profile_id, b.due_date from public.bookings b join public.sellers s on s.id = b.seller_id
           where b.status in ('booked', 'scheduled', 'live') and not b.reminded_due and b.due_date <= current_date + 1 loop
    perform public.notify(r.profile_id, 'Reminder: your proof is due ' || to_char(r.due_date, 'Dy DD Mon') || '.', '/seller');
    update public.bookings set reminded_due = true where id = r.id;
  end loop;
end $$;

-- Lists for the admin "Submissions" page
create view public.admin_late as
  select b.*, case when b.accepted_at is null then 'no_accept' else 'no_proof' end as reason
  from public.bookings b join public.campaigns c on c.id = b.campaign_id
  where public.is_admin() and (
        (b.status = 'booked' and b.accepted_at is null and c.reviewed_at < now() - interval '48 hours')
     or (b.status in ('booked', 'scheduled', 'live') and b.due_date < current_date));
grant select on public.admin_late to authenticated;

-- ---------- 10. Who may call what ----------
revoke execute on function public.notify(uuid, text, text), public.notify_admins(text, text), public.maybe_complete(uuid), public.run_reminders() from public, anon, authenticated;
revoke execute on function public.submit_payment(uuid, text, text), public.send_new_version(uuid, text, text), public.approve_result(uuid), public.report_problem(uuid, text),
  public.rate_booking(uuid, int, text), public.submit_tip(uuid, int, text), public.accept_booking(uuid), public.decline_booking(uuid), public.schedule_booking(uuid, date),
  public.mark_live(uuid), public.submit_proof(uuid, text, text, text, text), public.reply_problem(uuid, text, text), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid),
  public.admin_approve_song(uuid), public.admin_request_changes(uuid, text), public.admin_decide(uuid, text), public.admin_mark_paid(uuid, text), public.admin_mark_refund_sent(uuid, text),
  public.admin_tip(uuid, text, text), public.admin_set_seller_status(uuid, public.seller_status) from public, anon;
grant execute on function public.submit_payment(uuid, text, text), public.send_new_version(uuid, text, text), public.approve_result(uuid), public.report_problem(uuid, text),
  public.rate_booking(uuid, int, text), public.submit_tip(uuid, int, text), public.accept_booking(uuid), public.decline_booking(uuid), public.schedule_booking(uuid, date),
  public.mark_live(uuid), public.submit_proof(uuid, text, text, text, text), public.reply_problem(uuid, text, text), public.admin_confirm_payment(uuid), public.admin_reject_payment(uuid),
  public.admin_approve_song(uuid), public.admin_request_changes(uuid, text), public.admin_decide(uuid, text), public.admin_mark_paid(uuid, text), public.admin_mark_refund_sent(uuid, text),
  public.admin_tip(uuid, text, text), public.admin_set_seller_status(uuid, public.seller_status) to authenticated;

-- ---------- 11. File storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('songs',  'songs',  false, 31457280,  array['audio/*']),
  ('proofs', 'proofs', false, 104857600, array['image/*', 'video/*']),
  ('ids',    'ids',    false, 10485760,  array['image/*']),
  ('faces',  'faces',  true,  5242880,   array['image/*'])
on conflict (id) do nothing;

-- Every file lives in a folder named after the person who uploaded it: <user id>/...
create policy "songs: artist uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'songs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "songs: artist, their sellers, admin listen" on storage.objects for select to authenticated
  using (bucket_id = 'songs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()
         or public.seller_sees_campaign(public.try_uuid((storage.foldername(name))[2]))));

create policy "proofs: seller uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "proofs: both sides, admin, or finished work" on storage.objects for select
  using (bucket_id = 'proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()
         or public.booking_artist(public.try_uuid((storage.foldername(name))[2])) = auth.uid()
         or public.booking_is_public(public.try_uuid((storage.foldername(name))[2]))));

create policy "ids: I upload mine" on storage.objects for insert to authenticated
  with check (bucket_id = 'ids' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "ids: me or admin" on storage.objects for select to authenticated
  using (bucket_id = 'ids' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create policy "faces: I upload mine" on storage.objects for insert to authenticated
  with check (bucket_id = 'faces' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "faces: I replace mine" on storage.objects for update to authenticated
  using (bucket_id = 'faces' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 12. Live notifications ----------
alter publication supabase_realtime add table public.notifications;

-- Done! Next: make yourself admin (see the setup guide).
