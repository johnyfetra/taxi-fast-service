'use client'
import { usePathname } from 'next/navigation'
import { IconHome, IconBarChart, IconUsers, IconBike, IconRoute, IconDriver } from '@/components/icons'
import LogoutDialog from '@/components/admin/LogoutDialog'

const NAV = [
  { href: '/admin',             label: 'Commandes', Icon: IconHome },
  { href: '/admin/analytics',   label: 'Analytics', Icon: IconBarChart },
  { href: '/admin/conducteurs', label: 'Chauffeurs', Icon: IconDriver },
  { href: '/admin/flotte',      label: 'Flotte',    Icon: IconBike },
  { href: '/admin/tournee',     label: 'Planning',  Icon: IconRoute },
]


export default function AdminNav() {
  const path = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {NAV.map(({ href, label, Icon }) => {
          const active = path === href || (href !== '/admin' && path.startsWith(href))
          return (
            <a
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${active ? 'text-brand-red' : 'text-gray-400'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </a>
          )
        })}
        <div className="flex-1">
          <LogoutDialog variant="mobile" />
        </div>
      </div>
    </nav>
  )
}
