import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PhoneSignupForm from '@/components/PhoneSignupForm'
import MarketingMotion from '@/components/MarketingMotion'
import StickyHeader from '@/components/StickyHeader'
import { Handshake, LockKeyhole, Timer } from 'lucide-react'

// Marketing page, ported from the Claude Design export "Loomover - Early Stage Site".
// Copy is kept to what the product actually does today: post a lot, buyers browse and claim it
// (48h reservation), and the two sides deal directly. WhatsApp listing is an optional extra,
// so it's mentioned once, not sold as the product. No payments, inspection or shipping.
// Animation hooks (data-hero, data-split, data-reveal, ...) are documented in MarketingMotion.

const ACCENT = 'text-[oklch(0.55_0.11_45)]'
const EYEBROW = 'font-plexmono text-xs tracking-[0.14em]'
const H2 = 'm-0 font-display text-[length:clamp(2.25rem,4vw,3.5rem)] font-normal leading-[1.05]'
const SECTION_Y = 'py-16 lg:py-24'

const DIFFERENCES = [
  {
    icon: Timer,
    title: 'List in minutes',
    body: "Category, spec, quantity, price and location, plus a few photos, and it's live.",
  },
  {
    icon: LockKeyhole,
    title: 'No double-selling',
    body: 'A claimed lot is held for that buyer for 48 hours, so two people never turn up for the same rolls.',
  },
  {
    icon: Handshake,
    title: 'The deal stays yours',
    body: 'When a buyer claims your lot, you get their contact. Price, payment and pickup are between you.',
  },
]

const EXAMPLE_LOTS = [
  {
    img: '/marketing/lot-cotton-jersey.jpg',
    alt: 'Undyed ecru cotton jersey',
    name: 'Cotton jersey, 180 GSM',
    price: '₹142/m',
    meta: ['4,200 m · Tirupur', 'Need to clear this month'],
    tag: 'AVAILABLE',
  },
  {
    img: '/marketing/lot-linen-twill.jpg',
    alt: 'Sage green linen twill',
    name: 'Linen twill, 240 GSM',
    price: '₹410/m',
    meta: ['1,860 m · Ludhiana', 'Export order overrun'],
    tag: 'AVAILABLE',
  },
  {
    img: '/marketing/lot-viscose-crepe.jpg',
    alt: 'Dusty rose viscose crepe',
    name: 'Viscose crepe, 110 GSM',
    price: '₹96/m',
    meta: ['1,100 m · Surat', 'Cancelled order'],
    tag: 'RESERVED 48H',
  },
]

const SELLING = [
  {
    title: 'Post the lot',
    body: 'Add the category, spec, quantity, price and location, with a few photos. Prefer WhatsApp? You can message the details to our bot instead.',
  },
  {
    title: 'A buyer claims it',
    body: "When someone's interested, the lot is held for them for 48 hours so it can't be sold twice.",
  },
  {
    title: 'Close the deal directly',
    body: "You get the buyer's contact straight away. Price, payment and pickup are between you two.",
  },
]

const BUYING = [
  {
    title: 'Browse by category and city',
    body: 'See lots as they are posted — cotton, polyester, denim, silk, wool, linen, yarn and blends.',
  },
  {
    title: 'Claim it before anyone else',
    body: "Tap I'm interested and the lot is held for you for 48 hours, so it isn't sold out from under you.",
  },
  {
    title: 'Talk to the seller directly',
    body: 'The seller gets your contact straight away. Agree the price, see the fabric and arrange pickup.',
  },
]

const CATEGORIES = ['Cotton', 'Polyester', 'Denim', 'Silk', 'Wool', 'Linen', 'Yarn']

const TICKER = [
  'Cotton',
  'Overruns',
  'Polyester',
  'Cancelled orders',
  'Denim',
  'End-of-roll stock',
  'Silk',
  'Discontinued colours',
  'Wool',
  'Linen',
  'Yarn',
]

const TRADE_FIT = [
  {
    title: 'Made for your phone',
    body: 'Post, browse and claim lots from your phone. Sign in with a one-time code, no password.',
  },
  {
    title: 'Find lots near you',
    body: 'Filter the feed by category and city to see what’s available where you buy.',
  },
  {
    title: 'Direct contact',
    body: 'Buyers and sellers talk to each other, so nothing gets lost passing through a chain of people.',
  },
  {
    title: 'Clear, complete listings',
    body: 'Every lot shows the same details — spec, quantity, price, location and photos — so buyers can decide fast.',
  },
]

const FAQ = [
  {
    q: 'What counts as surplus?',
    a: 'Overruns, cancelled orders, discontinued colours, end-of-roll stock — any fabric or yarn lot you want to clear.',
  },
  {
    q: 'How do I list a lot?',
    a: 'Sign in with your phone number, tap Post a lot, and add the category, spec, quantity, price, location and a few photos. If you prefer, you can send the details to our WhatsApp bot and confirm with YES.',
  },
  {
    q: 'What happens when someone claims my lot?',
    a: "It's reserved for that buyer for 48 hours, and we send you their contact so you can talk directly.",
  },
  {
    q: 'Does Loomover handle payment or delivery?',
    a: "No. Price, payment and pickup are agreed directly between buyer and seller. Loomover gets your lot in front of buyers and makes sure it isn't claimed twice.",
  },
  {
    q: 'Who can see my listings?',
    a: "Anyone signed in to Loomover can browse listings, along with the seller's name and company.",
  },
]

const FOOTER_COLUMNS = [
  {
    heading: 'MARKETPLACE',
    links: [
      { label: 'Browse stock', href: '/login' },
      { label: 'List surplus', href: '/login' },
      { label: 'How it works', href: '#how-it-works' },
    ],
  },
  {
    heading: 'ACCOUNT',
    links: [
      { label: 'Log in', href: '/login' },
      { label: 'Questions', href: '#faq' },
    ],
  },
]

// Sections run edge to edge (so background colours reach the viewport edges);
// this keeps their content at a readable width with padding that grows with the screen.
function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-16 ${className}`}>
      {children}
    </div>
  )
}

function Logo({ size }: { size: 'nav' | 'footer' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`rounded-full bg-[oklch(0.55_0.11_45)] ${size === 'nav' ? 'h-[26px] w-[26px]' : 'h-[22px] w-[22px]'}`}
      />
      <span className={`font-display tracking-[-0.01em] ${size === 'nav' ? 'text-[26px]' : 'text-[22px]'}`}>
        Loomover
      </span>
    </div>
  )
}

// A photo inside a clipped frame, on an oversized layer the scroll parallax can move
// without ever exposing the frame's background.
function ParallaxImage({ src, alt, lazy = true }: { src: string; alt: string; lazy?: boolean }) {
  return (
    <div data-parallax className="absolute inset-x-0 -top-[8%] h-[116%]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={lazy ? 'lazy' : undefined}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
    </div>
  )
}

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <div className="flex flex-col gap-[22px]">
      {steps.map((step, i) => (
        <div key={step.title} data-reveal className="flex gap-[18px]">
          <span className="font-display text-[30px] leading-none text-[#7A6F5C]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <strong className="mb-1.5 block text-lg font-semibold">{step.title}</strong>
            <span className="text-[15px] leading-relaxed text-[#4A4438]">{step.body}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/feed')

  return (
    <main className="flex-1 overflow-x-clip bg-[#F7F4EE] font-plex text-[#1E1B16]">
      <noscript>
        <style>{'[data-hero]{visibility:visible!important}'}</style>
      </noscript>
      <MarketingMotion>
        <StickyHeader>
          <Container className="flex items-center justify-between py-4 lg:py-5">
            <div data-hero="nav" className="flex w-full items-center justify-between">
              <Logo size="nav" />
              <nav className="hidden gap-[34px] text-[15px] text-[#4A4438] lg:flex">
                <a href="#listings" className="transition-opacity hover:opacity-70">Listings</a>
                <a href="#how-it-works" className="transition-opacity hover:opacity-70">How it works</a>
                <a href="#categories" className="transition-opacity hover:opacity-70">Categories</a>
                <a href="#faq" className="transition-opacity hover:opacity-70">Questions</a>
              </nav>
              <div className="flex items-center gap-3 sm:gap-4">
                <Link href="/login" className="text-[15px] text-[#4A4438] transition-opacity hover:opacity-70">
                  Log in
                </Link>
                <Link
                  href="/login"
                  className="rounded-full bg-[#1E1B16] px-4 py-2.5 text-[15px] text-[#F7F4EE] transition-opacity hover:opacity-70 sm:px-5 sm:py-[11px]"
                >
                  Get started
                </Link>
              </div>
            </div>
          </Container>
        </StickyHeader>

        <section>
          <Container className="grid gap-10 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16 lg:pb-24 lg:pt-10">
            <div className="max-w-[640px]">
              <div data-hero="eyebrow" className={`${EYEBROW} ${ACCENT} mb-[22px]`}>
                THE SURPLUS TEXTILE EXCHANGE
              </div>
              <h1
                data-hero="title"
                className="mb-6 font-display text-[length:clamp(3rem,6.4vw,6.5rem)] font-normal leading-[0.96] tracking-[-0.02em] [text-wrap:balance]"
              >
                Where surplus fabric finds its <em className={ACCENT}>next</em> buyer.
              </h1>
              <p
                data-hero="copy"
                className="mb-8 max-w-[480px] text-[length:clamp(1.0625rem,1.3vw,1.25rem)] leading-[1.55] text-[#4A4438]"
              >
                Post leftover fabric and yarn lots in minutes. Buyers browse by category and city,
                claim what they need, and deal with you directly.
              </p>
              <div data-hero="form">
                <PhoneSignupForm />
              </div>
            </div>
            <div
              data-hero="media"
              className="relative aspect-[4/3] overflow-hidden rounded-[18px] sm:aspect-[16/10] lg:aspect-[4/5]"
            >
              <div data-parallax className="absolute inset-x-0 -top-[8%] h-[116%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  data-hero-img
                  src="/marketing/hero-loom.jpg"
                  alt="Weaving loom running in a mill"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </Container>
        </section>

        <div
          aria-hidden="true"
          className="overflow-hidden border-y border-[rgba(30,27,22,0.1)] py-5 lg:py-6"
        >
          <div data-marquee className="flex w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {TICKER.map((word) => (
                  <span
                    key={word}
                    className="flex items-center whitespace-nowrap font-display text-[length:clamp(1.75rem,3vw,2.75rem)] leading-none"
                  >
                    <span className="px-6 lg:px-9">{word}</span>
                    <span className="h-2 w-2 rounded-full bg-[oklch(0.55_0.11_45)]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="bg-[#EDE7DA]">
          <Container className={`grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] ${SECTION_Y}`}>
            <div>
              <div className={`font-plexmono text-[11px] tracking-[0.12em] ${ACCENT} mb-3.5`}>
                BUILT FROM INSIDE THE TRADE
              </div>
              <div
                data-split
                className="max-w-[520px] text-[length:clamp(1.5rem,2.2vw,2rem)] font-semibold leading-[1.2] tracking-[-0.02em]"
              >
                Made with a surplus broker&apos;s 20+ years of deals behind it.
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {DIFFERENCES.map(({ icon: Icon, title, body }) => (
                <div key={title} data-reveal>
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F4EE] text-[oklch(0.55_0.11_45)] ring-1 ring-[rgba(30,27,22,0.08)]">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <strong className="mb-[5px] block text-[15px] font-semibold">{title}</strong>
                  <span className="text-sm leading-[1.55] text-[#4A4438]">{body}</span>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section id="listings">
          <Container className={SECTION_Y}>
            <div className="mb-[34px] flex flex-wrap items-end justify-between gap-4">
              <h2 data-split className={H2}>
                What a listing looks like
              </h2>
              <Link
                href="/login"
                className="border-b border-[rgba(30,27,22,0.25)] pb-0.5 text-[15px] transition-opacity hover:opacity-70"
              >
                Browse live lots
              </Link>
            </div>
            <div data-lot-grid className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {EXAMPLE_LOTS.map((lot, i) => (
                <div
                  key={lot.name}
                  data-lot-card
                  className={i === EXAMPLE_LOTS.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''}
                >
                  <div className="group h-full overflow-hidden rounded-2xl border border-[rgba(30,27,22,0.08)] bg-white shadow-[0_14px_36px_-24px_rgba(30,27,22,0.4)] transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_22px_45px_-22px_rgba(30,27,22,0.35)]">
                    <div className="relative h-[200px] overflow-hidden lg:h-[clamp(190px,17vw,260px)]">
                      <ParallaxImage src={lot.img} alt={lot.alt} />
                      <span className="absolute left-3 top-3 rounded-full bg-[#F7F4EE]/90 px-2.5 py-1 font-plexmono text-[10px] tracking-[0.1em] text-[#4A4438]">
                        EXAMPLE
                      </span>
                    </div>
                    <div data-lot-body className="p-[18px]">
                      <div className="mb-2.5 flex justify-between gap-3">
                        <strong className="text-[17px] font-semibold">{lot.name}</strong>
                        <span className="whitespace-nowrap font-plexmono text-[13px]">{lot.price}</span>
                      </div>
                      <div className="text-sm leading-relaxed text-[#6E6455]">
                        {lot.meta[0]}
                        <br />
                        {lot.meta[1]}
                      </div>
                      <div className="mt-3.5 flex font-plexmono text-[11px]">
                        <span className="rounded-full border border-[rgba(30,27,22,0.15)] px-2.5 py-[5px]">
                          {lot.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section id="how-it-works" className="bg-[#EDE7DA]">
          <Container className={SECTION_Y}>
            <h2 data-split className={`${H2} mb-11`}>
              How Loomover works
            </h2>
            <div className="grid gap-12 md:grid-cols-2 lg:gap-20">
              <div>
                <div data-reveal className={`${EYEBROW} ${ACCENT} mb-5`}>
                  IF YOU&apos;RE SELLING
                </div>
                <StepList steps={SELLING} />
              </div>
              <div>
                <div data-reveal className={`${EYEBROW} mb-5 text-[oklch(0.55_0.11_150)]`}>
                  IF YOU&apos;RE BUYING
                </div>
                <StepList steps={BUYING} />
              </div>
            </div>
          </Container>
        </section>

        <section id="categories">
          <Container className={SECTION_Y}>
            <div className="mb-[30px] flex flex-wrap items-end justify-between gap-4">
              <h2 data-split className={H2}>
                What you can list
              </h2>
              <span className="text-[15px] text-[#6E6455]">Fabric and yarn surplus of any kind</span>
            </div>
            {/* GSAP animates the wrapper divs, not the links: the page-wide link hover rule gives
                every <a> a CSS opacity transition, which would lag behind GSAP's per-frame opacity
                updates and make the reveal stutter. */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-[18px]">
              {CATEGORIES.map((cat) => (
                <div key={cat} data-reveal>
                  <Link
                    href="/login"
                    className="group flex h-full min-h-[120px] flex-col justify-between rounded-[14px] border border-[rgba(30,27,22,0.12)] p-5 transition-colors duration-300 hover:border-[rgba(30,27,22,0.3)] hover:bg-white lg:min-h-[140px]"
                  >
                    <span className="text-[19px] font-medium">{cat}</span>
                    <span className="flex items-center gap-1.5 font-plexmono text-xs text-[#6E6455]">
                      Browse lots
                      <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </span>
                  </Link>
                </div>
              ))}
              <div data-reveal>
                <Link
                  href="/login"
                  className="group flex h-full min-h-[120px] flex-col justify-between rounded-[14px] border border-[rgba(30,27,22,0.12)] bg-[#1E1B16] p-5 text-[#F7F4EE] transition-colors duration-300 hover:bg-[oklch(0.55_0.11_45)] lg:min-h-[140px]"
                >
                  <span className="text-[19px] font-medium">Blended or other?</span>
                  <span className="flex items-center gap-1.5 font-plexmono text-xs opacity-80">
                    List it anyway
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <section>
          <Container className="grid items-center gap-10 pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:pb-24">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] lg:aspect-square">
              <ParallaxImage src="/marketing/workshop.jpg" alt="Rolling fabric in a textile workshop" />
            </div>
            <div>
              <h2 data-split className={`${H2} mb-5`}>
                Built for how the trade already works
              </h2>
              <p data-reveal className="mb-[30px] max-w-[560px] text-lg leading-relaxed text-[#4A4438]">
                Surplus usually moves through phone calls, broker groups and word of mouth. Loomover
                gives every lot one clear listing, so it doesn&apos;t get lost along the way and two
                buyers don&apos;t chase the same rolls.
              </p>
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {TRADE_FIT.map((item) => (
                  <div key={item.title} data-reveal>
                    <strong className="mb-1.5 block text-base font-semibold">{item.title}</strong>
                    <span className="text-[15px] leading-relaxed text-[#6E6455]">{item.body}</span>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>

        <section id="faq" className="border-t border-[rgba(30,27,22,0.1)]">
          <Container className={`grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 ${SECTION_Y}`}>
            <h2 data-split className={H2}>
              Questions,
              <br />
              answered
            </h2>
            <div>
              {FAQ.map((item, i) => (
                <details
                  key={item.q}
                  data-reveal
                  open={i === 0}
                  className={`group border-t border-[rgba(30,27,22,0.14)] py-5 ${i === FAQ.length - 1 ? 'border-b' : ''}`}
                >
                  <summary className="flex cursor-pointer list-none justify-between gap-5 text-[length:clamp(1.0625rem,1.4vw,1.1875rem)] font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="text-xl leading-none text-[#6E6455] transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3.5 max-w-[640px] overflow-hidden text-base leading-relaxed text-[#4A4438]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Container>
        </section>

        <section data-banner className="bg-[oklch(0.55_0.11_45)] text-[#FDFBF7]">
          <Container className="flex flex-col justify-between gap-10 py-16 lg:flex-row lg:items-end lg:py-24">
            <h2
              data-split
              className="m-0 max-w-[680px] font-display text-[length:clamp(2.75rem,5.2vw,4.75rem)] font-normal leading-[1.02]"
            >
              Nothing woven should be burnt.
            </h2>
            <div data-reveal className="w-full max-w-[460px]">
              <PhoneSignupForm onDark />
            </div>
          </Container>
        </section>

        <footer>
          <Container className="grid grid-cols-2 gap-8 pt-12 md:grid-cols-[1.6fr_1fr_1fr]">
            <div data-reveal className="col-span-2 md:col-span-1">
              <div className="mb-3.5">
                <Logo size="footer" />
              </div>
              <div className="text-sm leading-relaxed text-[#6E6455]">
                The surplus textile exchange.
                <br />
                For mills, agents and buyers across India.
              </div>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading} data-reveal className="flex flex-col gap-2.5 text-sm text-[#4A4438]">
                <span className="font-plexmono text-[11px] tracking-[0.1em] text-[#6E6455]">{col.heading}</span>
                {col.links.map((link) =>
                  link.href.startsWith('#') ? (
                    <a key={link.label} href={link.href} className="transition-opacity hover:opacity-70">
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} href={link.href} className="transition-opacity hover:opacity-70">
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </Container>
          <Container className="pb-10 pt-10 text-[13px] text-[#6E6455]">© 2026 Loomover</Container>
        </footer>
      </MarketingMotion>
    </main>
  )
}
