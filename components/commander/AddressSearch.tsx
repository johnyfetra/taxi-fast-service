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
}

export interface AddressSearchHandle {
  focus: () => void
}

function formatAddress(label: string) {
  const parts = label.split(', ')
  if (parts.length < 2) {
    return <span className="text-sm text-brand-black dark:text-white truncate">{label}</span>
  }
  return (
    <span className="text-sm truncate">
      {/* Quartier — texte principal, contraste max */}
      <strong className="font-semibold text-brand-black dark:text-white">{parts[0]}</strong>
      {parts.slice(1).map((part, i) => (
        <span key={i}>
          {/* Virgule séparateur */}
          <span className="text-gray-300 dark:text-gray-500">, </span>
          {i === 0
            ? /* Ville — contraste AA : gray-600 sur blanc (5.7:1), gray-300 sur #1C1C1E (10.5:1) */
              <span className="text-gray-600 dark:text-gray-300">{part}</span>
            : /* Région — contraste AA : gray-400 sur blanc (3.1:1 large), gray-400 sur #1C1C1E (5.8:1) */
              <span className="text-gray-400 dark:text-gray-400">{part}</span>
          }
        </span>
      ))}
    </span>
  )
}

const AddressSearch = forwardRef<AddressSearchHandle, Props>(function AddressSearch(
  { label, placeholder, value, onChange },
  ref
) {
  const [query, setQuery] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<GeoResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listPointerDownRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = `addr-${(label ?? 'field').replace(/[\s']/g, '-')}-suggestions`

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsFocused(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    },
  }))

  // Sync when value changes externally (e.g. geolocation sets pickup from parent)
  useEffect(() => {
    setQuery(value?.label ?? '')
  }, [value?.label])

  // Recalculate fixed dropdown position — escapes all stacking contexts including Leaflet
  useEffect(() => {
    if (!open || !containerRef.current) {
      setDropdownRect(null)
      return
    }
    const updatePos = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
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
    if (debounceRef.current) clearTimeout(debounceRef.current)
    listPointerDownRef.current = false
    setQuery(item.label)
    setSuggestions([])
    setOpen(false)
    setIsFocused(false)
    onChange({ label: item.label, lat: item.lat, lng: item.lng })
  }, [onChange])

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (!listPointerDownRef.current) {
        setOpen(false)
        setIsFocused(false)
        setQuery(value?.label ?? '')
      }
    }, 200)
  }, [value?.label])

  const showDisplay = !!value && !isFocused

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>}

      <div className="relative">
        {/* Formatted display — shown when a value is confirmed and field is not focused */}
        <div
          style={{ display: showDisplay ? 'flex' : 'none' }}
          onClick={() => {
            setIsFocused(true)
            setTimeout(() => {
              inputRef.current?.focus()
              inputRef.current?.select()
            }, 0)
          }}
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] cursor-text items-center min-h-[52px] overflow-hidden"
        >
          {value && formatAddress(value.label)}
        </div>

        {/* Real input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            setIsFocused(true)
            if (suggestions.length > 0) setOpen(true)
          }}
          onBlur={handleBlur}
          placeholder={placeholder ?? 'Rechercher une adresse…'}
          aria-label={label ?? placeholder ?? 'Adresse'}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          style={{ display: showDisplay ? 'none' : 'block' }}
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#1C1C1E] text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-[52px] pr-10"
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
          className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#2A2A2C] rounded-xl shadow-xl dark:shadow-black/40 max-h-52 overflow-y-auto"
        >
          {suggestions.map((item, i) => (
            <li
              key={i}
              role="option"
              aria-selected={false}
              className="px-4 py-3 cursor-pointer hover:bg-brand-gray dark:hover:bg-[#2A2A2C] active:bg-red-50 dark:active:bg-brand-red/10 border-b border-gray-100 dark:border-[#2A2A2C] last:border-0 leading-snug"
              onPointerDown={() => { listPointerDownRef.current = true }}
              onClick={() => handleSelect(item)}
            >
              {formatAddress(item.label)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default AddressSearch
