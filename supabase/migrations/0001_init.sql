-- ============ ENUMS ============
create type user_role as enum ('seller', 'buyer', 'both');
create type lot_status as enum ('available', 'reserved', 'sold', 'expired');
create type lot_unit as enum ('meters', 'kg', 'pieces', 'yards', 'rolls');
create type claim_status as enum ('pending', 'confirmed', 'cancelled', 'expired');
create type draft_status as enum ('collecting', 'awaiting_confirmation', 'confirmed', 'abandoned');

-- ============ PROFILES ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  city text,
  whatsapp_number text unique,
  role user_role not null default 'both',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

-- ============ LOTS ============
create table lots (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,

  category text not null,
  spec text,
  quantity numeric not null check (quantity > 0),
  unit lot_unit not null,
  price_per_unit numeric not null check (price_per_unit > 0),
  currency text not null default 'INR',
  location text,
  notes text,
  urgency_note text,

  photo_urls text[] not null default '{}',

  status lot_status not null default 'available',
  source text not null default 'web' check (source in ('web', 'whatsapp')),

  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lots_status_idx on lots(status);
create index lots_category_idx on lots(category);
create index lots_seller_idx on lots(seller_id);

alter table lots enable row level security;

create policy "lots_select_all_authenticated" on lots
  for select using (auth.role() = 'authenticated');

create policy "lots_insert_own" on lots
  for insert with check (auth.uid() = seller_id);

create policy "lots_update_own" on lots
  for update using (auth.uid() = seller_id);

-- ============ CLAIMS ============
create table claims (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references lots(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,

  status claim_status not null default 'pending',
  reserved_until timestamptz not null,

  created_at timestamptz not null default now(),

  unique (lot_id, buyer_id)
);

create index claims_lot_idx on claims(lot_id);
create index claims_status_idx on claims(status);

-- Only one active (pending) claim per lot at a time -- the double-sell race guard
create unique index one_active_claim_per_lot
  on claims(lot_id) where status = 'pending';

alter table claims enable row level security;

create policy "claims_select_involved" on claims
  for select using (
    auth.uid() = buyer_id
    or auth.uid() in (select seller_id from lots where lots.id = claims.lot_id)
  );

create policy "claims_insert_own" on claims
  for insert with check (auth.uid() = buyer_id);

-- ============ WHATSAPP DRAFTS (conversation state) ============
-- No RLS policies granted on purpose: only the service-role client (webhook/cron) can
-- touch this table. WhatsApp senders have no Supabase session, so this must be
-- unreachable from the browser regardless of auth state.
create table pending_listing_drafts (
  id uuid primary key default gen_random_uuid(),
  whatsapp_number text not null,

  raw_messages jsonb not null default '[]',
  parsed_fields jsonb not null default '{}',
  missing_fields text[] not null default '{}',
  photo_urls text[] not null default '{}',

  status draft_status not null default 'collecting',
  last_bot_message text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_draft_per_number
  on pending_listing_drafts(whatsapp_number)
  where status in ('collecting', 'awaiting_confirmation');

create index drafts_number_idx on pending_listing_drafts(whatsapp_number);

alter table pending_listing_drafts enable row level security;

-- ============ updated_at triggers ============
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger lots_set_updated_at before update on lots
  for each row execute function set_updated_at();
create trigger drafts_set_updated_at before update on pending_listing_drafts
  for each row execute function set_updated_at();
