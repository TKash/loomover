-- profiles_select_own only let a user read their own row, but the feed/lot-detail
-- pages join lots -> profiles to show seller name/contact to OTHER users, and the
-- claim route reads the seller's whatsapp_number to send the notification. Both
-- need any authenticated user to be able to read basic profile fields, not just
-- their own row -- this is a B2B marketplace where identity is meant to be visible
-- to counterparties, not private data.
drop policy if exists "profiles_select_own" on profiles;

create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');
