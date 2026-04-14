import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">Vacay</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition">
              Log in
            </Link>
            <Link href="/signup" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="flex items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400">
            Cleaning + Supplies — everything your rental needs
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight text-white">
            The all-in-one operations platform for{' '}
            <span className="text-indigo-400">short-term rentals</span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Vacay handles your cleaning schedules and keeps your properties stocked —
            toilet paper, towels, paper towels and more — delivered on a subscription
            so you never run out between guests.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">
              Get started as a host
            </Link>
            <Link href="/signup" className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition">
              Join as a cleaner
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 bg-gray-900/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-indigo-400 mb-12">
            Everything under one roof
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">

            <div className="rounded-2xl border border-white/10 bg-gray-900 p-8 hover:border-indigo-500/40 transition">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Assign jobs instantly</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Pick a property, choose a cleaner, set the date. Jobs are live in seconds — no back-and-forth needed.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gray-900 p-8 hover:border-indigo-500/40 transition">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Track status in real time</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                See every job move from pending to in progress to done — live updates so you always know where things stand.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gray-900 p-8 hover:border-indigo-500/40 transition">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Supplies on autopilot</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Subscribe and we keep your properties stocked — toilet paper, paper towels, bath and beach towels restocked between every stay.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-white mb-3">Simple, flat pricing</h2>
          <p className="text-center text-gray-400 mb-12">Everything you need to run a professional rental operation.</p>

          <div className="grid gap-6 sm:grid-cols-3">

            {/* Starter */}
            <div className="rounded-2xl border border-white/10 bg-gray-900 p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1">Starter</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">Free</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">For hosts just getting started.</p>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 flex-1">
                {['Up to 1 property', 'Unlimited cleaning jobs', 'Cleaner assignment', 'Job status tracking'].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block w-full rounded-xl border border-white/20 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10 transition">
                Get started free
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="rounded-2xl border border-indigo-500 bg-indigo-600/10 p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Most popular</span>
              </div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1">Pro</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">$49</span>
                  <span className="text-gray-400 mb-1">/mo</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">For active hosts who want it all.</p>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 flex-1">
                {[
                  'Up to 5 properties',
                  'Unlimited cleaning jobs',
                  'Unlimited toilet paper',
                  'Unlimited paper towels',
                  'Bath & beach towel service',
                  'Priority cleaner matching',
                  'Real-time job tracking',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block w-full rounded-xl bg-indigo-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20">
                Start Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border border-white/10 bg-gray-900 p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1">Enterprise</h3>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">$99</span>
                  <span className="text-gray-400 mb-1">/mo</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">For property managers at scale.</p>
              </div>
              <ul className="space-y-3 text-sm text-gray-300 flex-1">
                {[
                  'Unlimited properties',
                  'Everything in Pro',
                  'Dedicated account manager',
                  'Custom supply schedules',
                  'Bulk supply discounts',
                  'Admin dashboard',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-8 block w-full rounded-xl border border-white/20 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10 transition">
                Contact us
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-8 mt-auto">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-400">Vacay</span>
          <span>© {new Date().getFullYear()} Vacay. All rights reserved.</span>
        </div>
      </footer>

    </div>
  )
}
