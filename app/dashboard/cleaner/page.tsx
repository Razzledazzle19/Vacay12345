'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Job, Property } from '@/types/database'
import { useToast } from '@/components/Toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface JobWithProperty extends Job {
  property: Property | null
}

type Tab = 'board' | 'schedule'

// ─── Haversine distance (miles) ───────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; style: string; dot: string }> = {
  pending:            { label: 'Pending',     style: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-500'  },
  in_progress:        { label: 'In progress', style: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500'   },
  completed:          { label: 'Completed',   style: 'bg-green-100 text-green-800',  dot: 'bg-green-500'  },
  pending_acceptance: { label: 'Open',        style: 'bg-teal-100 text-teal-800',    dot: 'bg-teal-500'   },
}

const NEXT_STATUS: Record<string, { status: string; label: string; style: string } | null> = {
  pending:     { status: 'in_progress', label: 'Start job',  style: 'bg-blue-600 hover:bg-blue-700'   },
  in_progress: { status: 'completed',   label: 'Mark done',  style: 'bg-green-600 hover:bg-green-700' },
  completed:   null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function isToday(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toDateString() === new Date().toDateString()
}

// ─── Cleaner Dashboard ────────────────────────────────────────────────────────
export default function CleanerDashboard() {
  const router = useRouter()
  const toast  = useToast()

  const [userId, setUserId]           = useState<string | null>(null)
  const [cleanerName, setCleanerName] = useState('')
  const [tab, setTab]                 = useState<Tab>('board')

  // All jobs from DB
  const [availableJobs, setAvailableJobs] = useState<JobWithProperty[]>([])
  const [myJobs, setMyJobs]               = useState<JobWithProperty[]>([])

  // Location state
  const [location, setLocation]           = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState<string>('')
  const [locationDenied, setLocationDenied] = useState(false)
  const [radiusMiles]                     = useState(50)

  // UI state
  const [loading, setLoading]             = useState(true)
  const [claimingJobId, setClaimingJobId] = useState<string | null>(null)
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut]       = useState(false)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Init user ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.full_name) setCleanerName(profile.full_name.split(' ')[0])
    }
    init()
  }, [router])

  // ── Get browser location ────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setLocationDenied(true); return }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocation({ lat, lng })

        // Reverse-geocode to get city name
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'VacayApp/1.0' } }
          )
          const data = await res.json()
          const city = data?.address?.city || data?.address?.town || data?.address?.village || ''
          const state = data?.address?.state_code || data?.address?.state || ''
          if (city) setLocationLabel(`${city}${state ? ', ' + state : ''}`)
        } catch { /* label is cosmetic */ }
      },
      () => setLocationDenied(true),
      { timeout: 8000 }
    )
  }, [])

  // ── Fetch jobs ──────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async (uid: string) => {
    try {
      const [{ data: allJobs, error: jobErr }, { data: props, error: propErr }] =
        await Promise.all([
          supabase
            .from('jobs')
            .select('*')
            .order('scheduled_date', { ascending: true }),
          supabase
            .from('properties')
            .select('*'),
        ])

      if (jobErr) throw new Error(jobErr.message)
      if (propErr) throw new Error(propErr.message)

      const propMap = new Map((props ?? []).map((p: Property) => [p.id, p]))

      const mapped: JobWithProperty[] = (allJobs ?? []).map((j: Job) => ({
        ...j,
        property: propMap.get(j.property_id) ?? null,
      }))

      // Available = unassigned jobs (any cleaner can claim)
      setAvailableJobs(mapped.filter((j) => j.cleaner_id === null))

      // My jobs = assigned to this cleaner
      setMyJobs(mapped.filter((j) => j.cleaner_id === uid))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load jobs'
      toast(msg, 'error')
    } finally {
      setLoading(false)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [toast])

  useEffect(() => {
    if (!userId) return
    timeoutRef.current = setTimeout(() => setLoading(false), 8000)
    fetchJobs(userId)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [userId, fetchJobs])

  // ── Realtime ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('cleaner-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => fetchJobs(userId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchJobs])

  // ── Claim a job from the board ───────────────────────────────────────────────
  async function handleClaim(job: JobWithProperty) {
    if (!userId) return
    setClaimingJobId(job.id)
    const { error } = await supabase
      .from('jobs')
      .update({ cleaner_id: userId, acceptance_status: 'accepted', status: 'pending' })
      .eq('id', job.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Job added to your schedule!', 'success')
      setTab('schedule')
    }
    setClaimingJobId(null)
    fetchJobs(userId)
  }

  // ── Advance job status ──────────────────────────────────────────────────────
  async function handleStatusUpdate(job: JobWithProperty, newStatus: string) {
    if (!userId) return
    setUpdatingJobId(job.id)
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', job.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      toast(newStatus === 'in_progress' ? 'Job started!' : 'Job marked complete!', 'success')
    }
    setUpdatingJobId(null)
    fetchJobs(userId)
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ── Filter available jobs by radius ─────────────────────────────────────────
  const nearbyJobs = availableJobs.filter((job) => {
    if (!location) return true // no location = show all
    const { latitude: lat, longitude: lng } = job.property ?? {}
    if (lat == null || lng == null) return true // no coords = show it anyway
    return haversine(location.lat, location.lng, lat, lng) <= radiusMiles
  })

  // ── Stats for My Schedule tab ────────────────────────────────────────────────
  const pending    = myJobs.filter((j) => j.status === 'pending').length
  const inProgress = myJobs.filter((j) => j.status === 'in_progress').length
  const completed  = myJobs.filter((j) => j.status === 'completed').length

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {cleanerName ? `${getGreeting()}, ${cleanerName}` : 'Cleaner Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {locationLabel
                ? `Showing jobs within ${radiusMiles} miles of ${locationLabel}`
                : locationDenied
                  ? 'Enable location to filter by distance'
                  : 'Detecting your location…'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
              Cleaner
            </span>
            <a
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1 border-t border-gray-100">
          {([
            { key: 'board',    label: 'Job Board', count: nearbyJobs.length },
            { key: 'schedule', label: 'My Schedule', count: myJobs.filter(j => j.status !== 'completed').length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                tab === key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`inline-flex items-center justify-center h-5 min-w-5 rounded-full px-1.5 text-xs font-bold ${
                  tab === key ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* JOB BOARD TAB                                                        */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {tab === 'board' && (
          <div className="space-y-4">
            {/* Location denied banner */}
            {locationDenied && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <svg className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>
                  <strong>Location access denied.</strong> Showing all available jobs. Enable location in your browser to see only jobs within {radiusMiles} miles.
                </span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-24">
                <svg className="h-8 w-8 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            ) : nearbyJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="rounded-full bg-teal-50 p-4 mb-4">
                  <svg className="h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">No jobs available nearby</p>
                <p className="text-sm text-gray-500 mt-1">Check back later — new jobs are posted when hosts schedule cleans.</p>
              </div>
            ) : (
              nearbyJobs.map((job) => (
                <BoardJobCard
                  key={job.id}
                  job={job}
                  claimingJobId={claimingJobId}
                  cleanerLocation={location}
                  onClaim={handleClaim}
                />
              ))
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* MY SCHEDULE TAB                                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {tab === 'schedule' && (
          <div className="space-y-6">

            {/* Stats row */}
            {myJobs.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Pending',     value: pending,    color: 'text-amber-600' },
                  { label: 'In progress', value: inProgress, color: 'text-blue-600'  },
                  { label: 'Completed',   value: completed,  color: 'text-green-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                    <p className="text-xs text-gray-500 font-medium">{label}</p>
                    <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-24">
                <svg className="h-8 w-8 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            ) : myJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                <div className="rounded-full bg-teal-50 p-4 mb-4">
                  <svg className="h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900">No jobs on your schedule</p>
                <p className="text-sm text-gray-500 mt-1">Head to the Job Board to pick up work near you.</p>
                <button
                  onClick={() => setTab('board')}
                  className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
                >
                  Browse Job Board
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myJobs.map((job) => (
                  <ScheduleJobCard
                    key={job.id}
                    job={job}
                    updatingJobId={updatingJobId}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Board Job Card (available to claim) ─────────────────────────────────────
function BoardJobCard({
  job,
  claimingJobId,
  cleanerLocation,
  onClaim,
}: {
  job: JobWithProperty
  claimingJobId: string | null
  cleanerLocation: { lat: number; lng: number } | null
  onClaim: (job: JobWithProperty) => void
}) {
  const isClaiming = claimingJobId === job.id
  const today = isToday(job.scheduled_date)

  // Calculate distance if we have both locations
  let distanceLabel = ''
  if (cleanerLocation && job.property?.latitude != null && job.property?.longitude != null) {
    const miles = haversine(
      cleanerLocation.lat, cleanerLocation.lng,
      job.property.latitude, job.property.longitude
    )
    distanceLabel = miles < 1 ? 'Less than 1 mile away' : `${Math.round(miles)} miles away`
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow ${
      today ? 'border-teal-300 ring-1 ring-teal-100' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900">{job.property?.name ?? 'Property'}</h3>
            {today && (
              <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">Today</span>
            )}
          </div>

          {job.property?.address && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.23 17 12.977 17 10c0-3.866-3.134-7-7-7S3 6.134 3 10c0 2.977 1.698 5.23 3.354 6.585.83.799 1.654 1.38 2.274 1.764a9.24 9.24 0 00.757.434 5.74 5.74 0 00.282.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
              </svg>
              {job.property.address}
            </p>
          )}

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">
              <span className="text-gray-400">Date: </span>
              <span className="font-medium text-gray-700">{formatDate(job.scheduled_date)}</span>
            </span>
            {distanceLabel && (
              <span className="flex items-center gap-1 text-teal-700 font-medium">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {distanceLabel}
              </span>
            )}
          </div>

          {job.notes && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">📝 {job.notes}</p>
          )}
        </div>

        <span className="flex-shrink-0 inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700">
          Open
        </span>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button
          onClick={() => onClaim(job)}
          disabled={isClaiming}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isClaiming ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Claiming…
            </>
          ) : 'Grab this job'}
        </button>
      </div>
    </div>
  )
}

// ─── Schedule Job Card (cleaner's own jobs) ───────────────────────────────────
function ScheduleJobCard({
  job,
  updatingJobId,
  onStatusUpdate,
}: {
  job: JobWithProperty
  updatingJobId: string | null
  onStatusUpdate: (job: JobWithProperty, newStatus: string) => void
}) {
  const meta       = STATUS_META[job.status] ?? { label: job.status, style: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
  const nextStep   = NEXT_STATUS[job.status]
  const isUpdating = updatingJobId === job.id
  const today      = isToday(job.scheduled_date)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
      today ? 'border-teal-300 ring-1 ring-teal-200' : 'border-gray-200'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">
                {job.property?.name ?? 'Unknown property'}
              </h3>
              {today && (
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">Today</span>
              )}
            </div>
            {job.property?.address && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.23 17 12.977 17 10c0-3.866-3.134-7-7-7S3 6.134 3 10c0 2.977 1.698 5.23 3.354 6.585.83.799 1.654 1.38 2.274 1.764a9.24 9.24 0 00.757.434 5.74 5.74 0 00.282.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
                </svg>
                {job.property.address}
              </p>
            )}
            <p className="text-sm text-gray-600">
              <span className="text-gray-400">Date: </span>
              <span className={today ? 'font-semibold text-teal-700' : 'font-medium'}>{formatDate(job.scheduled_date)}</span>
            </p>
            {job.notes && (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">📝 {job.notes}</p>
            )}
          </div>

          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.style}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

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
