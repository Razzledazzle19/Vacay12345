'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job, Property } from '@/types/database'
import { useToast } from '@/components/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentSection {
  id: string
  type: 'announcement' | 'resource' | 'guideline'
  title: string
  body: string
  status: 'draft' | 'active'
  audience: string
}

interface JobWithProperty extends Job {
  property: Property | null
}

// ─── Stats config ─────────────────────────────────────────────────────────────
// Adding a new stat = add one object here. Nothing else changes.
const CLEANER_STATS: {
  label: string
  color: string
  fetch: (sb: SupabaseClient, userId: string) => Promise<number>
}[] = [
  {
    label: 'Assigned jobs',
    color: 'text-indigo-700',
    fetch: async (sb, userId) => {
      const { count } = await sb
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('cleaner_id', userId)
      return count ?? 0
    },
  },
  {
    label: 'Pending',
    color: 'text-amber-600',
    fetch: async (sb, userId) => {
      const { count } = await sb
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('cleaner_id', userId)
        .eq('status', 'pending')
      return count ?? 0
    },
  },
  {
    label: 'In progress',
    color: 'text-blue-600',
    fetch: async (sb, userId) => {
      const { count } = await sb
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('cleaner_id', userId)
        .eq('status', 'in_progress')
      return count ?? 0
    },
  },
  {
    label: 'Completed',
    color: 'text-green-700',
    fetch: async (sb, userId) => {
      const { count } = await sb
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('cleaner_id', userId)
        .eq('status', 'completed')
      return count ?? 0
    },
  },
]

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; style: string; dot: string }> = {
  pending:     { label: 'Pending',     style: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500'  },
  in_progress: { label: 'In progress', style: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500'   },
  completed:   { label: 'Completed',   style: 'bg-green-100 text-green-800', dot: 'bg-green-500'  },
}

// The valid status transitions a cleaner can make
const NEXT_STATUS: Record<string, { status: string; label: string; style: string } | null> = {
  pending:     { status: 'in_progress', label: 'Start job',   style: 'bg-blue-600 hover:bg-blue-700'   },
  in_progress: { status: 'completed',   label: 'Mark done',   style: 'bg-green-600 hover:bg-green-700' },
  completed:   null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function isToday(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toDateString() === new Date().toDateString()
}

function isFuture(dateStr: string) {
  return new Date(dateStr + 'T00:00:00') > new Date(new Date().toDateString())
}

// ─── Cleaner Dashboard ────────────────────────────────────────────────────────
export default function CleanerDashboard() {
  const router = useRouter()
  const toast  = useToast()

  const [userId, setUserId]                   = useState<string | null>(null)
  const [cleanerName, setCleanerName]         = useState('')
  const [jobs, setJobs]                       = useState<JobWithProperty[]>([])
  const [contentSections, setContentSections] = useState<ContentSection[]>([])
  const [stats, setStats]                     = useState<number[]>([])
  const [loading, setLoading]                 = useState(true)
  const [timedOut, setTimedOut]               = useState(false)
  const [fetchError, setFetchError]           = useState<string | null>(null)
  const [updatingJobId, setUpdatingJobId]     = useState<string | null>(null)
  const [acceptingJobId, setAcceptingJobId]   = useState<string | null>(null)
  const [decliningJobId, setDecliningJobId]   = useState<string | null>(null)
  const [loggingOut, setLoggingOut]           = useState(false)
  const [activeFilter, setActiveFilter]       = useState<'upcoming' | 'all'>('upcoming')

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function initUser() {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (profile?.full_name) {
        setCleanerName(profile.full_name.split(' ')[0])
      }
    }
    initUser()
  }, [])

  // ── 5-second timeout fallback ───────────────────────────────────────────────
  useEffect(() => {
    if (!loading) return
    timeoutRef.current = setTimeout(() => setTimedOut(true), 5000)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [loading])

  // ── Fetchers ────────────────────────────────────────────────────────────────
  async function fetchStats(uid: string) {
    try {
      const results = await Promise.all(CLEANER_STATS.map((s) => s.fetch(supabase, uid)))
      setStats(results)
    } catch {
      // stats are non-critical; silently ignore
    }
  }

  async function fetchJobs(uid: string) {
    try {
      // Two separate queries to avoid RLS join issues
      const [{ data: jobData, error: jobError }, { data: propData, error: propError }] =
        await Promise.all([
          supabase
            .from('jobs')
            .select('*')
            .eq('cleaner_id', uid)
            .order('scheduled_date', { ascending: true }),
          supabase
            .from('properties')
            .select('*'),
        ])

      if (jobError) throw new Error(jobError.message)
      if (propError) throw new Error(propError.message)

      const propertiesMap = new Map((propData ?? []).map((p: Property) => [p.id, p]))

      const mapped: JobWithProperty[] = (jobData ?? []).map((j: Job) => ({
        ...j,
        property: propertiesMap.get(j.property_id) ?? null,
      }))

      setJobs(mapped)
      setFetchError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load jobs'
      setFetchError(msg)
    } finally {
      setLoading(false)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }

  async function fetchContent() {
    try {
      const { data } = await supabase
        .from('content_sections')
        .select('id, type, title, body, status, audience')
        .eq('status', 'active')
        .in('audience', ['cleaners', 'all'])
        .order('created_at', { ascending: false })
      setContentSections((data as ContentSection[]) ?? [])
    } catch { /* content is non-critical */ }
  }

  // ── Trigger fetches once userId is known ────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    fetchJobs(userId)
    fetchStats(userId)
    fetchContent()
  }, [userId])

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('cleaner-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchJobs(userId)
        fetchStats(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_sections' }, () => {
        fetchContent()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Update job status ───────────────────────────────────────────────────────
  async function handleStatusUpdate(job: JobWithProperty, newStatus: string) {
    setUpdatingJobId(job.id)
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', job.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      const label = newStatus === 'in_progress' ? 'Job started' : 'Job marked as done'
      toast(label, 'success')
    }
    setUpdatingJobId(null)
    if (userId) {
      fetchJobs(userId)
      fetchStats(userId)
    }
  }

  // ── Accept job request ──────────────────────────────────────────────────────
  async function handleAccept(job: JobWithProperty) {
    setAcceptingJobId(job.id)
    const { error } = await supabase
      .from('jobs')
      .update({ acceptance_status: 'accepted', status: 'pending' })
      .eq('id', job.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Job accepted — it\'s on your schedule!', 'success')
    }
    setAcceptingJobId(null)
    if (userId) {
      fetchJobs(userId)
      fetchStats(userId)
    }
  }

  // ── Decline job request ─────────────────────────────────────────────────────
  async function handleDecline(job: JobWithProperty) {
    setDecliningJobId(job.id)
    const { error } = await supabase
      .from('jobs')
      .update({ acceptance_status: 'declined', cleaner_id: null })
      .eq('id', job.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Job declined and returned to the host.', 'warning')
    }
    setDecliningJobId(null)
    if (userId) {
      fetchJobs(userId)
      fetchStats(userId)
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Content splits ──────────────────────────────────────────────────────────
  const announcements = contentSections.filter((c) => c.type === 'announcement')
  const guidelines    = contentSections.filter((c) => c.type === 'guideline')
  const resources     = contentSections.filter((c) => c.type === 'resource')

  // ── Split new requests from active jobs ─────────────────────────────────────
  const pendingRequests = jobs.filter((j) => j.acceptance_status === 'pending_acceptance')
  const activeJobs      = jobs.filter((j) => j.acceptance_status !== 'pending_acceptance')

  // ── Filter active jobs ───────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const filteredJobs = activeFilter === 'upcoming'
    ? activeJobs.filter((j) => j.status !== 'completed' || j.scheduled_date >= today)
    : activeJobs

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {cleanerName ? `${getGreeting()}, ${cleanerName}` : 'Cleaner Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Your cleaning schedule</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              Cleaner
            </span>
            <a
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              title="Account settings"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.113a7.047 7.047 0 010-2.228L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Settings</span>
            </a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {loggingOut ? 'Signing out…' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        {userId && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CLEANER_STATS.map((stat, i) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                  {stats[i] ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── New Requests ─────────────────────────────────────────────────── */}
        {pendingRequests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">New requests</h2>
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-teal-600 text-xs font-bold text-white">
                {pendingRequests.length}
              </span>
            </div>
            {pendingRequests.map((job) => (
              <div key={job.id} className="bg-white rounded-2xl border-2 border-teal-300 ring-1 ring-teal-100 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {job.property?.name ?? 'Unknown property'}
                    </h3>
                    {job.property?.address && (
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.23 17 12.977 17 10c0-3.866-3.134-7-7-7S3 6.134 3 10c0 2.977 1.698 5.23 3.354 6.585.83.799 1.654 1.38 2.274 1.764a9.24 9.24 0 00.757.434 5.74 5.74 0 00.282.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
                        </svg>
                        {job.property.address}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      <span className="text-gray-400">Date:</span>{' '}
                      <span className="font-medium">{formatDate(job.scheduled_date)}</span>
                    </p>
                    {job.notes && (
                      <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-1">
                        📝 {job.notes}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700">
                    New
                  </span>
                </div>
                <div className="flex gap-2 justify-end pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleDecline(job)}
                    disabled={decliningJobId === job.id || acceptingJobId === job.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {decliningJobId === job.id ? (
                      <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Declining…</>
                    ) : 'Decline'}
                  </button>
                  <button
                    onClick={() => handleAccept(job)}
                    disabled={acceptingJobId === job.id || decliningJobId === job.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {acceptingJobId === job.id ? (
                      <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Accepting…</>
                    ) : 'Accept'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Content sections ─────────────────────────────────────────────── */}
        {contentSections.length > 0 && (
          <div className="space-y-4">
            {announcements.map((c) => (
              <div key={c.id} className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 border-l-4 border-l-amber-500">
                <span className="text-xl mt-0.5" aria-hidden="true">📢</span>
                <div>
                  <p className="text-sm font-semibold text-amber-900">{c.title}</p>
                  <p className="text-sm text-amber-800 mt-1">{c.body}</p>
                </div>
              </div>
            ))}
            {guidelines.length > 0 && (
              <div className="space-y-2">
                {guidelines.map((c) => (
                  <div key={c.id} className="border-l-4 border-gray-300 pl-4 py-1">
                    <p className="text-sm font-semibold text-gray-800">{c.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            {resources.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {resources.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Jobs list ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Your Jobs</h2>
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
              {(['upcoming', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 font-medium transition capitalize ${
                    activeFilter === f
                      ? 'bg-teal-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'upcoming' ? 'Upcoming' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Loading / error / empty / list */}
          {loading && !timedOut ? (
            <div className="flex justify-center py-24">
              <svg className="h-8 w-8 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none" aria-label="Loading">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          ) : timedOut && loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-medium text-gray-900 mb-1">Taking longer than expected</p>
              <p className="text-sm text-gray-500 mb-4">Check your connection or try again.</p>
              <button
                onClick={() => { setTimedOut(false); setLoading(true); if (userId) { fetchJobs(userId); fetchStats(userId) } }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
              >
                Retry
              </button>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-medium text-red-600 mb-1">Failed to load jobs</p>
              <p className="text-xs text-gray-400 mb-4">{fetchError}</p>
              <button
                onClick={() => { setFetchError(null); setLoading(true); if (userId) fetchJobs(userId) }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-900">No jobs yet</p>
              <p className="text-sm text-gray-500 mt-1">
                {activeFilter === 'upcoming'
                  ? 'No upcoming jobs — switch to "All" to see completed ones.'
                  : 'You have no assigned jobs at the moment.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  updatingJobId={updatingJobId}
                  onStatusUpdate={handleStatusUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({
  job,
  updatingJobId,
  onStatusUpdate,
}: {
  job: JobWithProperty
  updatingJobId: string | null
  onStatusUpdate: (job: JobWithProperty, newStatus: string) => void
}) {
  const meta      = STATUS_META[job.status] ?? { label: job.status, style: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  const nextStep  = NEXT_STATUS[job.status]
  const isUpdating = updatingJobId === job.id
  const today     = isToday(job.scheduled_date)
  const upcoming  = isFuture(job.scheduled_date)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
      today ? 'border-teal-300 ring-1 ring-teal-200' : 'border-gray-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: property info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {job.property?.name ?? 'Unknown property'}
              </h3>
              {today && (
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                  Today
                </span>
              )}
              {!today && upcoming && (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  Upcoming
                </span>
              )}
            </div>
            {job.property?.address && (
              <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.23 17 12.977 17 10c0-3.866-3.134-7-7-7S3 6.134 3 10c0 2.977 1.698 5.23 3.354 6.585.83.799 1.654 1.38 2.274 1.764a9.24 9.24 0 00.757.434 5.74 5.74 0 00.282.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
                </svg>
                {job.property.address}
              </p>
            )}
            <p className="text-sm text-gray-600 mt-1">
              <span className="text-gray-400">Date:</span>{' '}
              <span className={today ? 'font-semibold text-teal-700' : ''}>{formatDate(job.scheduled_date)}</span>
            </p>
            {job.notes && (
              <p className="text-sm text-gray-500 mt-1.5 bg-gray-50 rounded-lg px-3 py-2">
                📝 {job.notes}
              </p>
            )}
          </div>

          {/* Right: status badge */}
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.style}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        {/* Action button */}
        {nextStep && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onStatusUpdate(job, nextStep.status)}
              disabled={isUpdating}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition ${nextStep.style}`}
            >
              {isUpdating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Updating…
                </>
              ) : nextStep.label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
