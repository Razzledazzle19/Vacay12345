'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Property, Profile } from '@/types/database'
import { type Column, DataTable, formatDate, Spinner } from './_shared'

// ─── Row type ─────────────────────────────────────────────────────────────────
type PropertyRow = Property & { owner_name: string }

// ─── Column config ────────────────────────────────────────────────────────────
// To add a column: add one object here. Nothing else changes.
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
  const [data, setData] = useState<PropertyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then((rows) => {
      setData(rows)
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />

  return <DataTable columns={COLUMNS} data={data} getKey={(row) => row.id} emptyMessage="No properties yet" />
}
