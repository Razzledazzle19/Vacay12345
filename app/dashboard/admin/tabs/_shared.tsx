'use client'

import React from 'react'

// ─── Column config type ───────────────────────────────────────────────────────
// Used by every table tab. accessor can return any ReactNode so badges,
// links, or formatted dates can all live inside the config — not in JSX.
export type Column<T> = {
  header: string
  accessor: (row: T) => React.ReactNode
}

// ─── Generic data table ───────────────────────────────────────────────────────
export function DataTable<T>({
  columns,
  data,
  getKey,
  emptyMessage = 'No data yet',
}: {
  columns: Column<T>[]
  data: T[]
  getKey: (row: T) => string
  emptyMessage?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="text-left px-5 py-3 font-medium text-gray-500">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getKey(row)} className="hover:bg-gray-50 transition">
                {columns.map((col) => (
                  <td key={col.header} className="px-5 py-3 text-gray-700">
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Shared badges ────────────────────────────────────────────────────────────
const ROLE_STYLES: Record<string, string> = {
  host:    'bg-blue-100 text-blue-700',
  cleaner: 'bg-green-100 text-green-700',
  admin:   'bg-purple-100 text-purple-700',
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-500'}`}>
      {role}
    </span>
  )
}

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed:   'bg-green-100 text-green-800',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// ─── Shared utilities ─────────────────────────────────────────────────────────
export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ color = 'text-purple-600' }: { color?: string }) {
  return (
    <div className="flex justify-center py-24">
      <svg className={`h-8 w-8 animate-spin ${color}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  )
}
