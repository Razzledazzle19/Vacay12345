'use client'

import { useState } from 'react'
import OverviewTab    from './tabs/overview'
import UsersTab       from './tabs/users'
import PropertiesTab  from './tabs/properties'
import JobsTab        from './tabs/jobs'
import ContentTab     from './tabs/content'

// ─── Tab config ───────────────────────────────────────────────────────────────
// To add a new tab: add one object here + create the component file.
// Nothing else in this file changes.
const ADMIN_TABS = [
  { id: 'overview',    label: 'Overview',    component: OverviewTab   },
  { id: 'users',       label: 'Users',       component: UsersTab      },
  { id: 'properties',  label: 'Properties',  component: PropertiesTab },
  { id: 'jobs',        label: 'Jobs',        component: JobsTab       },
  { id: 'content',     label: 'Content',     component: ContentTab    },
]

// ─── Shell ────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeId, setActiveId] = useState(ADMIN_TABS[0].id)
  const ActiveTab = ADMIN_TABS.find((t) => t.id === activeId)?.component ?? OverviewTab

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Platform overview</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              Admin
            </span>
          </div>

          {/* Tab bar — driven entirely by ADMIN_TABS */}
          <div className="flex gap-1 mt-5 border-b border-gray-200 -mb-5">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                  activeId === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ActiveTab />
      </div>
    </main>
  )
}
