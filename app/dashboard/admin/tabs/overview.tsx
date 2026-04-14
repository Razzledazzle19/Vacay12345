'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Spinner } from './_shared'

// ─── Stat card config ─────────────────────────────────────────────────────────
// To add a new stat: add one object here. Nothing else changes.
const STAT_CARDS: {
  label: string
  color: string
  fetch: (sb: SupabaseClient) => Promise<number>
}[] = [
  {
    label: 'Total Users',
    color: 'purple',
    fetch: async (sb) => {
      const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  },
  {
    label: 'Hosts',
    color: 'blue',
    fetch: async (sb) => {
      const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'host')
      return count ?? 0
    },
  },
  {
    label: 'Cleaners',
    color: 'indigo',
    fetch: async (sb) => {
      const { count } = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'cleaner')
      return count ?? 0
    },
  },
  {
    label: 'Properties',
    color: 'cyan',
    fetch: async (sb) => {
      const { count } = await sb.from('properties').select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  },
  {
    label: 'Total Jobs',
    color: 'gray',
    fetch: async (sb) => {
      const { count } = await sb.from('jobs').select('*', { count: 'exact', head: true })
      return count ?? 0
    },
  },
  {
    label: 'Pending',
    color: 'amber',
    fetch: async (sb) => {
      const { count } = await sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      return count ?? 0
    },
  },
  {
    label: 'In Progress',
    color: 'blue',
    fetch: async (sb) => {
      const { count } = await sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
      return count ?? 0
    },
  },
  {
    label: 'Completed',
    color: 'green',
    fetch: async (sb) => {
      const { count } = await sb.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed')
      return count ?? 0
    },
  },
]

// ─── Color map ────────────────────────────────────────────────────────────────
const VALUE_COLOR: Record<string, string> = {
  purple: 'text-purple-700',
  blue:   'text-blue-700',
  indigo: 'text-indigo-700',
  cyan:   'text-cyan-700',
  gray:   'text-gray-700',
  amber:  'text-amber-600',
  green:  'text-green-700',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OverviewTab() {
  const [values, setValues] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all(STAT_CARDS.map((card) => card.fetch(supabase))).then((results) => {
      setValues(results)
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {STAT_CARDS.map((card, i) => (
        <div key={card.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">{card.label}</p>
          <p className={`text-3xl font-bold mt-1 ${VALUE_COLOR[card.color] ?? 'text-gray-900'}`}>
            {values[i] ?? 0}
          </p>
        </div>
      ))}
    </div>
  )
}
