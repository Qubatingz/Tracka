-- Tracka patch 01: tell the admins when a new promoter signs up.
-- Run once: Supabase → SQL Editor → New query → paste → Run.
create or replace function public.notify_new_seller() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    perform public.notify_admins('New promoter to verify: ' || new.name, '/admin/promoters');
  end if;
  return new;
end $$;

drop trigger if exists sellers_notify_new on public.sellers;
create trigger sellers_notify_new after insert on public.sellers
  for each row execute function public.notify_new_seller();
