'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notif {
  id: string
  title: string
  body: string | null
  order_id: string | null
  read: boolean
  created_at: string
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}j`
}

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.read).length

  const load = async () => {
    const res = await fetch('/api/admin/notifications')
    if (res.ok) {
      const d = await res.json()
      setNotifs(d.notifications ?? [])
    }
  }

  const markAllRead = async () => {
    await fetch('/api/admin/notifications', { method: 'PATCH' }).catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  useEffect(() => {
    load()

    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('admin-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'recipient=eq.admin',
      }, payload => {
        const n = payload.new as Notif
        setNotifs(prev => [n, ...prev].slice(0, 30))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen(v => !v)
    if (!open && unread > 0) markAllRead()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          open ? 'bg-brand-red text-white' : 'bg-brand-gray text-gray-600 hover:bg-gray-200'
        }`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand-red text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-brand-black text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-red hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">Aucune notification</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 last:border-0 ${!n.read ? 'bg-red-50/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-brand-black' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{fmtRelative(n.created_at)}</span>
                  </div>
                  {n.body && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
