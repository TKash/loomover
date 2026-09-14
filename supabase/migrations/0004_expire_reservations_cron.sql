-- Expire lapsed 48h reservations inside the database with pg_cron, every 15 minutes.
-- Replaces the hourly Vercel cron (Vercel Hobby only allows daily crons). The
-- /api/cron/expire-reservations route still works as a manual trigger with CRON_SECRET.
--
-- Apply by pasting into the Supabase SQL Editor. Safe to re-run.

create extension if not exists pg_cron;

create or replace function public.expire_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer;
begin
  -- Both data-modifying CTEs always execute, even though only "stale" is read below.
  with stale as (
    update claims
       set status = 'expired'
     where status = 'pending'
       and reserved_until < now()
    returning lot_id
  ), reverted as (
    update lots
       set status = 'available'
     where status = 'reserved'
       and id in (select lot_id from stale)
    returning id
  )
  select count(*) into expired_count from stale;

  return expired_count;
end;
$$;

-- security definer bypasses RLS, so nobody but the scheduler (postgres) may call it.
revoke all on function public.expire_stale_reservations() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-reservations';

select cron.schedule(
  'expire-reservations',
  '*/15 * * * *',
  $$select public.expire_stale_reservations()$$
);
