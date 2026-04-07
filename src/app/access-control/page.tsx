'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, StatCard, Loading, Empty } from '@/components/ui'
import { Grid } from '@/components/ui'
import toast from 'react-hot-toast'

const ROLE_COLOR: Record<string,string> = { SUPER_ADMIN:'purple', ADMIN:'blue', RECEPTION:'teal', DESIGNER:'orange', PRINTING:'yellow', PRODUCTION:'green', USER:'gray' }

const PERMISSIONS = [
  ['Dashboard',              true,  true,  true,  true,  true,  true,  true ],
  ['View All Orders',        true,  true,  true,  true,  true,  true,  false],
  ['Create Orders',          true,  true,  true,  false, false, false, false],
  ['Update Order Status',    true,  true,  true,  true,  true,  true,  false],
  ['Designer Panel',         true,  true,  false, true,  false, false, false],
  ['Printing Panel',         true,  true,  false, false, true,  false, false],
  ['Production Panel',       true,  true,  false, false, false, true,  false],
  ['Quotations',             true,  true,  true,  false, false, false, false],
  ['Invoices',               true,  true,  false, false, false, false, false],
  ['Payments',               true,  true,  false, false, false, false, false],
  ['Purchase Orders',        true,  true,  false, false, false, false, false],
  ['Reports',                true,  true,  false, false, false, false, false],
  ['Attendance',             true,  true,  true,  true,  true,  true,  false],
  ['Access Control',         true,  false, false, false, false, false, false],
  ['Masters / Settings',     true,  true,  false, false, false, false, false],
  ['SMS Alerts',             true,  true,  false, false, false, false, false],
]
const ROLES = ['SUPER_ADMIN','ADMIN','RECEPTION','DESIGNER','PRINTING','PRODUCTION','USER']

export default function AccessControlPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', username:'', password:'', role:'RECEPTION', mobile:'' })
  const f = (k: string, v: string) => setForm(p=>({...p,[k]:v}))

  useEffect(() => {
    fetch('/api/users').then(r=>r.json()).then(us => { setUsers(Array.isArray(us)?us:[]); setLoading(false) })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if (!res.ok) { const err=await res.json(); throw new Error(err.error) }
      const user = await res.json()
      setUsers(p=>[...p,user])
      setShowModal(false)
      setForm({ name:'', username:'', password:'', role:'RECEPTION', mobile:'' })
      toast.success(`User ${user.name} created!`)
    } catch(e: any) { toast.error(e.message||'Failed') }
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/users/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ active:!active }) })
    if (res.ok) { setUsers(p=>p.map(u=>u.id===id?{...u,active:!active}:u)); toast.success('Updated') }
  }

  return (
    <PageShell title="Access Control" action={{ label:'+ Add User', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Total Users" value={users.length} icon="👥" color="blue" />
          <StatCard label="Active" value={users.filter(u=>u.active).length} icon="✅" color="green" />
          <StatCard label="Inactive" value={users.filter(u=>!u.active).length} icon="🔴" color="red" />
        </div>

        {/* Permission Matrix */}
        <Card style={{ marginBottom:16 }}>
          <CardHeader><CardTitle>Role Permission Matrix</CardTitle></CardHeader>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  {ROLES.map(r=><th key={r} style={{ textAlign:'center' }}><Badge color={ROLE_COLOR[r]}>{r.replace('_',' ')}</Badge></th>)}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map(([mod,...perms]) => (
                  <tr key={mod as string}>
                    <td style={{ fontWeight:500 }}>{mod as string}</td>
                    {(perms as boolean[]).map((p,i)=>(
                      <td key={i} style={{ textAlign:'center' }}>
                        {p ? <span style={{ color:'#10b981', fontSize:16 }}>✔</span> : <span style={{ color:'#ef4444', fontSize:14 }}>✗</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader><CardTitle>User Management</CardTitle><Button variant="primary" onClick={()=>setShowModal(true)}>+ Add User</Button></CardHeader>
          {loading ? <Loading /> : users.length===0 ? <Empty message="No users" /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Mobile</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id}>
                      <td style={{ fontWeight:500 }}>{u.name}</td>
                      <td style={{ fontFamily:'monospace', fontSize:11, color:'#8892a4' }}>{u.username}</td>
                      <td><Badge color={ROLE_COLOR[u.role]||'gray'}>{u.role.replace('_',' ')}</Badge></td>
                      <td style={{ color:'#8892a4' }}>{u.mobile||'—'}</td>
                      <td><Badge color={u.active?'green':'red'}>{u.active?'Active':'Inactive'}</Badge></td>
                      <td><Button size="sm" onClick={()=>toggleActive(u.id,u.active)}>{u.active?'Deactivate':'Activate'}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Add New User"
        footer={<><Button onClick={()=>setShowModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving?'Saving...':'💾 Create User'}</Button></>}>
        <form onSubmit={handleCreate}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Full Name *"><Input value={form.name} onChange={e=>f('name',e.target.value)} required /></FormGroup>
            <FormGroup label="Username *"><Input value={form.username} onChange={e=>f('username',e.target.value)} required /></FormGroup>
            <FormGroup label="Password *"><Input type="password" value={form.password} onChange={e=>f('password',e.target.value)} required minLength={6} /></FormGroup>
            <FormGroup label="Mobile"><Input value={form.mobile} onChange={e=>f('mobile',e.target.value)} /></FormGroup>
          </Grid>
          <FormGroup label="Role *">
            <Select value={form.role} onChange={e=>f('role',e.target.value)}>
              {ROLES.map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}
            </Select>
          </FormGroup>
        </form>
      </Modal>
    </PageShell>
  )
}
