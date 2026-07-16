'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { Location } from '@/lib/types'

interface GeoResult {
  label: string
  lat: number
  lng: number
}

interface Props {
  activeField: 'pickup' | 'dropoff'
  pickup: Location | null
  dropoff: Location | null
  onPickupChange: (loc: Location) => void
  onDropoffChange: (loc: Location) => void
  onClose: () => void
  pickupPlaceholder: string
  dropoffPlaceholder?: string
  showDropoff?: boolean
}

function parseParts(label: string) {
  const parts = label.split(', ')
  return { main: parts[0], rest: parts.slice(1).join(', ') }
}

export default function SearchModal({
  activeField: initialActiveField,
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onClose,
  pickupPlaceholder,
  dropoffPlaceholder = 'Où voulez-vous aller ?',
  showDropoff = true,
}: Props) {
  const [active, setActive] = useState<'pickup' | 'dropoff'>(initialActiveField)
  const [query, setQuery] = useState(
    initialActiveField === 'pickup' ? (pickup?.label ?? '') : (dropoff?.label ?? '')
  )
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset query + focus when active field changes
  useEffect(() => {
    const current = active === 'pickup' ? (pickup?.label ?? '') : (dropoff?.label ?? '')
    setQuery(current)
    setSuggestions([])
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const handleInput = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        const data: GeoResult[] = res.ok ? await res.json() : []
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [])

  const handleSelect = useCallback((item: GeoResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const loc: Location = { label: item.label, lat: item.lat, lng: item.lng }
    if (active === 'pickup') {
      onPickupChange(loc)
      // Auto-switch to dropoff if not yet set
      if (showDropoff && !dropoff) {
        setActive('dropoff')
        return
      }
    } else {
      onDropoffChange(loc)
    }
    onClose()
  }, [active, dropoff, showDropoff, onPickupChange, onDropoffChange, onClose])

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const switchActive = (field: 'pickup' | 'dropoff') => {
    if (field !== active) setActive(field)
  }

  return (
    /*
     * pointer-events-none sur le wrapper : le header sticky et la carte restent
     * interactifs derrière l'overlay transparent.
     * Seul le sheet lui-même ré-active pointer-events-auto.
     */
    <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col">

      {/* Espace header (~50px) — laisse le header visible et cliquable */}
      <div className="flex-none h-[52px]" />

      {/* Ligne sheet centrée */}
      <div className="flex-1 min-h-0 flex justify-center">

        {/* Côtés transparents desktop (clic passe au travers) */}
        <div className="hidden sm:block flex-1" />

        {/* Sheet de recherche — max-w-lg, même largeur que la page */}
        <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-[#141416] rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">

      {/* Poignée + header */}
      <div className="px-4 pt-3 pb-3 border-b border-gray-100 dark:border-[#1E1E20]">
        {/* Poignée décorative */}
        <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#3A3A3C] mx-auto mb-3" aria-hidden="true" />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2A2C] transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-brand-black dark:text-white">
            Indiquer votre itinéraire
          </h2>
        </div>
      </div>

      {/* Champs Départ / Arrivée */}
      <div className="px-4 py-3 flex flex-col gap-2 border-b border-gray-100 dark:border-[#1E1E20]">

        {/* Départ */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Champ départ"
          onClick={() => switchActive('pickup')}
          onKeyDown={(e) => e.key === 'Enter' && switchActive('pickup')}
          className={[
            'flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors',
            active === 'pickup'
              ? 'bg-white dark:bg-[#1C1C1E] border-2 border-brand-black dark:border-white shadow-sm'
              : 'bg-gray-50 dark:bg-[#1E1E20] border border-gray-200 dark:border-[#2A2A2C]',
          ].join(' ')}
        >
          {/* Icône */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-red flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="9" />
          </svg>

          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 flex-shrink-0">De</span>

          {active === 'pickup' ? (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                placeholder={pickupPlaceholder}
                autoComplete="off"
                className="flex-1 bg-transparent text-sm text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none min-w-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClear() }}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label="Effacer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <span className={[
              'flex-1 text-sm truncate',
              pickup ? 'text-brand-black dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500',
            ].join(' ')}>
              {pickup?.label || pickupPlaceholder}
            </span>
          )}
        </div>

        {/* Arrivée */}
        {showDropoff && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Champ arrivée"
            onClick={() => switchActive('dropoff')}
            onKeyDown={(e) => e.key === 'Enter' && switchActive('dropoff')}
            className={[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors',
              active === 'dropoff'
                ? 'bg-white dark:bg-[#1C1C1E] border-2 border-brand-black dark:border-white shadow-sm'
                : 'bg-gray-50 dark:bg-[#1E1E20] border border-gray-200 dark:border-[#2A2A2C]',
            ].join(' ')}
          >
            {/* Icône destination */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 flex-shrink-0" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>

            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 flex-shrink-0">À</span>

            {active === 'dropoff' ? (
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  placeholder={dropoffPlaceholder}
                  autoComplete="off"
                  className="flex-1 bg-transparent text-sm text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none min-w-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClear() }}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Effacer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              <span className={[
                'flex-1 text-sm truncate',
                dropoff ? 'text-brand-black dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500',
              ].join(' ')}>
                {dropoff?.label || dropoffPlaceholder}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Liste de suggestions — en flux normal, s'adapte quand le clavier apparaît */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8" aria-live="polite" aria-label="Recherche en cours">
            <svg className="animate-spin w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        )}

        {!loading && suggestions.length === 0 && query.length >= 3 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8 px-4">
            Aucun résultat pour &ldquo;{query}&rdquo;
          </p>
        )}

        {!loading && query.length > 0 && query.length < 3 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8 px-4">
            Continuez à taper pour rechercher…
          </p>
        )}

        {suggestions.map((item, i) => {
          const { main, rest } = parseParts(item.label)
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E1E20] active:bg-red-50 dark:active:bg-brand-red/10 border-b border-gray-50 dark:border-[#1E1E20] transition-colors last:border-b-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-black dark:text-white truncate">{main}</p>
                {rest && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{rest}</p>}
              </div>
            </button>
          )
        })}
      </div>

      </div>{/* fin sheet max-w-lg */}

        {/* Côté droit transparent desktop */}
        <div className="hidden sm:block flex-1" />

      </div>{/* fin ligne sheet */}
    </div>
  )
}
