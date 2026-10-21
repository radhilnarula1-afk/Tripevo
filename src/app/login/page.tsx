'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/backend/db/supabase/client';
import { login, signup } from './actions';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  const [errorMessage, setErrorMessage] = useState(
    searchParams?.message ? decodeURIComponent(searchParams.message) : ''
  );
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E0B1F] text-[#F4F0E8] p-4 relative overflow-hidden font-['DM_Sans']">
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#0D4F6B]/30 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-[#E87C5A]/15 to-transparent blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[32px] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity" style={{ textDecoration: 'none' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#E87C5A]"></span>
            <span className="font-bold tracking-widest uppercase text-xs text-[#F4F0E8]">TripEvo</span>
          </Link>
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2">Welcome Back</h1>
          <p className="text-[rgba(244,240,232,0.58)] text-sm">Sign in to sync your itineraries and co-plan journeys.</p>
        </div>

        <form action={async (formData) => {
          setLoading(true);
          try {
            await login(formData);
          } catch (err: any) {
            if (err?.message && !err.message.includes('NEXT_REDIRECT')) {
              setErrorMessage('Authentication failed. Check credentials.');
            }
          } finally {
            setLoading(false);
          }
        }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[rgba(244,240,232,0.58)]" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#E87C5A] text-[#F4F0E8] placeholder-[rgba(244,240,232,0.25)] transition-all text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[rgba(244,240,232,0.58)]" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] focus:outline-none focus:border-[#E87C5A] text-[#F4F0E8] placeholder-[rgba(244,240,232,0.25)] transition-all text-sm"
            />
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs text-center font-medium">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-sm"
              style={{ background: 'linear-gradient(135deg, #E87C5A 0%, #D4A853 100%)' }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            
            <button
              type="submit"
              formAction={async (formData) => {
                setLoading(true);
                try {
                  await signup(formData);
                } catch (err: any) {
                  if (err?.message && !err.message.includes('NEXT_REDIRECT')) {
                    setErrorMessage('Failed to sign up.');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] text-[rgba(244,240,232,0.8)] transition-all text-sm"
            >
              Create Account
            </button>
          </div>
        </form>

        <div className="relative my-6 text-center">
          <hr className="border-[rgba(255,255,255,0.08)]" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0E0B1F] px-3 text-xs text-[rgba(244,240,232,0.36)] uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl font-medium bg-white text-black hover:bg-neutral-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2.5 text-sm shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Sign In with Google
        </button>
      </div>
    </div>
  );
}
