import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  if (!supabase) {
    // Supabase not configured — show setup notice instead of crashing
    return (
      <div className="min-h-screen bg-brand-gray flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h2 className="font-bold text-brand-black">Supabase non configuré</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Copiez <code className="bg-gray-100 px-1 rounded text-xs">.env.example</code> en <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code> et renseignez vos clés Supabase.
          </p>
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-brand-red underline"
          >
            Voir les clés API Supabase →
          </a>
        </div>
      </div>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="bg-brand-black text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-brand-red font-black text-lg">TFS</span>
          <span className="text-white font-semibold text-sm">Admin</span>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1"
          >
            Déconnexion
          </button>
        </form>
      </header>
      {children}
    </div>
  )
}
