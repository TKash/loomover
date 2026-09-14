# Surplus Textile Marketplace — Context for a Fresh Claude Code Session

This file exists so a new Claude Code session (this one, or on another machine) can
pick up this project without re-deriving everything from scratch. Read this fully
before making changes.

## 1. What this is

An "OLX for textile surplus" marketplace. The user's father has been a textile
surplus broker/agent for 20-30 years (helps buyers acquire excess fabric/yarn stock,
cancelled orders, deadstock from factories, works on commission). The surplus market
is disorganized despite real supply and demand. The father is the intended primary
operator (works relationships on the ground); the user is part-time, building the
tech.

Key product insight that shaped the whole design: **surplus behaves as a "push"
market, not a "pull" market.** Unlike general fabric trading (RFQ/request-driven),
a surplus lot exists right now, is time-sensitive, and goes to whoever claims it
first. This is an OLX/listings model, not a quote-request engine — hence "post a
lot" + "claim it" rather than RFQ/quote flows.

Go-to-market decisions (do not relitigate without reason): open signup (no
invite-gating), but word-of-mouth only distribution (not broad marketing) to avoid
an empty-marketplace cold start. Sellers self-serve their own listings — but since
target sellers (mill owners/brokers) are far more comfortable typing a WhatsApp
message than filling a web form, **a WhatsApp bot that parses free-text listing
messages via Claude is a first-class input channel**, parallel to the web form.

### MVP scope (explicitly OUT of scope, do not add without user asking)
Payments, in-app chat/negotiation, ratings/reviews, logistics integration,
AI-based supplier matching, analytics dashboards, admin panels.

### Core loop
1. Seller posts a lot (web form OR WhatsApp message to the bot).
2. Buyer browses feed, taps "I'm interested" → lot flips to `reserved` for 48h
   (`CLAIM_WINDOW_HOURS` in `lib/constants.ts`), preventing double-sale of a
   one-off lot.
3. Seller gets a WhatsApp notification with a `wa.me` deep link to the buyer.
   Negotiation and closing happen **off-platform on WhatsApp** — no in-app chat
   by design.

## 2. Tech stack

- **Next.js 16 (App Router, TypeScript), Turbopack.** This is genuinely Next 16,
  newer than most training data. The scaffold ships an `AGENTS.md` at the project
  root warning of this — **read `node_modules/next/dist/docs/` before assuming an
  API's behavior if something seems off.** In practice the App Router basics
  (async `params`, async `cookies()`, route handler conventions) matched Next 15
  behavior already known, so no major surprises were found — but don't assume that
  holds for parts of the framework not yet touched (e.g. "Cache Components" /
  `use cache` directive exists in this version and has not been used anywhere in
  this codebase yet).
- **No `src/` directory** — `app/`, `components/`, `lib/`, `types/` all sit at the
  project root directly (scaffolded with `--no-src-dir`).
- **Tailwind CSS v4** (`@import "tailwindcss"` + `@theme inline` in
  `app/globals.css` — not the v3 `tailwind.config.js` style).
- **Supabase**: Postgres + Auth (phone/SMS OTP) + Storage. Project name "Textile
  Surplus", project ref `awrqgizxeaaqzrezbbol`, org "Surplus" (free tier).
- **Twilio**: SMS (phone auth OTP, via a Twilio Messaging Service) and WhatsApp
  (Sandbox, for the bot). Currently a **trial account** — see Known Limitations.
- **Anthropic Claude API**, model `claude-haiku-4-5-20251001`, used server-side
  only (`lib/claude/extract-listing.ts`) to parse WhatsApp free text into
  structured listing fields via forced tool-use (not prose scraping).
- **Cloudflare quick tunnel (`cloudflared`)** — dev-only, exposes localhost:3000
  publicly so Twilio's webhook can reach it. Installed via `winget install
  Cloudflare.cloudflared`. No account needed (unlike ngrok, which now requires
  signup). **The tunnel URL is ephemeral and changes every time `cloudflared` is
  restarted** — see Section 7 for the restart procedure.
- Deployment target is **Vercel**, but **the app has not been deployed yet** —
  everything so far has been run and tested via `npm run dev` locally.

### Key npm dependencies
`next@16.2.12`, `react@19.2.4`, `@supabase/supabase-js`, `@supabase/ssr`,
`twilio`, `@anthropic-ai/sdk`, `zod`, `date-fns`, `tailwindcss@4`. No ORM
(deliberately — raw `@supabase/supabase-js` queries), no message queue, no
state-machine library. `next-env.d.ts` is scaffold boilerplate for TS route types.

## 3. Directory layout (everything under `surplus-marketplace/`)

```
app/
  (auth)/login/page.tsx          phone number entry, client component
  (auth)/verify/page.tsx         6-box auto-advancing OTP input, client component
  (auth)/onboarding/page.tsx     server component, redirects to /feed if profile exists
  (auth)/onboarding/OnboardingForm.tsx
  api/lots/route.ts              POST create a lot (web form path)
  api/lots/[id]/claim/route.ts   POST claim a lot
  api/whatsapp/webhook/route.ts  Twilio inbound webhook -- the WhatsApp bot's entire state machine
  api/cron/expire-reservations/route.ts   flips stale reserved lots back to available
  feed/page.tsx                  browse available lots, filters
  lots/new/page.tsx              post-a-lot page (renders LotForm)
  lots/[id]/page.tsx             lot detail page (seller card, claim button)
  my/listings/page.tsx           seller's own lots
  my/claims/page.tsx             buyer's claimed lots
  page.tsx                       PUBLIC marketing landing page (redirects logged-in users to /feed)
  layout.tsx                     root layout, renders <NavBar/> + children
  globals.css                    color tokens, light-mode only (dark mode explicitly removed)
components/
  NavBar.tsx                     server component, returns null if no user (so marketing page has no double-header)
  LotCard.tsx                    feed card
  LotFilters.tsx                 category/city filter bar, client component
  LotForm.tsx                    post-a-lot form, client component, sectioned (Photos / Material details / Pricing & location)
  PhotoUploader.tsx               client component, uploads to Supabase Storage, slotted grid UI
  ClaimButton.tsx                 client component, calls the claim API route
  StatusBadge.tsx                 pill badge, color-coded by lot status
lib/
  auth/actions.ts                 server actions: requestOtp, verifyOtp, completeOnboarding, signOut
  auth/guards.ts                  requireProfile() -- THE shared guard, see Section 6 bug #1
  supabase/server.ts               cookie-based client for Server Components/Route Handlers (respects RLS)
  supabase/client.ts               browser client (respects RLS)
  supabase/admin.ts                service-role client, BYPASSES RLS -- only for webhook/cron/claim-transition, never exposed to client bundle
  lots/queries.ts                  getFeed, getLotById, createLot, getMyListings, getMyClaims, claimLot, LotAlreadyClaimedError
  lots/schema.ts                   zod schema for the create-lot API body
  lots/types.ts                    TS types (Lot, LotWithSeller, LotInsert)
  claude/extract-listing.ts        Claude tool-use call, deterministic field-merge logic
  whatsapp/twilio.ts               sendWhatsAppMessage, validateTwilioSignature, downloadTwilioMedia
  whatsapp/parse-inbound.ts        parses Twilio's inbound webhook form-encoded params
  format.ts                        formatPrice, waLink (wa.me deep link builder)
  constants.ts                     CLAIM_WINDOW_HOURS=48, LOT_CATEGORIES, LOT_UNITS, MAX_LOT_PHOTOS=3
proxy.ts                          Next middleware equivalent in this version -- refreshes Supabase session cookie on every request except api/whatsapp, api/cron, static assets
supabase/migrations/
  0001_init.sql                   enums, profiles, lots, claims, pending_listing_drafts, RLS policies, updated_at triggers
  0002_storage.sql                lot-photos public bucket + storage policies
  0003_profiles_visibility.sql    widened profiles SELECT policy (see bug #3)
types/database.types.ts           Supabase-shape TS types (hand-shaped, not generated via CLI since no local Supabase CLI link was set up)
```

Note: `proxy.ts` at the project root is this Next.js version's equivalent of
`middleware.ts` — don't be confused if you go looking for `middleware.ts`, it
doesn't exist here.

## 4. Database schema (already applied to the live Supabase project)

Applied by pasting the migration SQL directly into the Supabase SQL Editor (no
Supabase CLI / local link was ever set up — there is no `supabase/config.toml`).
If schema changes are needed, either repeat that (SQL Editor) or set up the CLI
properly first.

```sql
-- enums
user_role: 'seller' | 'buyer' | 'both'
lot_status: 'available' | 'reserved' | 'sold' | 'expired'
lot_unit: 'meters' | 'kg' | 'pieces' | 'yards' | 'rolls'
claim_status: 'pending' | 'confirmed' | 'cancelled' | 'expired'
draft_status: 'collecting' | 'awaiting_confirmation' | 'confirmed' | 'abandoned'

profiles (id uuid PK references auth.users, full_name, company_name, city,
  whatsapp_number unique, role user_role default 'both', created_at)
  RLS: any authenticated user can SELECT any profile (see bug #3 -- this was
  widened from "own row only"). INSERT/UPDATE restricted to own row.

lots (id, seller_id -> profiles, category, spec, quantity, unit,
  price_per_unit, currency default 'INR', location, notes, urgency_note,
  photo_urls text[], status lot_status default 'available',
  source 'web'|'whatsapp' default 'web', expires_at, created_at, updated_at)
  RLS: SELECT for any authenticated user. INSERT/UPDATE restricted to
  auth.uid() = seller_id (see bug #2 -- claiming must bypass this via the
  admin client for the one specific reserved-flip transition).

claims (id, lot_id -> lots, buyer_id -> profiles, status claim_status
  default 'pending', reserved_until, created_at)
  UNIQUE (lot_id, buyer_id).
  PARTIAL UNIQUE INDEX one_active_claim_per_lot ON claims(lot_id)
  WHERE status = 'pending'  <-- the core double-claim race guard.
  RLS: SELECT if you're the buyer or the lot's seller. INSERT if buyer_id = auth.uid().

pending_listing_drafts (id, whatsapp_number text [NOT a user FK -- a WhatsApp
  sender may not have an account yet], raw_messages jsonb[], parsed_fields
  jsonb, missing_fields text[], photo_urls text[], status draft_status
  default 'collecting', last_bot_message, created_at, updated_at)
  PARTIAL UNIQUE INDEX one_active_draft_per_number ON
  pending_listing_drafts(whatsapp_number) WHERE status IN
  ('collecting','awaiting_confirmation').
  RLS enabled with NO policies granted -- only reachable via the service-role
  admin client (webhook), intentionally unreachable from the browser.

storage bucket: lot-photos (public=true). Public read policy + authenticated-insert
  policy for the web path; the WhatsApp bot path uploads via the admin client,
  which bypasses RLS entirely so needs no separate policy.
```

## 5. Environment variables

`.env.local` in `surplus-marketplace/` (values are set locally, NOT reproduced
here -- if continuing on a different machine, these need to be re-entered from
the original sources, or ask the user):

```
NEXT_PUBLIC_SUPABASE_URL          Supabase project Settings -> API
NEXT_PUBLIC_SUPABASE_ANON_KEY     Supabase "Publishable key" (new naming; not sensitive, safe to fetch/display)
SUPABASE_SERVICE_ROLE_KEY         Supabase "Secret key" (new naming) -- SENSITIVE, service-role, bypasses RLS
TWILIO_ACCOUNT_SID                Twilio Console dashboard -- not sensitive
TWILIO_AUTH_TOKEN                 Twilio Console dashboard -- SENSITIVE
TWILIO_WHATSAPP_NUMBER            format "whatsapp:+14155238886" (the shared Sandbox number)
ANTHROPIC_API_KEY                 console.anthropic.com -- SENSITIVE
NEXT_PUBLIC_APP_URL               currently the cloudflared tunnel URL in dev (changes on every tunnel restart!); should be the real domain in production
CRON_SECRET                       currently EMPTY -- not yet set, needed before the cron route is wired to an actual scheduler
```

Supabase's Phone auth provider is configured separately in the Supabase
dashboard (Authentication -> Sign In / Providers -> Phone), NOT via env vars in
this codebase: Enable Phone provider = on, SMS provider = Twilio, Account SID +
Auth Token (same as above) + **Twilio Message Service SID** (a Twilio
"Messaging Service" resource, NOT a raw phone number -- see Section 8). SMS OTP
Expiry was bumped from the 60s default to 300s.

**IMPORTANT credential-handling note for future sessions**: never scrape/print
live secret values (service-role key, Twilio Auth Token, Anthropic key) into
tool output or chat -- the harness has an automated classifier that blocks this
even when well-intentioned, and rightly so. If a secret needs to go into
`.env.local`, ask the user to paste it directly in chat (that satisfies "the
user named this credential themselves"), then write it to the file without
echoing it back out.

## 6. Real bugs found and fixed (read before assuming code is correct elsewhere)

These were found by actually exercising the app end-to-end in a browser, not by
code review. If something looks structurally similar elsewhere in the codebase,
it's worth checking for the same class of bug.

1. **Missing onboarding enforcement.** Pages originally checked only "is there
   a session" (`supabase.auth.getUser()`), not "does a `profiles` row exist."
   A user could reach `/feed` etc. without completing onboarding, then posting
   a lot or claiming one failed with an opaque Postgres foreign-key violation
   (`lots.seller_id` / `claims.buyer_id` both reference `profiles(id)`).
   **Fix**: `lib/auth/guards.ts` exports `requireProfile()`, used by every
   protected page instead of the old per-page inline `if (!user) redirect(...)`
   pattern. The two API routes (`api/lots`, `api/lots/[id]/claim`) additionally
   do their own profile-existence check and return a clean 403, since guards
   using `redirect()` don't make sense for JSON API routes.

2. **Claiming a lot was silently broken by RLS.** Claiming requires flipping
   *someone else's* lot row to `reserved`, but the `lots` UPDATE policy only
   allows `auth.uid() = seller_id`. The buyer's update was being silently
   blocked (RLS makes an unauthorized UPDATE affect 0 rows, not throw an
   error), which the code then misread as "someone else already claimed it"
   (`LotAlreadyClaimedError`). **Fix**: `claimLot()` in `lib/lots/queries.ts`
   now takes both the regular authenticated client (for the `claims` INSERT,
   which the buyer IS authorized to do) and the admin/service-role client (for
   the `lots` UPDATE specifically) -- the API route has already fully
   authorized this transition (auth checked, lot status checked, self-claim
   excluded) before calling it, so using the admin client here is the correct
   trusted-server-logic escape hatch, not a security hole.

3. **Sellers were invisible to buyers ("Seller: Unknown").** The `profiles`
   SELECT RLS policy originally only allowed `auth.uid() = id` (read your own
   row only). A buyer viewing another user's lot got nothing back from the
   `lots -> profiles` join, and the WhatsApp seller-notification lookup would
   have silently found no `whatsapp_number` either. **Fix**: migration
   `0003_profiles_visibility.sql` drops that policy and replaces it with
   `for select using (auth.role() = 'authenticated')` -- any authenticated
   user can read any profile. This is intentional for this product (B2B
   identity is meant to be visible to counterparties), not an oversight.

4. **Email magic-link auth was fundamentally the wrong choice, and also had a
   real bug.** Supabase's free/default email sender only ever sends a
   confirmation *link*, never an OTP code -- code-based OTP requires a custom
   email template, which itself requires custom SMTP (the dashboard explicitly
   blocks template editing without it). Separately, the app initially had no
   route to handle the magic-link click at all (no PKCE code-exchange
   handler), so clicking the link just bounced back to `/login`. A proper
   `/auth/callback` route handler was built (`exchangeCodeForSession`) as a
   real fix for that gap, but the whole approach was then abandoned in favor
   of phone auth (see Section 8) -- **the `app/auth/callback/route.ts` file was
   deleted** when that pivot happened. If email auth is ever reintroduced,
   that gap will need to be re-solved.

5. **Twilio trial-account SMS restrictions.** Trial accounts can only deliver
   SMS to phone numbers explicitly added as "Verified Caller IDs" in the
   Twilio console. A second test number got zero messages (no error surfaced
   to the app -- Supabase's `signInWithOtp` returned success either way) until
   it was verified there.

6. **No Indian numbers available on the Twilio trial**, and SMS to Indian
   numbers from a foreign number risks carrier filtering without DLT
   registration. Worked around with a US number + Twilio Messaging Service for
   the required "Message Service SID," relying on Caller-ID verification for
   test delivery. **This will not scale to real Indian users without either
   DLT registration or a different provider** -- flagged as a pre-production
   blocker, not solved.

7. **The WhatsApp webhook returned a raw 500 on any internal failure** (first
   observed when the Anthropic account ran out of credit), leaving the user
   with total silence on WhatsApp instead of any reply. **Fix**: the webhook's
   core dispatch is now wrapped in try/catch, always replying with a graceful
   "something went wrong, try again" message on failure (see
   `app/api/whatsapp/webhook/route.ts`).

## 7. Dev environment quirks specific to this machine/session

- **Node.js was not installed at session start** -- installed via
  `winget install OpenJS.NodeJS.LTS`. **Bash/PowerShell tool calls in this
  harness do NOT inherit updated PATH automatically after an install** -- each
  new shell process needs `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
  prepended (PowerShell) to see `node`/`npm`/`npx`. This was a recurring
  friction point; just always prepend it for PowerShell commands that need
  Node.
- **The parent directory is NOT a clean project root.**
  `C:\Users\tanma\OneDrive\Documents\Wurk\Claude Code\` contains an unrelated
  static site called "TORQ WARS" (`index.html`, `css/`, `js/`, `assets/`,
  `dev_server.py`) sitting alongside `surplus-marketplace/`. **Never touch
  those files** -- they are a different, pre-existing project.
- **The Browser pane's preview server needs a real restart (stop + start), not
  just a `preview_start` "reuse," whenever `.env.local` changes** -- Next.js
  only reads env vars at process start. A "reused, no new process started"
  response means stale env vars are still in memory.
- **The `cloudflared` tunnel is a separate long-running background process**
  from the Next dev server, started via `Bash` with `run_in_background: true`
  running `"/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --url
  http://localhost:3000` directly (not backgrounded with a trailing `&` inside
  the command string -- that orphans the child process when the wrapping shell
  exits; let the tool's own `run_in_background` do the backgrounding). Every
  time this tunnel restarts, it gets a **new random URL**
  (`https://<random-words>.trycloudflare.com`) -- after any tunnel restart,
  `NEXT_PUBLIC_APP_URL` in `.env.local` must be updated to match AND the
  Twilio WhatsApp Sandbox's "WHEN A MESSAGE COMES IN" webhook URL must be
  updated to `<new-tunnel-url>/api/whatsapp/webhook`, AND the Next dev server
  must be restarted to pick up the new env var. The tunnel was observed to die
  unexpectedly once already (received an external "terminated" signal,
  possibly from an unrelated process-group cleanup) -- don't assume it's still
  alive across a long gap without checking.
- **The Browser pane's browser session/cookies reset unpredictably** across
  `preview_start`/`preview_stop` cycles and especially across cross-origin
  navigation (e.g. navigating to `supabase.com` then back). Don't assume a
  login session persists; expect to re-authenticate (or ask the user to) after
  any gap.
- **Supabase SQL Editor UI quirks observed**: clicking "Run" sometimes needs a
  direct click rather than `Ctrl+Enter` (inconsistent); a destructive-looking
  query (DROP POLICY / DELETE / UPDATE) triggers a "Potential issue detected"
  confirmation modal that must be explicitly clicked through; the Monaco editor
  occasionally shows a stale "sticky scroll" rendering artifact after a large
  programmatic paste that looks alarming but is cosmetic only (the underlying
  document content is fine -- verify by running the query rather than trusting
  the visual).
- **Automated `computer.type` can outrun React's re-render** on fast
  multi-character input into JS-driven fields (observed on the 6-box OTP
  input: typing all 6 digits in one `type` call only landed the first
  character reliably; typing one character at a time worked correctly). Not a
  real app bug -- just a testing-tool speed artifact. If verifying similar
  auto-advancing/controlled inputs in the future, type one character at a time
  or paste-test instead.

## 8. The phone/WhatsApp auth pivot (why login looks the way it does)

Originally built with email OTP. Abandoned for the reasons in bug #4 above,
plus a product-fit argument: the target users (textile brokers/mill owners)
are WhatsApp/phone-first, not email-first, and phone auth reuses the same
Twilio account already needed for the bot. Switched to phone number + SMS OTP:

- Supabase Auth Phone provider enabled, Twilio selected, needs a **Twilio
  Messaging Service SID** (create one in Twilio Console -> Messaging ->
  Services, add a purchased number as its sender -- Supabase's integration
  wants a Messaging Service, not a raw number).
- `lib/auth/actions.ts`: `requestOtp`/`verifyOtp` rewritten around `phone`
  instead of `email`. `normalizePhone()` defaults bare 10-digit input to
  `+91`.
- Login page (`(auth)/login/page.tsx`): `type="tel"` input, placeholder
  `+919876543210`.
- Verify page (`(auth)/verify/page.tsx`): rewritten as a client component with
  6 separate single-character boxes, auto-advance on input, backspace-to-prior
  handling, and paste support (splits a pasted 6-digit string across all
  boxes) -- a hidden input carries the joined digits as the `token` field for
  the server action's `FormData`.
- Tested successfully end-to-end with two real phone numbers (seller + buyer).

If asked to add email as an alternative login method later: it's a real
option, but needs either custom SMTP configured in Supabase (to get an actual
OTP code instead of a link) or the `/auth/callback` PKCE handler rebuilt (was
deleted).

## 9. WhatsApp bot (`app/api/whatsapp/webhook/route.ts`) -- verified working end-to-end

Confirmed live: a WhatsApp message reading *"2000m cotton 120gsm surat range,
90 rs, need to clear by Friday"* sent to the Sandbox number was correctly
parsed by Claude (category=cotton, spec=120gsm, quantity=2000 meters,
price=₹90/meter, location=Surat, urgency="need to clear by Friday"), the bot
replied with a confirmation summary, and replying "YES" published a real `lots`
row with `source='whatsapp'` (verified via direct SQL query).

State machine, per inbound message:
1. Validate the Twilio signature header (`validateTwilioSignature`) --
   reject anything not genuinely from Twilio.
2. Look up an active draft (`status IN ('collecting','awaiting_confirmation')`)
   for the sender's WhatsApp number.
3. No draft + text -> `startNewDraft`: call Claude, compute missing required
   fields (`category`, `quantity`, `unit`, `price_per_unit` -- see
   `REQUIRED_LISTING_FIELDS` in `extract-listing.ts`), either ask for what's
   missing or move straight to `awaiting_confirmation` if nothing's missing.
4. Draft `collecting` + text -> `continueCollecting`: re-run Claude passing
   existing fields as context so it merges rather than starting over.
5. Draft `awaiting_confirmation` + text -> `handleAwaitingConfirmation`:
   `YES_PATTERN` (yes/y/confirm/correct/ok/okay) publishes the lot;
   `CANCEL_PATTERN` (cancel/stop/"no listing") abandons the draft; anything
   else is treated as a correction (re-extract, merge, ask to confirm again).
6. Photos (`NumMedia > 0`) can arrive on any message regardless of stage --
   downloaded from Twilio (`downloadTwilioMedia`, requires Basic Auth with the
   Account SID/Token since Twilio media URLs aren't public), re-uploaded to
   the `lot-photos` Storage bucket, capped at `MAX_LOT_PHOTOS`.
7. On confirmation (`publishDraft`), finds-or-creates a `profiles` row keyed
   by `whatsapp_number` (auto-provisioning a lightweight seller identity via
   `supabase.auth.admin.createUser({ phone: draft.whatsapp_number,
   phone_confirm: true })` if none exists yet), then inserts the `lots` row.
8. Whole dispatch wrapped in try/catch (bug #7 fix) -- any failure still gets
   a WhatsApp reply, never silence.

`lib/claude/extract-listing.ts`: uses Anthropic's tool-use with
`tool_choice: {type: 'tool', name: 'record_listing_fields'}` to force
structured JSON output rather than parsing prose. The merge logic (existing
field wins unless the new message explicitly mentions that field) is done
deterministically in TypeScript, not left to the model -- this is what makes
"actually it's 1800m not 2000" reliably override just the one field.

Claim -> WhatsApp notification: `app/api/lots/[id]/claim/route.ts` calls
`sendWhatsAppMessage` (in `lib/whatsapp/twilio.ts`) after a successful claim.
That function **catches its own errors internally** (logs, doesn't throw) so a
WhatsApp delivery failure never breaks the claim itself.

## 10. UI / visual design system

User explicitly rejected the scaffold's default dark-mode-follows-OS
appearance and asked for a light-only, more polished look, researched via the
**Mobbin MCP connector** (a community connector the user installed mid-session
-- needed a Claude Code restart before its tools appeared; tool names are
namespaced under a random server ID, found via `ToolSearch` once available).

Design tokens (`app/globals.css`): warm off-white background (`#faf8f5`),
white surface (`#ffffff`), warm near-black text (`#221c16`), terracotta/rust
accent (`#b5541f`, hover `#9a4419`) -- chosen to nod at the textile theme
rather than a generic SaaS blue. **The `@media (prefers-color-scheme: dark)`
override was deliberately removed** -- do not re-add it without the user
asking. Registered as Tailwind v4 theme colors via `@theme inline` so
`bg-accent`, `text-muted`, `border-border` etc. work as utility classes
directly.

Patterns borrowed from Mobbin research and where they show up:
- Nextdoor/Faire feed-card style (price as the dominant element, not buried in
  a sentence) -> `components/LotCard.tsx`.
- Depop/Faire seller-identity-as-its-own-card (not a buried table row) ->
  the seller block in `app/lots/[id]/page.tsx` (avatar-initials circle +
  name + "Seller" label).
- Etsy/Depop create-listing forms (photos-first, sectioned fields) ->
  `components/LotForm.tsx` (three sections: Photos / Material details /
  Pricing and location) and `components/PhotoUploader.tsx` (slotted grid with
  a dashed "+add photo" tile instead of a raw file input).
- Nextdoor/Shop/Clerk boxed-digit OTP inputs -> the verify page rewrite
  (Section 8).

Lots with no photo render a placeholder icon (inline SVG, not an external
icon library -- there is no icon package installed) rather than collapsing the
image slot, both on `LotCard` and the detail page.

## 11. Marketing landing page (`app/page.tsx`)

Previously this route was an unconditional `redirect('/feed')`. Rebuilt as a
public marketing page: checks `supabase.auth.getUser()`, redirects logged-in
visitors straight to `/feed`, otherwise renders the landing page (so
`NavBar.tsx`, which returns `null` when there's no user, doesn't double up
with the marketing page's own minimal header).

Researched via Mobbin (5 references: Faire, Airtasker, Clerk, Mercury, Whop --
user picked **Clerk and Mercury** as the direction). Structure: minimal header
(logo + "Sign in" link) -> Clerk-style bold two-line headline + subtext + dual
CTA buttons ("Open the app" / "See how it works" anchor-scroll) with a
Mercury-style static mockup of the actual feed-card design next to the copy
(`MockAppPreview` component, inlined in `page.tsx`, hand-built with Tailwind
divs mimicking real `LotCard` styling -- not a real screenshot file) ->
Airtasker-style numbered 3-step "How it works" section (Post a lot -> Buyers
claim it -> Close on WhatsApp) -> an honest credibility line ("Built on 20+
years of textile surplus trading experience... Surat, Panipat, Ludhiana")
**deliberately not fabricated stats or logos**, since there are none yet ->
closing CTA banner -> minimal footer. Verified live in the browser including
the CTA correctly routing to `/login`.

## 12. Current state / what's NOT done yet

- **Not deployed anywhere.** Vercel is the intended target; no Vercel project
  exists yet, no production env vars configured there.
- **Twilio is still a trial account.** SMS only reaches Caller-ID-verified
  numbers; the WhatsApp side is still the shared dev Sandbox (requires each
  new tester to send a "join <code>" message first) -- going to real outside
  users needs either an approved WhatsApp Business sender or accepting the
  Sandbox's join-code friction, and likely proper Indian SMS/DLT registration
  if phone-SMS-OTP is kept for production.
- **`CRON_SECRET` is empty and no scheduler is wired up** -- the
  `/api/cron/expire-reservations` route exists and works if called with the
  right Bearer token, but nothing calls it yet (no Vercel Cron config, no
  `vercel.json`).
- **No automated tests exist** -- everything has been verified by manual
  browser testing during this session, not by a test suite.
- `types/database.types.ts` was hand-shaped to match the schema, not generated
  via `supabase gen types typescript` (no local Supabase CLI link was set up)
  -- if the schema changes, this file needs manual updating too, or set up the
  CLI link properly first.
- Secondary pages (`my/listings`, `my/claims`) got baseline styling-token
  updates (colors/borders matched to the new palette) during the UI pass but
  were not redesigned as deeply as the feed/detail/form pages -- worth a
  second look if the user wants full visual consistency.
- Monetization was explicitly deferred (kept out of MVP scope per the original
  business-planning conversation) -- no billing/commission logic exists
  anywhere.

## 13. Commands

```bash
# from surplus-marketplace/
npm run dev          # start Next dev server (port 3000)
npx tsc --noEmit      # type-check (has been the primary correctness check all session -- keep using it after every change)
npx next typegen      # regenerate Next's route-type helpers if a route was added/removed and tsc complains about a stale reference
```

PowerShell note: prepend
`$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`
before any command needing `node`/`npm`/`npx` in a fresh shell tool call.

Starting the dev tunnel (dev-only, for WhatsApp webhook testing):
```bash
"/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --url http://localhost:3000
```
Then update `NEXT_PUBLIC_APP_URL` in `.env.local`, update the Twilio Sandbox
webhook URL, and restart the Next dev server (full stop+start, not "reuse").

## 14. If the user asks to continue building

Natural next steps, roughly in order of what would unblock real usage:
1. Deploy to Vercel, move env vars there, get a stable production
   `NEXT_PUBLIC_APP_URL` (removes the whole cloudflared-tunnel-URL-churn
   problem).
2. Decide the real WhatsApp sending path (approved Business sender vs. living
   with Sandbox friction) before inviting anyone outside this testing loop.
3. Wire the cron route to an actual scheduler (Vercel Cron + `vercel.json`)
   and set `CRON_SECRET`.
4. Address Indian SMS deliverability properly (DLT) if phone-OTP-via-Twilio-SMS
   stays the auth method for real Indian end users.
5. Optional: extend the light-theme visual pass to `my/listings`/`my/claims`
   for full consistency with the redesigned feed/detail/form pages.
