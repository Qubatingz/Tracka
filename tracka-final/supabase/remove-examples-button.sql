-- Turns on the "Remove example data" button (Control room → Settings).
-- Run ONCE: Supabase → SQL Editor → New query → paste → Run. If Supabase warns about "destructive" lines, click Run anyway:
-- they only run later, when you press the button.

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

select 'Remove-examples button ready ✅' as result;
