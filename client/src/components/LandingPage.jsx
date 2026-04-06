import { useEffect, useState } from 'react'
import logoImg from '../assets/logo.png'
import heroClip from '../assets/clipfly-ai-20260401175113.mp4'
import { Link } from 'react-router-dom'

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'About', href: '#about' },
]

const painPoints = [
  {
    icon: 'warning',
    title: 'No daily tracking',
    description: 'Tea and snacks are consumed daily, but records are missing or inconsistent.',
  },
  {
    icon: 'invoice',
    title: 'Confusing month-end bills',
    description: 'Vendors and teams struggle to verify usage and settle payments confidently.',
  },
  {
    icon: 'alert',
    title: 'Manual errors and disputes',
    description: 'Handwritten sheets and chats create mistakes that lead to avoidable disagreements.',
  },
]

const reasons = [
  {
    icon: 'shield',
    title: 'Transparent Tracking',
    description: 'Every cup and snack is recorded with a clear daily history by user and date.',
  },
  {
    icon: 'users',
    title: 'Role-Based Dashboards',
    description: 'Employees and vendors see exactly what they need with focused, fast screens.',
  },
  {
    icon: 'clock',
    title: 'Easy Daily Logging',
    description: 'Submit entries in seconds from mobile or desktop without complex forms.',
  },
  {
    icon: 'spark',
    title: 'Automated Billing',
    description: 'Monthly totals and costs are calculated automatically for fewer billing surprises.',
  },
]

const flowSteps = [
  'Employees log daily tea and snacks',
  'Vendor tracks supply and verifies records',
  'System generates monthly report and bill',
]

const featureGrid = [
  { icon: 'daily', title: 'Daily Entry Tracking', description: 'Capture tea, snacks, and extras every day.' },
  { icon: 'employee', title: 'Employee Dashboard', description: 'Personal history, summaries, and quick forms.' },
  { icon: 'vendor', title: 'Vendor Dashboard', description: 'View all entries, supply logs, and billing insights.' },
  { icon: 'report', title: 'Monthly Reports', description: 'Generate complete monthly consumption summaries.' },
  { icon: 'export', title: 'Export Data', description: 'Download CSV or PDF for accounting and audits.' },
  { icon: 'lock', title: 'Role-Based Access', description: 'Secure role checks for employee and vendor workflows.' },
]

const testimonials = [
  {
    company: 'Northline Tech',
    quote: 'We removed monthly billing confusion in less than a week after switching.',
    person: 'Ananya S., Office Admin',
  },
  {
    company: 'Pixelcraft Studio',
    quote: 'Simple enough for everyone to use, powerful enough for accurate reporting.',
    person: 'Rahul P., Operations Lead',
  },
  {
    company: 'Brightdesk Labs',
    quote: 'The vendor dashboard and export reports saved us hours each month.',
    person: 'Meera T., Finance Coordinator',
  },
]

function Icon({ type }) {
  const shared = 'h-5 w-5'

  const icons = {
    warning: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M12 3 2.7 19a1 1 0 0 0 .86 1.5h16.88a1 1 0 0 0 .86-1.5L12 3Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
      </svg>
    ),
    invoice: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-3-2V5a2 2 0 0 1 2-2Z" />
        <path d="M9 8h6M9 12h6" />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6" />
        <path d="M12 16h.01" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z" />
        <path d="m9.5 12 1.8 1.8 3.2-3.6" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="3" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a3 3 0 0 1 0 5.74" />
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
    spark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
        <path d="m5 17 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      </svg>
    ),
    daily: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
    employee: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <circle cx="12" cy="7" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </svg>
    ),
    vendor: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M3 7h18" />
        <path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M10 12h4" />
      </svg>
    ),
    report: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    ),
    export: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <rect x="4" y="17" width="16" height="4" rx="1" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={shared}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    ),
  }

  return icons[type] || null
}

function SectionTitle({ badge, title, subtitle, align = 'center' }) {
  const alignClass = align === 'left' ? 'text-left items-start' : 'text-center items-center'

  return (
    <div className={`mx-auto flex max-w-2xl flex-col gap-4 ${alignClass}`}>
      <span className="rounded-full bg-[#EFE6DD] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B5E3C]">
        {badge}
      </span>
      <h2 className="text-balance text-3xl font-bold tracking-tight text-[#3E2C23] sm:text-4xl">{title}</h2>
      <p className="text-pretty text-base leading-7 text-[#6F5E53]">{subtitle}</p>
    </div>
  )
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[#E3D8CE] bg-[rgba(247,243,239,0.9)] backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="#home"
          className="group flex items-center rounded-full border border-[#D8CFC6] bg-[#FFF9F2] p-1.5 pr-4 shadow-[0_18px_40px_-28px_rgba(62,44,35,0.85)] transition hover:border-[#C9B09B] hover:shadow-[0_22px_44px_-26px_rgba(62,44,35,0.95)]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top,_#fffdf8,_#efe6dd)] ring-1 ring-[#E3D8CE]">
            <img src={logoImg} alt="Aaj Ki Chai" className="h-8 w-auto object-contain" />
          </span>
          <span className="ml-3 hidden text-sm font-semibold tracking-[0.18em] text-[#5A3B2D] sm:block">
            AKC
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[#6F5E53] lg:flex">
          {navLinks.map((item) => (
            <a key={item.label} href={item.href} className="transition hover:text-[#8B5E3C]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="rounded-xl border border-[#8B5E3C] px-4 py-2 text-sm font-semibold text-[#8B5E3C] transition hover:bg-[#EFE6DD]"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(62,44,35,0.8)] transition hover:-translate-y-0.5 hover:bg-[#7A4F33]"
          >
            Signup
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#8B5E3C] text-[#8B5E3C] lg:hidden"
          aria-label="Toggle navigation"
        >
          <span className="text-xl">{menuOpen ? 'x' : '+'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-[#E3D8CE] bg-[#F7F3EF] px-4 py-4 lg:hidden">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-[#6F5E53] transition hover:bg-[#EFE6DD] hover:text-[#8B5E3C]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex gap-3">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-xl border border-[#8B5E3C] px-4 py-2 text-center text-sm font-semibold text-[#8B5E3C]"
              >
                Login
              </Link>
              <Link
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-xl bg-[#8B5E3C] px-4 py-2 text-center text-sm font-semibold text-white"
              >
                Signup
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function LandingPage() {
  useEffect(() => {
    const revealElements = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.2 },
    )

    revealElements.forEach((element) => observer.observe(element))

    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-[#F7F3EF] text-[#3E2C23]">
      <Navbar />

      <section id="home" className="relative overflow-hidden bg-[#F7F3EF]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[580px] bg-gradient-to-br from-[#F7F3EF] via-[#EFE6DD] to-transparent" />
        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-2 lg:px-8 lg:py-14">
          <div className="relative">
            
            <h1 className="text-balance text-4xl font-bold tracking-tight text-[#3E2C23] sm:text-5xl lg:text-6xl">
              Track Office Tea and Snacks Without Billing Confusion
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#6F5E53]">
              A simple system to log daily consumption, track supply, and generate accurate monthly bills for your office.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-xl bg-[#8B5E3C] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_-14px_rgba(62,44,35,0.7)] transition hover:-translate-y-0.5 hover:bg-[#7A4F33]"
              >
                Get Started
              </Link>
              <button className="rounded-xl border border-[#D08770] bg-[#F7F3EF] px-6 py-3 text-sm font-semibold text-[#8B5E3C] transition hover:border-[#8B5E3C] hover:text-[#7A4F33]">
                Live Demo
              </button>
            </div>

            
          </div>

          <div className="relative">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-[#D08770]/40 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-[#7A8F6B]/30 blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-[#D8CFC6] p-2 shadow-[0_30px_60px_-34px_rgba(62,44,35,0.65)] backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-white/10 to-transparent" />

              <div className="relative overflow-hidden rounded-3xl border border-[#E3D8CE]">
                <video
                  className="pointer-events-none aspect-[16/9] w-full select-none object-cover"
                  src={heroClip}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  controls={false}
                  disablePictureInPicture
                  controlsList="nodownload nofullscreen noplaybackrate noremoteplayback"
                  onContextMenu={(event) => event.preventDefault()}
                  aria-label="Aaj Ki Chai hero showcase video"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/12 via-transparent to-transparent" />
              </div>

             
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="bg-[#F7F3EF]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="reveal rounded-2xl border border-[#D8CFC6] bg-[#EFE6DD] p-8 shadow-sm sm:p-12">
          <SectionTitle
            badge="About Us"
            title="Built for clear office tea and snack accounting"
            subtitle="Aaj Ki Chai helps offices and vendors maintain transparent daily records, reduce manual billing mistakes, and close every month with confidence."
          />
        </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          badge="The Problem"
          title="Small daily gaps become big monthly confusion"
          subtitle="Without a shared system, teams lose clarity around usage, cost, and accountability."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {painPoints.map((item) => (
            <article
              key={item.title}
              className="reveal rounded-2xl border border-[#D8CFC6] bg-[#EFE6DD] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#B89B85] hover:shadow-lg"
            >
              <div className="inline-flex rounded-xl bg-[#F3E4DA] p-2 text-[#D08770]">
                <Icon type={item.icon} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#3E2C23]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6F5E53]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Why Us"
          title="Why Choose Aaj Ki Chai?"
          subtitle="A modern SaaS workflow designed for accuracy, transparency, and easy adoption."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {reasons.map((item) => (
            <article
              key={item.title}
              className="reveal rounded-2xl border border-[#D8CFC6] bg-[#EFE6DD] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#B89B85] hover:shadow-xl"
            >
              <div className="inline-flex rounded-xl bg-[#F7F3EF] p-2 text-[#8B5E3C]">
                <Icon type={item.icon} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#3E2C23]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6F5E53]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          badge="How It Works"
          title="Simple process, dependable results"
          subtitle="Three clear steps keep everyone aligned from daily logs to monthly billing."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {flowSteps.map((step, index) => (
            <div key={step} className="reveal relative">
              <div className="rounded-2xl border border-[#D8CFC6] bg-[#EFE6DD] p-6 shadow-sm transition hover:border-[#B89B85]">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#8B5E3C] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-[#6F5E53]">{step}</p>
              </div>
              {index !== flowSteps.length - 1 && (
                <div className="absolute top-1/2 -right-2 hidden h-[2px] w-4 bg-[#D08770] md:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Feature Showcase"
          title="Everything needed for tea and snack operations"
          subtitle="A clean toolkit for office admins, employees, and vendors."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureGrid.map((item) => (
            <article
              key={item.title}
              className="reveal rounded-2xl border border-[#D8CFC6] bg-[#EFE6DD] p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#B89B85] hover:shadow-lg"
            >
              <div className="inline-flex rounded-xl bg-[#F3E4DA] p-2 text-[#8B5E3C]">
                <Icon type={item.icon} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#3E2C23]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6F5E53]">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          badge="Testimonials"
          title="Trusted by teams that value clarity"
          subtitle="Teams use Aaj Ki Chai to reduce disputes and improve accountability."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.company} className="reveal rounded-2xl border border-[#D8CFC6] bg-[#EFE6DD] p-6 shadow-sm transition hover:border-[#B89B85]">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#8B5E3C] to-[#D08770]" />
                <div>
                  <p className="text-sm font-semibold text-[#3E2C23]">{item.company}</p>
                  <p className="text-xs text-[#6F5E53]">Verified Customer</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-[#6F5E53]">"{item.quote}"</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.08em] text-[#6F5E53]">{item.person}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="reveal rounded-3xl bg-gradient-to-r from-[#8B5E3C] to-[#D08770] px-8 py-12 text-center text-white shadow-xl shadow-[#8B5E3C]/30 sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start tracking today. No more billing surprises.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#F7F3EF] sm:text-base">
            Launch in minutes, align your team and vendor records, and close every month with confidence.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex rounded-xl bg-[#F7F3EF] px-6 py-3 text-sm font-semibold text-[#8B5E3C] transition hover:-translate-y-0.5 hover:bg-[#EFE6DD]"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#D8CFC6] bg-[#F7F3EF]">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6F5E53]">Product</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#6F5E53]">
              <li>Features</li>
              <li>Pricing</li>
              <li>Integrations</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6F5E53]">Company</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#6F5E53]">
              <li>About</li>
              <li>Careers</li>
              <li>Blog</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6F5E53]">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#6F5E53]">
              <li>support@smartteamanagement.com</li>
              <li>+91 90000 12345</li>
              <li>Mumbai, India</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6F5E53]">Social</h3>
            <ul className="mt-4 space-y-3 text-sm text-[#6F5E53]">
              <li>X / Twitter</li>
              <li>LinkedIn</li>
              <li>GitHub</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#D8CFC6] py-4 text-center text-xs text-[#6F5E53]">
          Copyright {new Date().getFullYear()} Aaj Ki Chai. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

