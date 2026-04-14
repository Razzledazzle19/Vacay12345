'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { type Column, DataTable, RoleBadge, formatDate, Spinner } from './_shared'

// ─── Column config ────────────────────────────────────────────────────────────
// To add a column: add one object here. Nothing else changes.
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
  const [data, setData] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then((rows) => {
      setData(rows)
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />

  return <DataTable columns={COLUMNS} data={data} getKey={(row) => row.id} emptyMessage="No users yet" />
}
