'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { ...form, redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/dashboard')
    else toast.error('Invalid username or password')
  }

  const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' }}>
      <div style={{ background: '#161b27', border: '1px solid #2a3348', borderRadius: 16, padding: 40, width: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: '#3b82f6', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🖨️</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>PrintFlow MIS</div>
            <div style={{ fontSize: 12, color: '#8892a4' }}>Printing Shop Management</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Username</label>
            <input style={inp} type="text" placeholder="Enter username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Password</label>
            <input style={inp} type="password" placeholder="Enter password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 14, background: '#1e2535', borderRadius: 10, border: '1px solid #2a3348', fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Default Credentials</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[['admin','admin123','Super Admin'],['reception','reception123','Reception'],['designer','designer123','Designer'],['printing','printing123','Printing'],['production','production123','Production']].map(([u,p,r]) => (
              <div key={u} style={{ color: '#8892a4', cursor: 'pointer', padding: '2px 0' }} onClick={() => setForm({ username: u, password: p })}>
                <span style={{ color: '#3b82f6' }}>{u}</span> / <span style={{ color: '#10b981' }}>{p}</span>
                <div style={{ fontSize: 9, color: '#8892a4' }}>{r}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#8892a4', marginTop: 6 }}>Click any row to auto-fill</div>
        </div>
      </div>
    </div>
  )
}
