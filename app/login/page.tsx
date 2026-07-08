'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

function isPhone(value: string): boolean {
  const v = value.trim().replace(/\s/g, '')
  return /^(\+261|0)[0-9]{8,9}$/.test(v) || /^[0-9]{9,10}$/.test(v)
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function LoginPage() {
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const phone = isPhone(identity)

    // 1. Conducteur (téléphone + PIN)
    if (phone) {
      const driverRes = await fetch('/api/chauffeur/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identity.trim(), pin: password }),
      }).catch(() => null)

      if (driverRes?.ok) {
        router.push('/chauffeur')
        return
      }

      // 2. Client (téléphone + code de suivi)
      const clientRes = await fetch('/api/suivi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identity.trim(), code: password }),
      }).catch(() => null)

      if (clientRes?.ok) {
        router.push('/suivi')
        return
      }
    }

    // 3. Admin (email ou téléphone → Supabase)
    const supabase = createClient()
    if (!supabase) {
      setError('Service non disponible.')
      setLoading(false)
      return
    }

    let email = identity.trim()

    if (phone) {
      const res = await fetch('/api/admin/resolve-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identity.trim() }),
      }).catch(() => null)

      if (!res?.ok) {
        setError('Identifiant ou mot de passe incorrect.')
        setLoading(false)
        return
      }
      email = (await res.json()).email
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError('Identifiant ou mot de passe incorrect.')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-brand-gray flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo.png"
            alt="Taxi Fast Service"
            width={72}
            height={72}
            className="rounded-2xl"
            priority
          />
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="font-black text-brand-red text-2xl tracking-tight">TAXI</span>
              <span className="font-black text-brand-black text-2xl italic tracking-tight">Fast</span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Connexion</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-brand-red text-sm rounded-xl px-4 py-3 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email ou téléphone</label>
            <input
              type="text"
              autoComplete="username"
              value={identity}
              onChange={e => setIdentity(e.target.value)}
              placeholder="Email ou 0XX XXX XXX"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-sm transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              >
                <EyeIcon open={showPwd} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !identity.trim() || !password}
            className="bg-brand-red text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 hover:bg-red-700 active:scale-[0.99] transition-all mt-1"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}
