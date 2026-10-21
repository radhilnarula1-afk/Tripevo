'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/backend/db/supabase/client'
import { signout } from '@/app/login/actions'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase.auth])

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-[var(--text-primary)] font-medium max-w-[120px] truncate">{user.email}</span>
        </div>
        <button 
          onClick={async () => {
            await signout()
          }}
          className="px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-md"
          style={{ background: 'linear-gradient(135deg, #E87C5A 0%, #D4A853 100%)' }}
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <Link 
      href="/login"
      className="px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-md inline-flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #E87C5A 0%, #D4A853 100%)', textDecoration: 'none' }}
    >
      Sign In
    </Link>
  )
}
