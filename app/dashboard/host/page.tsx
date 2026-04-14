'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Property, Job } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cleaner       { id: string; full_name: string }
interface ContentSection {
  id: string
  type: 'announcement' | 'resource' | 'guideline'
  title: string; body: string; status: 'draft' | 'active'; audience: string
}
interface PropertyWithJobs extends Property {
  jobs: Job[]
  pendingJobs: number
}
interface Subscription {
  id: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'cancelled' | 'past_due'
}
interface SupplyOrder {
  id: string
  property_id: string
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  scheduled_date: string
  notes: string | null
}
interface SupplyItem {
  id: string
  name: string
  category: string
  unit: string
}

// ─── Stats config ─────────────────────────────────────────────────────────────
// Adding a new stat = add one object here. Nothing else changes.
const HOST_STATS: {
  label: string
  color: string
  fetch: (sb: SupabaseClient, userId: string) => Promise<number>
}[] = [
  {
    label: 'Total properties',
    color: 'text-blue-700',
    fetch: async (sb, userId) => {
      const { count } = await sb.from('properties')
        .select('*', { count: 'exact', head: true }).eq('owner_id', userId)
      return count ?? 0
    },
  },
  {
    label: 'Total bookings',
    color: 'text-indigo-700',
    fetch: async (sb, userId) => {
      const { count } = await sb.from('jobs')
        .select('*, properties!inner(*)', { count: 'exact', head: true })
        .eq('properties.owner_id', userId)
      return count ?? 0
    },
  },
  {
    label: 'Pending cleans',
    color: 'text-amber-600',
    fetch: async (sb, userId) => {
      const { count } = await sb.from('jobs')
        .select('*, properties!inner(*)', { count: 'exact', head: true })
        .eq('properties.owner_id', userId).eq('status', 'pending')
      return count ?? 0
    },
  },
  {
    label: 'In progress',
    color: 'text-blue-600',
    fetch: async (sb, userId) => {
      const { count } = await sb.from('jobs')
        .select('*, properties!inner(*)', { count: 'exact', head: true })
        .eq('properties.owner_id', userId).eq('status', 'in_progress')
      return count ?? 0
    },
  },
  {
    label: 'Completed',
    color: 'text-green-700',
    fetch: async (sb, userId) => {
      const { count } = await sb.from('jobs')
        .select('*, properties!inner(*)', { count: 'exact', head: true })
        .eq('properties.owner_id', userId).eq('status', 'completed')
      return count ?? 0
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
const emptyPropertyForm = { name: '', address: '' }
const emptyJobForm      = { scheduled_date: '', cleaner_id: '', notes: '' }

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

const STATUS_META: Record<string, { label: string; style: string; dot: string }> = {
  pending:     { label: 'Pending',     style: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  in_progress: { label: 'In progress', style: 'bg-blue-100 text-blue-800',   dot: 'bg-blue-500'  },
  completed:   { label: 'Completed',   style: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
}

const ACCEPTANCE_META: Record<string, { label: string; style: string }> = {
  pending_acceptance: { label: 'Awaiting response', style: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  accepted:           { label: 'Cleaner accepted',  style: 'bg-green-50  text-green-700  border border-green-200'  },
  declined:           { label: 'Cleaner declined',  style: 'bg-red-50    text-red-700    border border-red-200'    },
}

// ─── Host Dashboard ───────────────────────────────────────────────────────────
export default function HostDashboard() {
  const router = useRouter()

  const [userId, setUserId]                   = useState<string | null>(null)
  const [hostName, setHostName]               = useState('')
  const [properties, setProperties]           = useState<PropertyWithJobs[]>([])
  const [cleaners, setCleaners]               = useState<Cleaner[]>([])
  const [contentSections, setContentSections] = useState<ContentSection[]>([])
  const [stats, setStats]                     = useState<number[]>([])
  const [loading, setLoading]                 = useState(true)
  const [timedOut, setTimedOut]               = useState(false)
  const [fetchError, setFetchError]           = useState<string | null>(null)
  const [showForm, setShowForm]               = useState(false)
  const [form, setForm]                       = useState(emptyPropertyForm)
  const [submitting, setSubmitting]           = useState(false)
  const [formError, setFormError]             = useState<string | null>(null)
  const [loggingOut, setLoggingOut]           = useState(false)
  const [subscription, setSubscription]       = useState<Subscription | null>(null)
  const [supplyOrders, setSupplyOrders]       = useState<SupplyOrder[]>([])
  const [supplyItems, setSupplyItems]         = useState<SupplyItem[]>([])
  const [showSupplyForm, setShowSupplyForm]   = useState<string | null>(null) // property id
  const [supplyForm, setSupplyForm]           = useState({ scheduled_date: '', notes: '' })
  const [supplySubmitting, setSupplySubmitting] = useState(false)
  const [supplyError, setSupplyError]         = useState<string | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function initUser() {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        // Auth disabled or unauthenticated — show empty state immediately
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Pull first name from profile
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      if (profile?.full_name) {
        setHostName(profile.full_name.split(' ')[0])
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
      const results = await Promise.all(HOST_STATS.map((s) => s.fetch(supabase, uid)))
      setStats(results)
    } catch (err) {
      console.error('Stats fetch error:', err)
    }
  }

  async function fetchProperties(uid: string) {
    try {
      // Fetch properties and jobs as separate queries to avoid PostgREST
      // embedded-join RLS issues when the jobs table has no matching rows.
      const [{ data: propData, error: propError }, { data: jobData, error: jobError }] =
        await Promise.all([
          supabase.from('properties').select('*').eq('owner_id', uid).order('created_at', { ascending: false }),
          supabase.from('jobs').select('*').order('scheduled_date', { ascending: true }),
        ])

      if (propError) throw new Error(propError.message)
      if (jobError)  throw new Error(jobError.message)

      const props  = (propData  ?? []) as Property[]
      const jobs   = (jobData   ?? []) as Job[]

      const mapped: PropertyWithJobs[] = props.map((p) => {
        const propertyJobs = jobs.filter((j) => j.property_id === p.id)
        return {
          ...p,
          jobs: propertyJobs,
          pendingJobs: propertyJobs.filter((j) => j.status === 'pending').length,
        }
      })

      setProperties(mapped)
      setFetchError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load properties'
      console.error('Properties fetch error:', msg)
      setFetchError(msg)
    } finally {
      setLoading(false)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }

  async function fetchCleaners() {
    try {
      const { data } = await supabase
        .from('profiles').select('id, full_name').eq('role', 'cleaner').order('full_name')
      if (data) setCleaners(data)
    } catch (err) { console.error('Cleaners fetch error:', err) }
  }

  async function fetchContent() {
    try {
      const { data } = await supabase
        .from('content_sections').select('id, type, title, body, status, audience')
        .eq('status', 'active').in('audience', ['hosts', 'all'])
        .order('created_at', { ascending: false })
      setContentSections((data as ContentSection[]) ?? [])
    } catch (err) { console.error('Content fetch error:', err) }
  }

  async function fetchSupplies(uid: string) {
    try {
      const [{ data: sub }, { data: orders }, { data: items }] = await Promise.all([
        supabase.from('subscriptions').select('id, plan, status').eq('host_id', uid).maybeSingle(),
        supabase.from('supply_orders').select('id, property_id, status, scheduled_date, notes')
          .eq('host_id', uid).order('scheduled_date', { ascending: false }).limit(20),
        supabase.from('supply_items').select('id, name, category, unit').eq('is_active', true),
      ])
      setSubscription(sub as Subscription | null)
      setSupplyOrders((orders ?? []) as SupplyOrder[])
      setSupplyItems((items ?? []) as SupplyItem[])
    } catch (err) { console.error('Supplies fetch error:', err) }
  }

  async function handleRequestSupplies(e: React.FormEvent, propertyId: string) {
    e.preventDefault()
    if (!userId) return
    setSupplySubmitting(true)
    setSupplyError(null)
    const { error } = await supabase.from('supply_orders').insert({
      property_id:    propertyId,
      host_id:        userId,
      scheduled_date: supplyForm.scheduled_date,
      notes:          supplyForm.notes.trim() || null,
      status:         'pending',
    })
    if (error) { setSupplyError(error.message); setSupplySubmitting(false); return }
    setSupplyForm({ scheduled_date: '', notes: '' })
    setShowSupplyForm(null)
    setSupplySubmitting(false)
    fetchSupplies(userId)
  }

  // ── Trigger fetches once userId is known ────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    fetchProperties(userId)
    fetchStats(userId)
    fetchCleaners()
    fetchContent()
    fetchSupplies(userId)
  }, [userId])

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('host-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchStats(userId)
        fetchProperties(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        fetchStats(userId)
        fetchProperties(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_sections' }, () => {
        fetchContent()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Add property ────────────────────────────────────────────────────────────
  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setSubmitting(true)
    setFormError(null)

    const { error } = await supabase.from('properties').insert({
      owner_id: userId, name: form.name.trim(), address: form.address.trim(),
    })

    if (error) { setFormError(error.message); setSubmitting(false); return }
    setForm(emptyPropertyForm)
    setShowForm(false)
    setSubmitting(false)
    fetchProperties(userId)
    fetchStats(userId)
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {hostName ? `${getGreeting()}, ${hostName}` : 'Host Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">All your properties at a glance</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {loggingOut ? 'Signing out…' : 'Logout'}
            </button>
            <button
              onClick={() => { setShowForm((v) => !v); setForm(emptyPropertyForm); setFormError(null) }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
            >
              {showForm ? 'Cancel' : (
                <><svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>Add property</>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Stats strip ─────────────────────────────────────────────────── */}
        {userId && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {HOST_STATS.map((stat, i) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                  {stats[i] ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Add property form ────────────────────────────────────────────── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">New property</h2>
            <form onSubmit={handleAddProperty} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="prop-name" className="block text-sm font-medium text-gray-700 mb-1">Property name</label>
                  <input
                    id="prop-name" type="text" required value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    disabled={submitting} placeholder="Beach House"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition"
                  />
                </div>
                <div>
                  <label htmlFor="prop-address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    id="prop-address" type="text" required value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    disabled={submitting} placeholder="123 Ocean Drive, Miami FL"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition"
                  />
                </div>
              </div>
              {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end">
                <button
                  type="submit" disabled={submitting || !form.name.trim() || !form.address.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {submitting
                    ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Saving…</>
                    : 'Save property'}
                </button>
              </div>
            </form>
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

        {/* ── Supplies section ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Supplies</h2>
                <p className="text-xs text-gray-500">Toilet paper, towels, paper towels &amp; more</p>
              </div>
            </div>
            {subscription ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                subscription.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                subscription.plan === 'pro'        ? 'bg-indigo-100 text-indigo-700' :
                                                     'bg-gray-100 text-gray-600'
              }`}>
                {subscription.plan} plan
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                No subscription
              </span>
            )}
          </div>

          {/* Supply items catalog */}
          {supplyItems.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Available supplies</p>
              <div className="flex flex-wrap gap-2">
                {supplyItems.map((item) => (
                  <span key={item.id} className="inline-flex items-center rounded-full bg-teal-50 border border-teal-100 px-3 py-1 text-xs font-medium text-teal-700">
                    {item.name}
                    <span className="ml-1.5 text-teal-400">/ {item.unit}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Request restock per property */}
          {properties.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Request a restock</p>
              <div className="space-y-3">
                {properties.map((prop) => (
                  <div key={prop.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">{prop.name}</span>
                      <button
                        onClick={() => {
                          setShowSupplyForm(showSupplyForm === prop.id ? null : prop.id)
                          setSupplyForm({ scheduled_date: '', notes: '' })
                          setSupplyError(null)
                        }}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
                      >
                        {showSupplyForm === prop.id ? 'Cancel' : '+ Request restock'}
                      </button>
                    </div>
                    {showSupplyForm === prop.id && (
                      <form onSubmit={(e) => handleRequestSupplies(e, prop.id)} className="mt-3 space-y-3 border border-teal-100 rounded-xl p-4 bg-teal-50/50">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Delivery date <span className="text-red-500">*</span></label>
                            <input
                              type="date" required value={supplyForm.scheduled_date}
                              onChange={(e) => setSupplyForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                              disabled={supplySubmitting}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                            <input
                              type="text" value={supplyForm.notes}
                              onChange={(e) => setSupplyForm((f) => ({ ...f, notes: e.target.value }))}
                              disabled={supplySubmitting} placeholder="e.g. extra towels needed"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                            />
                          </div>
                        </div>
                        {supplyError && <p className="text-xs text-red-600">{supplyError}</p>}
                        <div className="flex justify-end">
                          <button
                            type="submit" disabled={supplySubmitting || !supplyForm.scheduled_date}
                            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                          >
                            {supplySubmitting ? 'Submitting…' : 'Submit request'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent supply orders */}
          {supplyOrders.length > 0 ? (
            <div className="px-6 py-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Recent orders</p>
              <div className="space-y-2">
                {supplyOrders.slice(0, 5).map((order) => {
                  const prop = properties.find((p) => p.id === order.property_id)
                  const statusStyle: Record<string, string> = {
                    pending:   'bg-amber-100 text-amber-700',
                    confirmed: 'bg-blue-100 text-blue-700',
                    delivered: 'bg-green-100 text-green-700',
                    cancelled: 'bg-gray-100 text-gray-500',
                  }
                  return (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-800">{prop?.name ?? 'Property'}</span>
                        <span className="text-gray-400 ml-2">{formatShortDate(order.scheduled_date)}</span>
                        {order.notes && <span className="text-gray-400 ml-2 text-xs">· {order.notes}</span>}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyle[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {order.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 text-center text-sm text-gray-400">
              No supply orders yet — request a restock above.
            </div>
          )}
        </div>

        {/* ── Property grid ─────────────────────────────────────────────────── */}
        {loading && !timedOut ? (
          <div className="flex justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" aria-label="Loading">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : timedOut && loading ? (
          /* Timeout fallback */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-gray-900 mb-1">Taking longer than expected</p>
            <p className="text-sm text-gray-500 mb-4">Check your connection or try again.</p>
            <button
              onClick={() => { setTimedOut(false); setLoading(true); if (userId) { fetchProperties(userId); fetchStats(userId) } }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        ) : fetchError ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm font-medium text-red-600 mb-1">Failed to load properties</p>
            <p className="text-xs text-gray-400 mb-4">{fetchError}</p>
            <button
              onClick={() => { setFetchError(null); setLoading(true); if (userId) fetchProperties(userId) }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Retry
            </button>
          </div>
        ) : properties.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900">No properties yet</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">Add your first property to get started.</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
              Add property
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                cleaners={cleaners}
                onJobCreated={() => { if (userId) { fetchProperties(userId); fetchStats(userId) } }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Property Card ────────────────────────────────────────────────────────────
function PropertyCard({
  property, cleaners, onJobCreated,
}: {
  property: PropertyWithJobs
  cleaners: Cleaner[]
  onJobCreated: () => void
}) {
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobForm, setJobForm]         = useState(emptyJobForm)
  const [submitting, setSubmitting]   = useState(false)
  const [jobError, setJobError]       = useState<string | null>(null)

  // ── Derive next/current job ─────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const sortedJobs = property.jobs.slice().sort(
    (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
  )
  const nextJob =
    sortedJobs.find((j) => j.scheduled_date >= today && j.status !== 'completed') ??
    sortedJobs[sortedJobs.length - 1] ?? null

  const statusMeta = nextJob ? (STATUS_META[nextJob.status] ?? null) : null
  const cleanerName = nextJob?.cleaner_id
    ? (cleaners.find((c) => c.id === nextJob.cleaner_id)?.full_name ?? 'Unknown')
    : null

  // ── Schedule clean ──────────────────────────────────────────────────────────
  async function handleScheduleClean(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setJobError(null)

    const { error } = await supabase.from('jobs').insert({
      property_id:    property.id,
      cleaner_id:     jobForm.cleaner_id || null,
      scheduled_date: jobForm.scheduled_date,
      notes:          jobForm.notes.trim() || null,
      status:         'pending',
    })

    if (error) { setJobError(error.message); setSubmitting(false); return }
    setJobForm(emptyJobForm)
    setShowJobForm(false)
    setSubmitting(false)
    onJobCreated()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
      <div className="p-5 flex flex-col gap-4 flex-1">

        {/* Name + address */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{property.name}</h3>
          <p className="text-sm text-gray-500 mt-1 flex items-start gap-1.5">
            <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 15.23 17 12.977 17 10c0-3.866-3.134-7-7-7S3 6.134 3 10c0 2.977 1.698 5.23 3.354 6.585.83.799 1.654 1.38 2.274 1.764a9.24 9.24 0 00.757.434 5.74 5.74 0 00.282.14l.018.008.006.003zM10 11.25a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" clipRule="evenodd" />
            </svg>
            {property.address}
          </p>
        </div>

        {/* Next clean info */}
        {nextJob ? (
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="text-gray-400">Next clean:</span> {formatShortDate(nextJob.scheduled_date)}</p>
            <p><span className="text-gray-400">Cleaner:</span>{' '}
              {cleanerName ?? <span className="italic text-gray-400">Unassigned</span>}
            </p>
            {nextJob.cleaner_id && ACCEPTANCE_META[nextJob.acceptance_status] && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACCEPTANCE_META[nextJob.acceptance_status].style}`}>
                {ACCEPTANCE_META[nextJob.acceptance_status].label}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">No clean scheduled</p>
        )}

        {/* Status badge + actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {statusMeta ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.style}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
              {statusMeta.label}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
              Not scheduled
            </span>
          )}
          <button
            onClick={() => { setShowJobForm((v) => !v); setJobForm(emptyJobForm); setJobError(null) }}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition"
          >
            {showJobForm ? 'Cancel' : (
              <><svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>Schedule</>
            )}
          </button>
        </div>

        {/* Schedule form */}
        {showJobForm && (
          <form onSubmit={handleScheduleClean} noValidate className="border-t border-gray-100 pt-4 space-y-3">
            <div>
              <label htmlFor={`date-${property.id}`} className="block text-xs font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id={`date-${property.id}`} type="date" required value={jobForm.scheduled_date}
                onChange={(e) => setJobForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 transition"
              />
            </div>
            <div>
              <label htmlFor={`cleaner-${property.id}`} className="block text-xs font-medium text-gray-700 mb-1">Assign cleaner</label>
              <select
                id={`cleaner-${property.id}`} value={jobForm.cleaner_id}
                onChange={(e) => setJobForm((f) => ({ ...f, cleaner_id: e.target.value }))}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 transition"
              >
                <option value="">Unassigned</option>
                {cleaners.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`notes-${property.id}`} className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                id={`notes-${property.id}`} rows={2} value={jobForm.notes}
                onChange={(e) => setJobForm((f) => ({ ...f, notes: e.target.value }))}
                disabled={submitting} placeholder="Any special instructions…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 transition"
              />
            </div>
            {jobError && <p role="alert" className="text-xs text-red-600">{jobError}</p>}
            <div className="flex justify-end">
              <button
                type="submit" disabled={submitting || !jobForm.scheduled_date}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting
                  ? <><svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Saving…</>
                  : 'Save job'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Jobs history list */}
      {property.jobs.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">All jobs</p>
          {property.jobs
            .slice()
            .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
            .map((job) => (
              <div key={job.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-700 flex-shrink-0">{formatShortDate(job.scheduled_date)}</span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {job.cleaner_id && ACCEPTANCE_META[job.acceptance_status] && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACCEPTANCE_META[job.acceptance_status].style}`}>
                      {ACCEPTANCE_META[job.acceptance_status].label}
                    </span>
                  )}
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[job.status]?.style ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_META[job.status]?.label ?? job.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
