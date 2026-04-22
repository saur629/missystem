'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
     {href: '/activity', icon: '📝' , label: 'Activity Panel' , roles: ['SUPER_ADMIN','ADMIN'] },

  ]},
  { section: 'Orders', items: [
    { href: '/orders', icon: '📋', label: 'All Orders' },
   
    { href: '/designer', icon: '🎨', label: 'Designer Panel', roles: ['SUPER_ADMIN','ADMIN','DESIGNER'] },
    { href: '/printing', icon: '🖨️', label: 'Printing Room', roles: ['SUPER_ADMIN','ADMIN','PRINTING'] },
    { href: '/production', icon: '📦', label: 'Production', roles: ['SUPER_ADMIN','ADMIN','PRODUCTION'] },
  ]},
  { section: 'Finance', items: [
    { href: '/quotation', icon: '📝', label: 'Quotations', roles: ['SUPER_ADMIN','ADMIN','RECEPTION'] },
    { href: '/invoice', icon: '🧾', label: 'Invoices', roles: ['SUPER_ADMIN','ADMIN'] },
    { href: '/payments', icon: '💳', label: 'Payments', roles: ['SUPER_ADMIN','ADMIN'] },
    { href: '/purchase', icon: '🛒', label: 'Purchase', roles: ['SUPER_ADMIN','ADMIN'] },
  ]},
  { section: 'HR & Reports', items: [
    { href: '/attendance', icon: '🕐', label: 'Attendance' },
    { href: '/reports', icon: '📈', label: 'Reports', roles: ['SUPER_ADMIN','ADMIN'] },
  ]},
  { section: 'Admin', items: [
    { href: '/inventory', icon: '📦', label: 'Inventory' }, 
    { href: '/customers', icon: '👥', label: 'Customers' },
    { href: '/access-control', icon: '🔐', label: 'Access Control', roles: ['SUPER_ADMIN'] },
    { href: '/masters', icon: '⚙️', label: 'Masters', roles: ['SUPER_ADMIN','ADMIN'] },
    { href: '/sms', icon: '📱', label: 'SMS Alerts', roles: ['SUPER_ADMIN','ADMIN'] },
   
  ]},
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'USER'
  const name = session?.user?.name || 'User'
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside style={{ width: 220, flexShrink: 0, background: '#161b27', borderRight: '1px solid #2a3348', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Brand */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2a3348', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🖨️</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>R DIGITAL MIS</div>
          <div style={{ fontSize: 10, color: '#8892a4' }}>v2.0 — {role.replace('_',' ')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 0' }}>
        {NAV.map(section => {
          const visible = section.items.filter(item => !(item as any).roles || (item as any).roles.includes(role))
          if (!visible.length) return null
          return (
            <div key={section.section}>
              <div style={{ padding: '8px 14px 3px', fontSize: 9, fontWeight: 700, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '1px' }}>{section.section}</div>
              {visible.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', margin: '1px 6px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', background: active ? 'rgba(59,130,246,.12)' : 'transparent', color: active ? '#3b82f6' : '#8892a4', transition: 'all .15s' }}>
                      <span style={{ fontSize: 14, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: '1px solid #2a3348' }}>
        <Link href="/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#1e2535', border: '1px solid #2a3348', marginBottom: 6, cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 10, color: '#8892a4' }}>🔐 Change Password</div>
            </div>
          </div>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', padding: '7px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
