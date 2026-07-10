'use client'
import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { Location } from '@/lib/types'

interface GeoResult {
  label: string
  lat: number
  lng: number
}

interface Props {
  label?: string
  placeholder?: string
  value: Location | null
  onChange: (loc: Location) => void
  bare?: boolean
}

export interface AddressSearchHandle {
  focus: () => void
}

function parseParts(label: string) {
  const parts = label.split(', ')
  return { main: parts[0], rest: parts.slice(1).join(', ') }
}

function formatAddressInline(label: string) {
  const { main, rest } = parseParts(label)
  if (!rest) {
    return <span className="text-sm font-medium text-brand-black dark:text-white">{main}</span>
  }
  return (
    <span className="text-sm min-w-0">
      <span className="font-semibold text-brand-black dark:text-white">{main}</span>
      <span className="text-gray-300 dark:text-gray-500">, </span>
      <span className="text-gray-500 dark:text-gray-400">{rest}</span>
    </span>
  )
}

const AddressSearch = forwardRef<AddressSearchHandle, Props>(function AddressSearch(
  { label, placeholder, value, onChange, bare = false },
  ref
) {
  const [query, setQuery] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  // En mode bare, on sépare "en train d'éditer" de "isFocused" pour éviter
  // que des événements indirects (auto-focus arrivée, etc.) cachent le display
  const [isEditingBare, setIsEditingBare] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listPointerDownRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = `addr-${(label ?? 'field').replace(/[\s']/g, '-')}-suggestions`

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsFocused(true)
      if (bare) setIsEditingBare(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
  }))

  useEffect(() => {
    setQuery(value?.label ?? '')
  }, [value?.label])

  useEffect(() => {
    if (!open || !containerRef.current) {
      setDropdownRect(null)
      return
    }
    const updatePos = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const card = containerRef.current?.closest('[class*="rounded-2xl"]') as HTMLElement | null
      const cardRect = card?.getBoundingClientRect() ?? rect
      // Ancre = bas du champ actif + 10px d'espace visuel
      const top = rect.bottom + 10
      if (window.innerWidth < 640) {
        const margin = 16
        setDropdownRect({ top, left: margin, width: window.innerWidth - margin * 2 })
      } else {
        setDropdownRect({ top, left: cardRect.left, width: cardRect.width })
      }
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open])

  const handleInput = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        const data: GeoResult[] = res.ok ? await res.json() : []
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [])

  const handleSelect = useCallback((item: GeoResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    listPointerDownRef.current = false
    setQuery(item.label)
    setSuggestions([])
    setOpen(false)
    setIsFocused(false)
    setIsEditingBare(false)
    onChange({ label: item.label, lat: item.lat, lng: item.lng })
  }, [onChange])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!listPointerDownRef.current) {
        setOpen(false)
        setIsFocused(false)
        setIsEditingBare(false)
        setQuery(value?.label ?? '')
      }
    }, 200)
  }, [value?.label])

  // En mode bare : n'affiche le display que si une valeur est confirmée ET l'utilisateur n'édite pas activement
  // (isEditingBare, pas isFocused — pour éviter que l'auto-focus arrivée cache le départ)
  const showDisplay = bare ? (!!value && !isEditingBare) : (!!value && !isFocused)

  const openDisplay = () => {
    setIsFocused(true)
    if (bare) setIsEditingBare(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>}

      <div className="relative">
        {/* Display value — shown when confirmed and not focused */}
        {bare ? (
          <div
            style={{ display: showDisplay ? 'block' : 'none' }}
            onClick={openDisplay}
            className="w-full cursor-pointer truncate leading-normal"
          >
            {value && formatAddressInline(value.label)}
          </div>
        ) : (
          <div
            style={{ display: showDisplay ? 'flex' : 'none' }}
            onClick={openDisplay}
            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] cursor-text items-center min-h-[52px] overflow-hidden"
          >
            {value && formatAddressInline(value.label)}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { setIsFocused(true); if (bare) setIsEditingBare(true); if (suggestions.length > 0) setOpen(true) }}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Rechercher une adresse…'}
          aria-label={label ?? placeholder ?? 'Adresse'}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          style={bare
            ? { display: showDisplay ? 'none' : 'block', outline: 'none', boxShadow: 'none', border: 'none' }
            : { display: showDisplay ? 'none' : 'block' }
          }
          className={bare
            ? 'w-full bg-transparent text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base leading-normal'
            : 'w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-[52px] pr-10'
          }
        />

        {loading && !showDisplay && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
            <svg className="animate-spin w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown suggestions */}
      {open && suggestions.length > 0 && dropdownRect && (
        <ul
          id={listId}
          role="listbox"
          onPointerDown={() => { listPointerDownRef.current = true }}
          onPointerUp={() => { listPointerDownRef.current = false }}
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            zIndex: 99999,
          }}
          className="bg-white dark:bg-[#1E1E20] border border-gray-200 dark:border-[#2A2A2C] rounded-2xl shadow-2xl dark:shadow-black/60 max-h-56 overflow-y-auto py-1"
        >
          {suggestions.map((item, i) => {
            const { main, rest } = parseParts(item.label)
            return (
              <li
                key={i}
                role="option"
                aria-selected={false}
                className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2A2A2C] active:bg-red-50 dark:active:bg-brand-red/10 transition-colors"
                onPointerDown={() => { listPointerDownRef.current = true }}
                onClick={() => handleSelect(item)}
              >
                {/* Pin icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-brand-black dark:text-white truncate">{main}</p>
                  {rest && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{rest}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
})

export default AddressSearch
