'use client'
import { useState } from 'react'

function LogoutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

interface Props {
  /** visual variant — sidebar uses 'sidebar', mobile nav uses 'mobile' */
  variant?: 'sidebar' | 'mobile'
}

export default function LogoutDialog({ variant = 'sidebar' }: Props) {
  const [open, setOpen] = useState(false)

  const trigger =
    variant === 'sidebar' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-white hover:bg-white/8 transition-all text-left"
      >
        <LogoutIcon size={18} />
        <span>Déconnexion</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-full flex flex-col items-center gap-0.5 py-2 text-gray-400 hover:text-brand-red transition-colors"
      >
        <LogoutIcon size={20} />
        <span className="text-[10px] font-medium leading-none">Quitter</span>
      </button>
    )

  return (
    <>
      {trigger}

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Card */}
          <div className="relative bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
            {/* Red top bar */}
            <div className="h-1 bg-brand-red w-full" />

            <div className="px-6 pt-5 pb-6 flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D81F26"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>

              <h2 id="logout-title" className="font-bold text-brand-black text-lg mb-1">
                Se déconnecter ?
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Vous serez redirigé vers la page de connexion.
              </p>

              <div className="flex flex-col gap-2 w-full">
                <form action="/api/auth/signout" method="post" className="w-full">
                  <button
                    type="submit"
                    className="w-full bg-brand-red text-white font-semibold py-3 rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all text-sm"
                  >
                    Oui, me déconnecter
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full bg-gray-100 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
