'use client'
import { Sidebar } from './Sidebar'

interface Props {
  title: string
  action?: { label: string; onClick: () => void }
  children: React.ReactNode
}

export function PageShell({ title, action, children }: Props) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0f1117' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ height: 52, background: '#161b27', borderBottom: '1px solid #2a3348', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{title}</h1>
          {action && (
            <button onClick={action.onClick} style={{ padding: '7px 16px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {action.label}
            </button>
          )}
        </header>
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }} className="animate-in">
          {children}
        </div>
      </main>
    </div>
  )
}
