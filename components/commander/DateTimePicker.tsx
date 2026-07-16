'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
]
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const ITEM_H = 44
const VISIBLE = 5
const SCROLL_PAD = Math.floor(VISIBLE / 2) * ITEM_H // 88px

function pad(n: number) { return String(n).padStart(2, '0') }
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function startOffset(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7 }

function parseISO(v: string) {
  if (!v || v.length < 16) return null
  return {
    year: +v.slice(0, 4), month: +v.slice(5, 7) - 1,
    day: +v.slice(8, 10), hour: +v.slice(11, 13), min: +v.slice(14, 16),
  }
}
function toISO(y: number, m: number, d: number, h: number, min: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}`
}
function formatDisplay(v: string) {
  const p = parseISO(v)
  if (!p) return null
  return `${pad(p.day)}/${pad(p.month + 1)}/${p.year}  ${pad(p.hour)}:${pad(p.min)}`
}

function ScrollCol({ values, selected, onSelect }: {
  values: number[]
  selected: number
  onSelect: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef(selected)

  useEffect(() => {
    if (!ref.current) return
    const idx = values.indexOf(selected)
    if (idx >= 0) ref.current.scrollTop = idx * ITEM_H
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (prev.current === selected) return
    prev.current = selected
    const idx = values.indexOf(selected)
    if (idx >= 0) ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
  }, [selected, values])

  const handleScroll = useCallback(() => {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const v = values[Math.max(0, Math.min(values.length - 1, idx))]
    if (v !== selected) onSelect(v)
  }, [values, selected, onSelect])

  return (
    <div className="relative flex-1" style={{ height: VISIBLE * ITEM_H, minWidth: 52 }}>
      {/* Center highlight bar */}
      <div aria-hidden="true"
        className="absolute inset-x-1 rounded-xl bg-brand-red pointer-events-none z-10"
        style={{ top: SCROLL_PAD, height: ITEM_H }}
      />
      {/* Fade top */}
      <div aria-hidden="true"
        className="absolute inset-x-0 top-0 pointer-events-none z-20 bg-gradient-to-b from-white dark:from-[#141416] to-transparent"
        style={{ height: SCROLL_PAD }}
      />
      {/* Fade bottom */}
      <div aria-hidden="true"
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20 bg-gradient-to-t from-white dark:from-[#141416] to-transparent"
        style={{ height: SCROLL_PAD }}
      />
      {/* Scrollable list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: SCROLL_PAD,
          paddingBottom: SCROLL_PAD,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
      >
        {values.map((v) => (
          <div
            key={v}
            style={{ scrollSnapAlign: 'center', height: ITEM_H }}
            onClick={() => {
              onSelect(v)
              const idx = values.indexOf(v)
              ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' })
            }}
            className={[
              'flex items-center justify-center text-lg font-bold cursor-pointer select-none relative z-30',
              v === selected ? 'text-white' : 'text-gray-400 dark:text-gray-600',
            ].join(' ')}
          >
            {pad(v)}
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  value: string
  onChange: (v: string) => void
  min?: string
}

export default function DateTimePicker({ value, onChange, min }: Props) {
  const now = new Date()
  const parsed = parseISO(value)

  const [open, setOpen] = useState(false)
  const [viewY, setViewY] = useState(parsed?.year ?? now.getFullYear())
  const [viewM, setViewM] = useState(parsed?.month ?? now.getMonth())
  const [selDate, setSelDate] = useState<{ y: number; m: number; d: number } | null>(
    parsed ? { y: parsed.year, m: parsed.month, d: parsed.day } : null
  )
  const [hour, setHour] = useState(parsed?.hour ?? now.getHours())
  const [minute, setMinute] = useState(parsed?.min ?? 0)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Sync from value prop
  useEffect(() => {
    const p = parseISO(value)
    if (p) {
      setViewY(p.year); setViewM(p.month)
      setSelDate({ y: p.year, m: p.month, d: p.day })
      setHour(p.hour); setMinute(p.min)
    } else {
      setSelDate(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1) } else setViewM(m => m - 1)
  }
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1) } else setViewM(m => m + 1)
  }

  const handleToday = () => {
    const t = new Date()
    setViewY(t.getFullYear()); setViewM(t.getMonth())
    setSelDate({ y: t.getFullYear(), m: t.getMonth(), d: t.getDate() })
  }

  const handleClear = () => {
    setSelDate(null)
    onChange('')
    setOpen(false)
  }

  const handleValidate = () => {
    if (!selDate) return
    onChange(toISO(selDate.y, selDate.m, selDate.d, hour, minute))
    setOpen(false)
  }

  const minP = parseISO(min ?? '')
  const isDisabled = (d: number) => {
    if (!minP) return false
    if (viewY < minP.year) return true
    if (viewY === minP.year && viewM < minP.month) return true
    if (viewY === minP.year && viewM === minP.month && d < minP.day) return true
    return false
  }
  const isSelected = (d: number) => selDate?.y === viewY && selDate?.m === viewM && selDate?.d === d
  const isToday = (d: number) => now.getFullYear() === viewY && now.getMonth() === viewM && now.getDate() === d

  const dimCount = daysInMonth(viewY, viewM)
  const offset = startOffset(viewY, viewM)
  const prevDimCount = daysInMonth(viewY, viewM === 0 ? 11 : viewM - 1)
  const display = formatDisplay(value)

  return (
    <div ref={wrapRef} className="relative">

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-base min-h-[52px] transition-all text-left bg-white dark:bg-[#1C1C1E]',
          open
            ? 'border-brand-red'
            : 'border-gray-200 dark:border-[#2A2A2C]',
        ].join(' ')}
      >
        <span className={['flex-1 font-mono tracking-wide', display ? 'text-brand-black dark:text-white font-medium' : 'text-gray-400 dark:text-gray-500'].join(' ')}>
          {display ?? 'jj/mm/aaaa  --:--'}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className={open ? 'text-brand-red flex-shrink-0' : 'text-gray-400 dark:text-gray-500 flex-shrink-0'}>
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {/* Picker panel — opens upward */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-[2000] bg-white dark:bg-[#141416] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#1E1E20] overflow-hidden">
          <div className="flex">

            {/* Left — Calendar */}
            <div className="flex-1 p-3 min-w-0">

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2C] text-gray-500 dark:text-gray-400 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <span className="text-sm font-bold text-brand-black dark:text-white capitalize">
                  {MONTHS[viewM]} {viewY}
                </span>
                <button type="button" onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2C] text-gray-500 dark:text-gray-400 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-0.5">
                {DAY_HEADERS.map((d, i) => (
                  <div key={i} className="flex items-center justify-center h-6 text-[9px] font-bold text-gray-400 uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7">
                {/* Prev month tail */}
                {Array.from({ length: offset }, (_, i) => (
                  <div key={`p${i}`} className="flex items-center justify-center h-8 text-[11px] text-gray-300 dark:text-gray-700">
                    {prevDimCount - offset + i + 1}
                  </div>
                ))}
                {/* Current month days */}
                {Array.from({ length: dimCount }, (_, i) => {
                  const d = i + 1
                  const disabled = isDisabled(d)
                  const sel = isSelected(d)
                  const today = isToday(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelDate({ y: viewY, m: viewM, d })}
                      className={[
                        'flex items-center justify-center h-8 rounded-lg text-[11px] font-semibold transition-all',
                        disabled
                          ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                          : sel
                          ? 'bg-brand-red text-white'
                          : today
                          ? 'text-brand-red ring-1 ring-brand-red ring-inset'
                          : 'text-brand-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#2A2A2C]',
                      ].join(' ')}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="w-px self-stretch bg-gray-100 dark:bg-[#1E1E20]" />

            {/* Right — Time scroll columns */}
            <div className="flex items-center gap-0.5 px-2 py-3">
              <ScrollCol values={HOURS} selected={hour} onSelect={setHour} />
              <span className="text-xl font-black text-brand-black dark:text-white self-center pb-1 select-none">:</span>
              <ScrollCol values={MINUTES} selected={minute} onSelect={setMinute} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-[#1E1E20]">
            <div className="flex gap-4">
              <button type="button" onClick={handleClear}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-medium">
                Effacer
              </button>
              <button type="button" onClick={handleToday}
                className="text-sm text-brand-red hover:text-red-700 transition-colors font-semibold">
                Aujourd&apos;hui
              </button>
            </div>
            <button
              type="button"
              onClick={handleValidate}
              disabled={!selDate}
              className="px-5 py-2 rounded-xl bg-brand-red text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
