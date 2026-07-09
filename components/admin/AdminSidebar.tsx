'use client'
import { usePathname } from 'next/navigation'
import {
  IconHome, IconBarChart, IconUsers, IconBike,
  IconRoute, IconSettings, IconDriver,
} from '@/components/icons'
import { LogoMark } from '@/components/Logo'
import LogoutDialog from '@/components/admin/LogoutDialog'

const NAV = [
  { href: '/admin',             label: 'Commandes',   Icon: IconHome },
  { href: '/admin/analytics',   label: 'Analytics',   Icon: IconBarChart },
  { href: '/admin/clients',     label: 'Clients',     Icon: IconUsers },
  { href: '/admin/conducteurs', label: 'Conducteurs', Icon: IconDriver },
  { href: '/admin/flotte',      label: 'Flotte',      Icon: IconBike },
  { href: '/admin/tournee',     label: 'Planning',    Icon: IconRoute },
]

export default function AdminSidebar() {
  const path = usePathname()

  const NavLink = ({ href, label, Icon }: { href: string; label: string; Icon: typeof IconHome }) => {
    const active = path === href || (href !== '/admin' && path.startsWith(href))
    return (
      <a
        href={href}
        className={[
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          active
            ? 'bg-brand-red text-white shadow-sm'
            : 'text-gray-400 hover:text-white hover:bg-white/8',
        ].join(' ')}
      >
        <Icon size={18} />
        <span>{label}</span>
      </a>
    )
  }

  const tarifsActive = path.startsWith('/admin/tarifs')

  return (
    <aside className="w-56 shrink-0 bg-[#0D0D0F] flex flex-col border-r border-white/8 h-screen sticky top-0">
      {/* Logo block */}
      <div className="px-4 py-5 border-b border-white/8">
        <a href="/admin" className="flex items-center gap-3 group">
          <LogoMark height={28} className="shrink-0 group-hover:opacity-90 transition-opacity" />
          <div className="leading-tight">
            <p className="text-white font-black text-sm" style={{ letterSpacing: '-0.02em' }}>TAXI FAST</p>
            <p className="text-brand-red font-bold text-xs tracking-widest uppercase">Service</p>
          </div>
        </a>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-2">Navigation</p>
        {NAV.map(item => <NavLink key={item.href} {...item} />)}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/8 flex flex-col gap-0.5">
        <a
          href="/admin/tarifs"
          className={[
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            tarifsActive
              ? 'bg-brand-red text-white shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/8',
          ].join(' ')}
        >
          <IconSettings size={18} />
          <span>Tarifs</span>
        </a>
        <LogoutDialog variant="sidebar" />
      </div>
    </aside>
  )
}
