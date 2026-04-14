'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { type Column, DataTable, RoleBadge, formatDate, Spinner } from './_shared'

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS: Column<Profile>[] = [
  { header: 'Name',   accessor: (row) => <span className="font-medium text-gray-900">{row.full_name}</span> },
  { header: 'Role',   accessor: (row) => <RoleBadge role={row.role} /> },
  { header: 'Joined', accessor: (row) => <span className="text-gray-500">{formatDate(row.created_at)}</span> },
]

// ─── Data fetch ───────────────────────────────────────────────────────────────
async function fetchData(): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  return (data as Profile[]) ?? []
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function UsersTab() {
  const [data, setData]       = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [role, setRole]       = useState<'all' | 'host' | 'cleaner' | 'admin'>('all')

  useEffect(() => {
    fetchData().then((rows) => { setData(rows); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((row) => {
      const matchesSearch = !q || row.full_name.toLowerCase().includes(q)
      const matchesRole   = role === 'all' || row.role === role
      return matchesSearch && matchesRole
    })
  }, [data, search, role])

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
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          <option value="all">All roles</option>
          <option value="host">Host</option>
          <option value="cleaner">Cleaner</option>
          <option value="admin">Admin</option>
        </select>
        {(search || role !== 'all') && (
          <button
            onClick={() => { setSearch(''); setRole('all') }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Result count ── */}
      <p className="text-xs text-gray-400">
        {filtered.length} of {data.length} user{data.length !== 1 ? 's' : ''}
      </p>

      <DataTable columns={COLUMNS} data={filtered} getKey={(row) => row.id} emptyMessage="No users match your filters" />
    </div>
  )
}
