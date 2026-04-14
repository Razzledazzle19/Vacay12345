'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Job, Property, Profile } from '@/types/database'
import { type Column, DataTable, StatusBadge, formatDay, Spinner } from './_shared'

// ─── Row type ─────────────────────────────────────────────────────────────────
type JobRow = Job & { property_name: string; cleaner_name: string | null }

// ─── Column config ────────────────────────────────────────────────────────────
// To add a column: add one object here. Nothing else changes.
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
  const [data, setData] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then((rows) => {
      setData(rows)
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />

  return <DataTable columns={COLUMNS} data={data} getKey={(row) => row.id} emptyMessage="No jobs yet" />
}
