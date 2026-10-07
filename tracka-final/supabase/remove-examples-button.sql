-- Turns on the "Remove example data" button (Control room → Settings).
-- Run ONCE: Supabase → SQL Editor → New query → paste → Run. If Supabase warns about "destructive" lines,
-- click Run anyway: nothing is removed now, only later when you press the button.

-- One button for the Tracka team: remove every example promoter, artist, song and booking,
-- and the practice campaigns that real accounts made with example promoters.
create or replace function public.remove_examples() returns text
language plpgsql security definer set search_path = public as $$
declare n_s int; n_a int; n_p int;
begin
  perform public.require_admin();
  select count(*) into n_s from public.sellers where is_example;
  select count(*) into n_a from public.profiles where is_example;
  -- practice campaigns of real accounts (only example promoters in them)
  with practice as (
    select c.id from public.campaigns c
    where not exists (select 1 from public.profiles p where p.id = c.artist_id and p.is_example)
      and exists (select 1 from public.bookings b join public.sellers s on s.id = b.seller_id where b.campaign_id = c.id and s.is_example)
      and not exists (select 1 from public.bookings b join public.sellers s on s.id = b.seller_id where b.campaign_id = c.id and not s.is_example))
  delete from public.campaigns where id in (select id from practice);
  get diagnostics n_p = row_count;
  delete from public.money_events where campaign_id in (select c.id from public.campaigns c join public.profiles p on p.id = c.artist_id where p.is_example);
  delete from public.campaigns where artist_id in (select id from public.profiles where is_example);
  delete from public.bookings where seller_id in (select id from public.sellers where is_example);
  delete from public.sellers where is_example;
  delete from auth.users where id in (select id from public.profiles where is_example);
  delete from public.profiles where is_example;
  return n_s || ' example promoters, ' || n_a || ' example artists and ' || n_p || ' practice campaigns removed.';
end $$;
revoke execute on function public.remove_examples() from public, anon;
grant execute on function public.remove_examples() to authenticated;

select 'Remove-examples button ready ✅' as result;
