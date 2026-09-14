-- Public bucket for lot photos (both web uploads and WhatsApp-sourced photos land here)
insert into storage.buckets (id, name, public)
values ('lot-photos', 'lot-photos', true)
on conflict (id) do nothing;

-- Anyone authenticated can read (bucket is public anyway, this covers direct API reads)
create policy "lot_photos_public_read" on storage.objects
  for select using (bucket_id = 'lot-photos');

-- Authenticated users can upload their own photos via the web form
create policy "lot_photos_authenticated_insert" on storage.objects
  for insert with check (bucket_id = 'lot-photos' and auth.role() = 'authenticated');

-- Note: the WhatsApp webhook uploads via the service-role client, which bypasses
-- RLS entirely, so no separate policy is needed for that path.
