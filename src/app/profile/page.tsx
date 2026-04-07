'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, CardBody, Badge, Button, FormGroup, Input, Select, Loading, Grid } from '@/components/ui'
import toast from 'react-hot-toast'

const ROLE_COLOR: Record<string,string> = { SUPER_ADMIN:'purple', ADMIN:'blue', RECEPTION:'teal', DESIGNER:'orange', PRINTING:'yellow', PRODUCTION:'green', USER:'gray' }

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const isAdmin = ['SUPER_ADMIN','ADMIN'].includes(user?.role)

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [ownForm, setOwnForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [adminForm, setAdminForm] = useState({ userId:'', newPassword:'', confirmPassword:'' })
  const [ownSaving, setOwnSaving] = useState(false)
  const [adminSaving, setAdminSaving] = useState(false)

  useEffect(() => {
    if (isAdmin) { setLoading(true); fetch('/api/users').then(r=>r.json()).then(us=>{ setUsers(Array.isArray(us)?us:[]); setLoading(false) }) }
  }, [isAdmin])

  async function handleOwnChange(e: React.FormEvent) {
    e.preventDefault()
    if (ownForm.newPassword !== ownForm.confirmPassword) { toast.error('Passwords do not match'); return }
    setOwnSaving(true)
    try {
      const res = await fetch('/api/users/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ currentPassword:ownForm.currentPassword, newPassword:ownForm.newPassword }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('✅ Password changed!')
      setOwnForm({ currentPassword:'', newPassword:'', confirmPassword:'' })
    } catch(e: any) { toast.error(e.message||'Failed') }
    setOwnSaving(false)
  }

  async function handleAdminChange(e: React.FormEvent) {
    e.preventDefault()
    if (!adminForm.userId) { toast.error('Select a user'); return }
    if (adminForm.newPassword !== adminForm.confirmPassword) { toast.error('Passwords do not match'); return }
    setAdminSaving(true)
    try {
      const res = await fetch('/api/users/change-password', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId:adminForm.userId, newPassword:adminForm.newPassword, forceChange:true }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const u = users.find(u=>u.id===adminForm.userId)
      toast.success(`✅ Password reset for ${u?.name}!`)
      setAdminForm({ userId:'', newPassword:'', confirmPassword:'' })
    } catch(e: any) { toast.error(e.message||'Failed') }
    setAdminSaving(false)
  }

  const initials = user?.name?.split(' ').map((n: string)=>n[0]).join('').slice(0,2).toUpperCase()||'U'

  const PasswordMatch = ({ p1, p2 }: { p1: string; p2: string }) => p2 ? (
    <div style={{ fontSize:12, color:p1===p2?'#10b981':'#ef4444', marginBottom:10 }}>
      {p1===p2?'✔ Passwords match':'✗ Passwords do not match'}
    </div>
  ) : null

  return (
    <PageShell title="My Profile & Password">
      <div style={{ maxWidth:900, margin:'0 auto' }} className="animate-in">
        {/* Profile Card */}
        <Card style={{ marginBottom:20 }}>
          <CardHeader><CardTitle>My Profile</CardTitle></CardHeader>
          <CardBody>
            <div style={{ display:'flex', alignItems:'center', gap:20 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'linear-gradient(135deg,#8b5cf6,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials}</div>
              <div>
                <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{user?.name}</div>
                <div style={{ fontSize:13, color:'#8892a4', marginBottom:6 }}>@{user?.email}</div>
                <Badge color={ROLE_COLOR[user?.role]||'gray'}>{user?.role?.replace('_',' ')}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Grid cols={isAdmin?2:1} gap={20}>
          {/* Own Password */}
          <Card>
            <CardHeader><CardTitle>🔐 Change My Password</CardTitle></CardHeader>
            <CardBody>
              <form onSubmit={handleOwnChange}>
                <FormGroup label="Current Password *"><Input type="password" value={ownForm.currentPassword} onChange={e=>setOwnForm(p=>({...p,currentPassword:e.target.value}))} required /></FormGroup>
                <FormGroup label="New Password *"><Input type="password" value={ownForm.newPassword} onChange={e=>setOwnForm(p=>({...p,newPassword:e.target.value}))} required minLength={6} /></FormGroup>
                <FormGroup label="Confirm New Password *"><Input type="password" value={ownForm.confirmPassword} onChange={e=>setOwnForm(p=>({...p,confirmPassword:e.target.value}))} required /></FormGroup>
                <PasswordMatch p1={ownForm.newPassword} p2={ownForm.confirmPassword} />
                <Button variant="primary" type="submit" disabled={ownSaving} style={{ width:'100%', justifyContent:'center' }}>{ownSaving?'Changing...':'🔐 Change My Password'}</Button>
              </form>
            </CardBody>
          </Card>

          {/* Admin Reset */}
          {isAdmin && (
            <Card>
              <CardHeader><CardTitle>👑 Reset Any User Password</CardTitle></CardHeader>
              <CardBody>
                <div style={{ background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:11, color:'#f59e0b' }}>
                  ⚠ Admin can reset any user password without knowing their current password.
                </div>
                <form onSubmit={handleAdminChange}>
                  <FormGroup label="Select User *">
                    <Select value={adminForm.userId} onChange={e=>setAdminForm(p=>({...p,userId:e.target.value}))} required>
                      <option value="">-- Select User --</option>
                      {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.username}) — {u.role.replace('_',' ')}</option>)}
                    </Select>
                  </FormGroup>
                  <FormGroup label="New Password *"><Input type="password" value={adminForm.newPassword} onChange={e=>setAdminForm(p=>({...p,newPassword:e.target.value}))} required minLength={6} /></FormGroup>
                  <FormGroup label="Confirm Password *"><Input type="password" value={adminForm.confirmPassword} onChange={e=>setAdminForm(p=>({...p,confirmPassword:e.target.value}))} required /></FormGroup>
                  <PasswordMatch p1={adminForm.newPassword} p2={adminForm.confirmPassword} />
                  <Button variant="primary" type="submit" disabled={adminSaving} style={{ width:'100%', justifyContent:'center' }}>{adminSaving?'Resetting...':'👑 Reset Password'}</Button>
                </form>
              </CardBody>
            </Card>
          )}
        </Grid>

        {/* Users Table (admin) */}
        {isAdmin && (
          <Card style={{ marginTop:20 }}>
            <CardHeader><CardTitle>All Users — Quick Select</CardTitle></CardHeader>
            {loading ? <Loading /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Mobile</th><th>Status</th><th>Select</th></tr></thead>
                  <tbody>
                    {users.map(u=>(
                      <tr key={u.id}>
                        <td style={{ fontWeight:500 }}>{u.name}</td>
                        <td style={{ fontFamily:'monospace', fontSize:11, color:'#8892a4' }}>{u.username}</td>
                        <td><Badge color={ROLE_COLOR[u.role]||'gray'}>{u.role.replace('_',' ')}</Badge></td>
                        <td style={{ color:'#8892a4' }}>{u.mobile||'—'}</td>
                        <td><Badge color={u.active?'green':'red'}>{u.active?'Active':'Inactive'}</Badge></td>
                        <td><Button size="sm" onClick={()=>setAdminForm(p=>({...p,userId:u.id}))}>Select →</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </PageShell>
  )
}
