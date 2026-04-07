'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e2535', color: '#e2e8f0', border: '1px solid #2a3348', fontSize: '13px' },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }} />
    </SessionProvider>
  )
}
