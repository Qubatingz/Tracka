\set ON_ERROR_STOP 1
create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create or replace function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$ begin if not coalesce(c,false) then raise exception 'FAILED: %', msg; end if; raise notice 'ok  %', msg; end $$;
create or replace function pg_temp.fails(sql text, msg text) returns void language plpgsql as $$
begin begin execute sql; exception when others then raise notice 'ok  % (blocked: %)', msg, sqlerrm; return; end; raise exception 'FAILED: % (was not blocked)', msg; end $$;
-- people: admin A, real artist R, real promoter P
insert into auth.users (id, phone) values ('aaaaaaaa-0000-0000-0000-00000000000a', '250788000003'), ('bbbbbbbb-0000-0000-0000-00000000000b', '250788000001'), ('cccccccc-0000-0000-0000-00000000000c', '250788000002');
update profiles set is_admin = true where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set role authenticated; select pg_temp.as_user('cccccccc-0000-0000-0000-00000000000c');
insert into sellers (profile_id, name, category, price) values ('cccccccc-0000-0000-0000-00000000000c', 'Real Radio', 'radio', 10000);
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
select admin_set_seller_status((select id from sellers where name = 'Real Radio'), 'verified');
create temp table ex as select (select id from sellers where name = 'Umucyo Wave Radio') s1, (select id from sellers where name = 'DJ Ikirere') s2,
  (select id from sellers where name = 'Real Radio') real, (select id from seller_packages where seller_id = (select id from sellers where name = 'Umucyo Wave Radio') and plays = 3) pk;
grant select on ex to authenticated;
-- 1. a real artist books example promoters in a practice campaign
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-00000000000b');
insert into campaigns (artist_id, title, song_path) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'My Practice Song', 'b/song.mp3');
insert into bookings (campaign_id, seller_id, package_id, want_dates) select (select id from campaigns where title = 'My Practice Song'), s1, pk, array[current_date + 3, current_date + 5]::date[] from ex;
insert into bookings (campaign_id, seller_id) select (select id from campaigns where title = 'My Practice Song'), s2 from ex;
select pg_temp.ok((select count(*) = 2 and sum(price) = 45000 from bookings where campaign_id = (select id from campaigns where title = 'My Practice Song')), 'real artist can book example promoters (package price kept)');
select pg_temp.ok(is_practice((select id from campaigns where title = 'My Practice Song')), 'it is a practice campaign');
select pg_temp.fails($$insert into bookings (campaign_id, seller_id) select (select id from campaigns where title = 'My Practice Song'), real from ex$$, 'no real promoter inside a practice campaign');
insert into campaigns (artist_id, title, song_path) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'My Real Song', 'b/real.mp3');
insert into bookings (campaign_id, seller_id) select (select id from campaigns where title = 'My Real Song'), real from ex;
select pg_temp.fails($$insert into bookings (campaign_id, seller_id) select (select id from campaigns where title = 'My Real Song'), s1 from ex$$, 'no example promoter inside a real campaign');
-- 2. practice payment and song check
select submit_payment((select id from campaigns where title = 'My Practice Song'), 'PRACTICE', '');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
select admin_confirm_payment((select id from campaigns where title = 'My Practice Song'));
reset role; select pg_temp.ok((select count(*) = 0 from money_events), 'practice payment is not in the money records'); set role authenticated;
select admin_approve_song((select id from campaigns where title = 'My Practice Song'));
-- 3. the admin plays the promoters
select pg_temp.fails($$select admin_practice_step((select b.id from bookings b join campaigns c on c.id = b.campaign_id where c.title = 'My Real Song'))$$, 'admin cannot fake steps for a real promoter');
select admin_practice_step(b.id) from bookings b join ex on b.seller_id = ex.s1 join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song';
select pg_temp.ok((select b.accepted_at is not null and b.status = 'booked' from bookings b join ex on b.seller_id = ex.s1 join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song'), 'step 1: accepted');
select admin_practice_step(b.id) from bookings b join ex on b.seller_id = ex.s1 join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song';
select pg_temp.ok((select b.status = 'scheduled' and b.run_dates = array[current_date, current_date + 3, current_date + 5]::date[] from bookings b join ex on b.seller_id = ex.s1 join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song'), 'step 2: 3 dates (the 2 the artist chose + 1 more)');
select admin_practice_all((select id from campaigns where title = 'My Practice Song')) as moved;
select admin_practice_all((select id from campaigns where title = 'My Practice Song')) as moved;
select admin_practice_all((select id from campaigns where title = 'My Practice Song')) as moved;
select admin_practice_all((select id from campaigns where title = 'My Practice Song')) as moved;
select pg_temp.ok((select bool_and(b.status = 'proof_submitted') from bookings b join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song'), '"move all" brought both promoters to proof');
-- 4. artist approves, rates; tips blocked; admin pays (no money record); campaign completes
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-00000000000b');
select approve_result(b.id) from bookings b join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song';
select rate_booking(b.id, 5, 'Practice went great') from bookings b join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song';
select pg_temp.fails($$select submit_tip((select b.id from bookings b join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song' limit 1), 2000, 'X1')$$, 'no real-money tips to example promoters');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
select admin_mark_paid(b.id, '') from bookings b join campaigns c on c.id = b.campaign_id where c.title = 'My Practice Song';
reset role;
select pg_temp.ok((select status = 'completed' from campaigns where title = 'My Practice Song'), 'practice campaign finished its road');
select pg_temp.ok((select count(*) = 0 from money_events), 'money records still empty after practice payouts');
select pg_temp.ok((select count(*) >= 8 from notifications where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'), 'artist got notified at every step');
-- 5. the real campaign still uses real money records
set role authenticated; select pg_temp.as_user('bbbbbbbb-0000-0000-0000-00000000000b');
select submit_payment((select id from campaigns where title = 'My Real Song'), 'MOMO123', '0788000001');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-00000000000a');
select admin_confirm_payment((select id from campaigns where title = 'My Real Song'));
reset role; select pg_temp.ok((select count(*) = 1 and sum(amount) >= 10000 from money_events where kind = 'artist_payment'), 'real payment is recorded'); set role authenticated;
-- 6. cleanup button removes examples + practice, keeps the real campaign
select remove_examples() as removed;
reset role;
select pg_temp.ok((select count(*) = 0 from campaigns where title = 'My Practice Song') and (select count(*) = 1 from campaigns where title = 'My Real Song') and (select count(*) = 1 from bookings) and (select count(*) = 1 from sellers), 'cleanup keeps real data, removes examples and practice');
\echo ALL PRACTICE TESTS PASSED
