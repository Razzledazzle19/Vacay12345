'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Property, Profile } from '@/types/database'
import { type Column, DataTable, StatusBadge, formatDay, Spinner } from './_shared'

// ─── Row type ─────────────────────────────────────────────────────────────────
type JobRow = Job & { property_name: string; cleaner_name: string | null }

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS: Column<JobRow>[] = [
  { header: 'Property', accessor: (row) => <span className="font-medium text-gray-900">{row.property_name}</span> },
  { header: 'Cleaner',  accessor: (row) => row.cleaner_name ?? <span className="italic text-gray-400">Unassigned</span> },
  { header: 'Date',     accessor: (row) => <span className="text-gray-500">{formatDay(row.scheduled_date)}</span> },
  { header: 'Status',   accessor: (row) => <StatusBadge status={row.status} /> },
  { header: 'Notes',    accessor: (row) => <span className="text-gray-500 max-w-xs truncate block">{row.notes ?? '—'}</span> },
]

// ─── Data fetch ───────────────────────────────────────────────────────────────
async function fetchData(): Promise<JobRow[]> {
  const [{ data: jobs }, { data: properties }, { data: profiles }] = await Promise.all([
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('properties').select('id, name'),
    supabase.from('profiles').select('id, full_name'),
  ])

  const propertyMap = Object.fromEntries(
    ((properties as Pick<Property, 'id' | 'name'>[]) ?? []).map((p) => [p.id, p.name])
  )
  const profileMap = Object.fromEntries(
    ((profiles as Pick<Profile, 'id' | 'full_name'>[]) ?? []).map((p) => [p.id, p.full_name])
  )

  return ((jobs as Job[]) ?? []).map((j) => ({
    ...j,
    property_name: propertyMap[j.property_id] ?? 'Unknown',
    cleaner_name:  j.cleaner_id ? (profileMap[j.cleaner_id] ?? 'Unknown') : null,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function JobsTab() {
  const [data, setData]       = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  useEffect(() => {
    fetchData().then((rows) => { setData(rows); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const matchesStatus = status === 'all' || row.status === status
      const matchesFrom   = !dateFrom || row.scheduled_date >= dateFrom
      const matchesTo     = !dateTo   || row.scheduled_date <= dateTo
      return matchesStatus && matchesFrom && matchesTo
    })
  }, [data, status, dateFrom, dateTo])

  const hasFilters = status !== 'all' || dateFrom || dateTo

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setStatus('all'); setDateFrom(''); setDateTo('') }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-gray-400">
        {filtered.length} of {data.length} job{data.length !== 1 ? 's' : ''}
      </p>

      <DataTable columns={COLUMNS} data={filtered} getKey={(row) => row.id} emptyMessage="No jobs match your filters" />
    </div>
  )
}
