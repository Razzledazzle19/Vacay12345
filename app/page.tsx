import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">Vacay</span>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-400 hover:text-white transition"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-400">
            Built for Airbnb &amp; short-term rental hosts
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight text-white">
            The operating system for{' '}
            <span className="text-indigo-400">short-term rental cleaning</span>
          </h1>

          <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            Vacay connects hosts and cleaners in one place — schedule jobs,
            track status in real time, and keep every turnover running smoothly.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              Get started as a host
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition"
            >
              Join as a cleaner
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 bg-gray-900/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-indigo-400 mb-12">
            Everything you need
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
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Built for Airbnb hosts</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Manage multiple properties, keep a full job history, and share guidelines with your cleaning team — all in one dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <span className="font-semibold text-gray-400">Vacay</span>
          <span>© {new Date().getFullYear()} Vacay. All rights reserved.</span>
        </div>
      </footer>

    </div>
  )
}
