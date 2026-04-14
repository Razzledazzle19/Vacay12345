'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Content type config ──────────────────────────────────────────────────────
// To add a new type: add one object here. Badge, form button, and table badge
// all update automatically. Also add the value to the DB check constraint.
const CONTENT_TYPES = [
  { value: 'announcement', label: 'Announcement', badge: 'bg-blue-100 text-blue-700'  },
  { value: 'resource',     label: 'Resource',     badge: 'bg-amber-100 text-amber-800' },
  { value: 'guideline',    label: 'Guideline',    badge: 'bg-green-100 text-green-700' },
]

const AUDIENCE_OPTIONS = [
  { value: 'hosts',    label: 'Hosts'    },
  { value: 'cleaners', label: 'Cleaners' },
  { value: 'all',      label: 'Everyone' },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContentSection {
  id: string
  type: 'announcement' | 'resource' | 'guideline'
  title: string
  body: string
  status: 'draft' | 'active'
  audience: 'hosts' | 'cleaners' | 'all'
  created_by: string | null
  created_at: string
  updated_at: string
}

type FormState = {
  type: string
  title: string
  body: string
  audience: string
  status: string
}

const EMPTY_FORM: FormState = {
  type: 'announcement',
  title: '',
  body: '',
  audience: 'hosts',
  status: 'active',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ContentTab() {
  const [items, setItems]                   = useState<ContentSection[]>([])
  const [loading, setLoading]               = useState(true)
  const [formOpen, setFormOpen]             = useState(false)
  const [editingItem, setEditingItem]       = useState<ContentSection | null>(null)
  const [form, setForm]                     = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]                 = useState(false)
  const [formError, setFormError]           = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function fetchItems() {
    const { data } = await supabase
      .from('content_sections')
      .select('*')
      .order('created_at', { ascending: false })
    setItems((data as ContentSection[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  // ── Form helpers ────────────────────────────────────────────────────────────
  function openNew() {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(item: ContentSection) {
    setEditingItem(item)
    setForm({ type: item.type, title: item.title, body: item.body, audience: item.audience, status: item.status })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  // ── Save (insert or update) ─────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      type:       form.type,
      title:      form.title.trim(),
      body:       form.body.trim(),
      audience:   form.audience,
      status:     form.status,
      updated_at: new Date().toISOString(),
      ...(!editingItem ? { created_by: user?.id ?? null } : {}),
    }

    const { error } = editingItem
      ? await supabase.from('content_sections').update(payload).eq('id', editingItem.id)
      : await supabase.from('content_sections').insert(payload)

    if (error) { setFormError(error.message); setSaving(false); return }

    setSaving(false)
    closeForm()
    fetchItems()
  }

  // ── Toggle active ───────────────────────────────────────────────────────────
  async function handleToggleActive(item: ContentSection) {
    await supabase
      .from('content_sections')
      .update({ status: item.status === 'active' ? 'draft' : 'active', updated_at: new Date().toISOString() })
      .eq('id', item.id)
    fetchItems()
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    await supabase.from('content_sections').delete().eq('id', id)
    setConfirmDeleteId(null)
    fetchItems()
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const typeBadge = (type: string) =>
    CONTENT_TYPES.find((t) => t.value === type)?.badge ?? 'bg-gray-100 text-gray-600'

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`grid gap-6 items-start ${formOpen ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>

      {/* ── Left: content list ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Content Sections</h2>
          <div className="flex gap-2">
            <a
              href="/dashboard/host"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Preview as host ↗
            </a>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 transition"
            >
              + New Section
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="h-6 w-6 animate-spin text-purple-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Type', 'Title', 'Audience', 'Status', 'Created', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No content sections yet</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${typeBadge(item.type)}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{item.title}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{item.audience}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(item)}
                          title="Click to toggle"
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition hover:opacity-80 ${
                            item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.status === 'active' ? 'Active' : 'Draft'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {confirmDeleteId === item.id ? (
                          <span className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Delete?</span>
                            <button onClick={() => handleDelete(item.id)} className="font-semibold text-red-600 hover:underline">Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-gray-500 hover:underline">Cancel</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-3">
                            <button onClick={() => openEdit(item)} className="text-xs font-medium text-indigo-600 hover:underline">Edit</button>
                            <button onClick={() => setConfirmDeleteId(item.id)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Right: create / edit form ───────────────────────────────────────── */}
      {formOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">
            {editingItem ? 'Edit Section' : 'New Section'}
          </h2>

          <form onSubmit={handleSave} noValidate className="space-y-4">

            {/* Type — radio buttons driven by CONTENT_TYPES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: ct.value }))}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      form.type === ct.value
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label htmlFor="cs-audience" className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
              <select
                id="cs-audience"
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              >
                {AUDIENCE_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="cs-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                id="cs-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. New cleaning fee structure — May 1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Body */}
            <div>
              <label htmlFor="cs-body" className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                id="cs-body"
                rows={5}
                required
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write the content here..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
            </div>

            {/* Active */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.status === 'active'}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? 'active' : 'draft' }))}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">Publish immediately</span>
            </label>

            {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.title.trim() || !form.body.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving…
                  </>
                ) : 'Save Section'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
