'use client'

// ============================================================
// ADMIN TAB TEMPLATE
// Copy this file, rename it, and follow the steps below.
// ============================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type Column, DataTable, Spinner } from './_shared'

// STEP 1: Change this type to match your data shape.
// Add one field per column you want to display.
type MyRowType = {
  id: string
  // ... add your fields here
  created_at: string
}

// STEP 2: (Optional) Add stat cards.
// Delete this block entirely if you don't need stats on this tab.
const _STAT_CARDS: {
  label: string
  color: string
  fetch: (sb: SupabaseClient) => Promise<number>
}[] = [
  {
    label: 'My stat label',
    color: 'purple', // purple | blue | indigo | cyan | gray | amber | green
    fetch: async (sb) => {
      const { count } = await sb
        .from('your_table') // CHANGE: your table name
        .select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  },
]

// STEP 3: Define your table columns.
// Each object = one column. accessor can return any ReactNode.
// Use helpers from _shared.tsx: RoleBadge, StatusBadge, formatDate, formatDay.
const COLUMNS: Column<MyRowType>[] = [
  {
    header: 'Column header',       // CHANGE: column heading text
    accessor: (row) => row.id,     // CHANGE: what to display in this column
  },
  // Add more columns here...
]

// STEP 4: Write your data fetch.
// Run whatever queries you need and return the shaped rows.
async function fetchData(): Promise<MyRowType[]> {
  const { data } = await supabase
    .from('your_table')            // CHANGE: your table name
    .select('*')
    .order('created_at', { ascending: false })
  return (data as MyRowType[]) ?? []
}

// STEP 5: Register this tab in /app/dashboard/admin/page.tsx.
// Add this one line to the ADMIN_TABS array:
//   { id: 'my-tab', label: 'My Tab', component: MyTab }
// That's it — the tab bar and routing update automatically.

// ─── Component ────────────────────────────────────────────────────────────────
// You generally don't need to change anything below this line.
export default function MyTab() {
  const [data, setData] = useState<MyRowType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData().then((rows) => {
      setData(rows)
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />

  return (
    <DataTable
      columns={COLUMNS}
      data={data}
      getKey={(row) => row.id}
      emptyMessage="No data yet" // CHANGE: empty state message
    />
  )
}
