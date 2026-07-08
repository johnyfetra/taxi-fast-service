'use client'
import { useState, useCallback, useRef } from 'react'
import type { Location } from '@/lib/types'

interface GeoResult {
  label: string
  lat: number
  lng: number
}

interface Props {
  label: string
  placeholder?: string
  value: Location | null
  onChange: (loc: Location) => void
}

export default function AddressSearch({ label, placeholder, value, onChange }: Props) {
  const [query, setQuery] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks if pointer is pressed inside the list — prevents blur from closing dropdown
  const listPointerDownRef = useRef(false)
  const listId = `${label.replace(/[\s']/g, '-')}-suggestions`

  const handleInput = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
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
    // Cancel any pending debounce so it doesn't re-open the dropdown
    if (debounceRef.current) clearTimeout(debounceRef.current)
    listPointerDownRef.current = false
    setQuery(item.label)
    setSuggestions([])
    setOpen(false)
    onChange({ label: item.label, lat: item.lat, lng: item.lng })
  }, [onChange])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!listPointerDownRef.current) {
        setOpen(false)
      }
    }, 200)
  }, [])

  return (
    // z-index 1000 > leaflet-pane (z-index 400) — dropdown always on top of the map
    <div style={{ position: 'relative', zIndex: 1000 }}>
      <label className="block text-sm font-medium text-brand-black mb-1">{label}</label>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Rechercher une adresse…'}
          aria-label={label}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12 pr-10"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
            <svg className="animate-spin w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          // pointerdown on the list prevents blur from closing it prematurely
          onPointerDown={() => { listPointerDownRef.current = true }}
          onPointerUp={() => { listPointerDownRef.current = false }}
          style={{ position: 'absolute', zIndex: 9999, left: 0, right: 0, top: '100%' }}
          className="mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto"
        >
          {suggestions.map((item, i) => (
            <li
              key={i}
              role="option"
              aria-selected={false}
              className="px-4 py-3 cursor-pointer hover:bg-brand-gray active:bg-red-50 text-sm border-b border-gray-100 last:border-0 leading-snug"
              onPointerDown={() => { listPointerDownRef.current = true }}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
