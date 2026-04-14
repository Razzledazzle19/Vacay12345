'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Property, Profile } from '@/types/database'
import { type Column, DataTable, formatDate, Spinner } from './_shared'

// ─── Row type ─────────────────────────────────────────────────────────────────
type PropertyRow = Property & { owner_name: string }

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS: Column<PropertyRow>[] = [
  { header: 'Property', accessor: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
  { header: 'Address',  accessor: (row) => <span className="text-gray-500">{row.address}</span> },
  { header: 'Owner',    accessor: (row) => row.owner_name },
  { header: 'Added',    accessor: (row) => <span className="text-gray-500">{formatDate(row.created_at)}</span> },
]

// ─── Data fetch ───────────────────────────────────────────────────────────────
async function fetchData(): Promise<PropertyRow[]> {
  const [{ data: properties }, { data: profiles }] = await Promise.all([
    supabase.from('properties').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
  ])

  const profileMap = Object.fromEntries(
    ((profiles as Pick<Profile, 'id' | 'full_name'>[]) ?? []).map((p) => [p.id, p.full_name])
  )

  return ((properties as Property[]) ?? []).map((p) => ({
    ...p,
    owner_name: profileMap[p.owner_id] ?? 'Unknown',
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PropertiesTab() {
  const [data, setData]       = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    fetchData().then((rows) => { setData(rows); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter((row) =>
      row.name.toLowerCase().includes(q) ||
      row.address.toLowerCase().includes(q)
    )
  }, [data, search])

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-gray-400">
        {filtered.length} of {data.length} propert{data.length !== 1 ? 'ies' : 'y'}
      </p>

      <DataTable columns={COLUMNS} data={filtered} getKey={(row) => row.id} emptyMessage="No properties match your search" />
    </div>
  )
}
