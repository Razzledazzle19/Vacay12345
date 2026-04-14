'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CleanerLoginPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError]   = useState('')

  async function login() {
    setStatus('loading')
    setError('')

    await supabase.auth.signOut()

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email:    'cleaner@vacay.test',
      password: 'Cleaner123!',
    })

    if (err || !data.user) {
      setError(err?.message ?? 'Login failed')
      setStatus('error')
      return
    }

    window.location.href = '/dashboard/cleaner'
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md px-10 py-12 text-center space-y-6 w-80">
        <div className="text-5xl">🧹</div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Test Cleaner Login</h1>
          <p className="text-sm text-gray-500 mt-1">cleaner@vacay.test</p>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          onClick={login}
          disabled={status === 'loading'}
          className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition"
        >
          {status === 'loading' ? 'Signing in…' : 'Sign in as Cleaner'}
        </button>

        <a href="/login" className="block text-xs text-gray-400 hover:text-gray-600">
          ← Back to regular login
        </a>
      </div>
    </main>
  )
}
