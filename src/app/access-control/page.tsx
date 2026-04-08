'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, StatCard, Loading, Empty, Grid } from '@/components/ui'
import toast from 'react-hot-toast'

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'purple', ADMIN: 'blue', RECEPTION: 'teal',
  DESIGNER: 'orange', PRINTING: 'yellow', PRODUCTION: 'green', USER: 'gray'
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'RECEPTION', 'DESIGNER', 'PRINTING', 'PRODUCTION', 'USER']

// Default permission matrix — [module, SUPER_ADMIN, ADMIN, RECEPTION, DESIGNER, PRINTING, PRODUCTION, USER]
const DEFAULT_PERMISSIONS: (string | boolean)[][] = [
  ['Dashboard',           true,  true,  true,  true,  true,  true,  true ],
  ['View All Orders',     true,  true,  true,  true,  true,  true,  false],
  ['Create Orders',       true,  true,  true,  false, false, false, false],
  ['Update Order Status', true,  true,  true,  true,  true,  true,  false],
  ['Designer Panel',      true,  true,  false, true,  false, false, false],
  ['Printing Panel',      true,  true,  false, false, true,  false, false],
  ['Production Panel',    true,  true,  false, false, false, true,  false],
  ['Quotations',          true,  true,  true,  false, false, false, false],
  ['Invoices',            true,  true,  false, false, false, false, false],
  ['Payments',            true,  true,  false, false, false, false, false],
  ['Purchase Orders',     true,  true,  false, false, false, false, false],
  ['Reports',             true,  true,  false, false, false, false, false],
  ['Attendance',          true,  true,  true,  true,  true,  true,  false],
  ['Access Control',      true,  false, false, false, false, false, false],
  ['Masters / Settings',  true,  true,  false, false, false, false, false],
  ['SMS Alerts',          true,  true,  false, false, false, false, false],
]

export default function AccessControlPage() {
  const { data: session } = useSession()
  const currentRole = (session?.user as any)?.role
  const isSuperAdmin = currentRole === 'SUPER_ADMIN'

  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)
  const [permChanged, setPermChanged] = useState(false)

  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'RECEPTION', mobile: '' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(us => {
      setUsers(Array.isArray(us) ? us : [])
      setLoading(false)
    })
  }, [])

  // Toggle permission cell — only Super Admin
  function togglePerm(rowIdx: number, colIdx: number) {
    if (!isSuperAdmin) { toast.error('Only Super Admin can edit permissions'); return }
    // colIdx 1 = SUPER_ADMIN column — always keep true, can't disable
    if (colIdx === 1) { toast.error('Super Admin always has full access'); return }
    setPermissions(prev => {
      const next = prev.map(row => [...row])
      next[rowIdx][colIdx] = !next[rowIdx][colIdx]
      return next
    })
    setPermChanged(true)
  }

  function savePermissions() {
    // In a full backend implementation you'd POST these to an API
    // For now save to localStorage as a simple persistence
    localStorage.setItem('printflow_permissions', JSON.stringify(permissions))
    setPermChanged(false)
    toast.success('✅ Permissions saved!')
  }

  function resetPermissions() {
    setPermissions(DEFAULT_PERMISSIONS)
    localStorage.removeItem('printflow_permissions')
    setPermChanged(false)
    toast.success('Permissions reset to default')
  }

  // Load saved permissions from localStorage on mount
useEffect(() => {
  try {
    const saved = localStorage.getItem('printflow_permissions')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPermissions(parsed)
      } else {
        localStorage.removeItem('printflow_permissions')
      }
    }
  } catch {
    localStorage.removeItem('printflow_permissions')
  }
}, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const user = await res.json()
      setUsers(p => [...p, user])
      setShowModal(false)
      setForm({ name: '', username: '', password: '', role: 'RECEPTION', mobile: '' })
      toast.success(`User ${user.name} created!`)
    } catch (e: any) { toast.error(e.message || 'Failed to create user') }
    setSaving(false)
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = { name: editUser.name, role: editUser.role, mobile: editUser.mobile }
      if (editUser.newPassword) payload.password = editUser.newPassword
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setUsers(p => p.map(u => u.id === updated.id ? updated : u))
      setEditUser(null)
      toast.success('User updated!')
    } catch { toast.error('Failed to update user') }
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    if (!isSuperAdmin) { toast.error('Only Super Admin can activate/deactivate users'); return }
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    if (res.ok) {
      setUsers(p => p.map(u => u.id === id ? { ...u, active: !active } : u))
      toast.success(!active ? 'User activated' : 'User deactivated')
    }
  }

  async function changeRole(id: string, role: string) {
    if (!isSuperAdmin) { toast.error('Only Super Admin can change roles'); return }
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
      toast.success('Role updated!')
    }
  }

  return (
    <PageShell title="Access Control">
      <div className="animate-in">

        {/* Access Notice */}
        {!isSuperAdmin && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            👁 <span>You are in <b>view-only</b> mode. Only <b>Super Admin</b> can edit permissions and roles.</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Users" value={users.length} icon="👥" color="blue" />
          <StatCard label="Active" value={users.filter(u => u.active).length} icon="✅" color="green" />
          <StatCard label="Inactive" value={users.filter(u => !u.active).length} icon="🔴" color="red" />
          <StatCard label="Roles Defined" value={ROLES.length} icon="🔐" color="purple" />
        </div>

        {/* ── PERMISSION MATRIX ── */}
        <Card style={{ marginBottom: 16 }}>
          <CardHeader>
            <CardTitle>Role Permission Matrix {isSuperAdmin && <span style={{ fontSize: 10, color: '#10b981', marginLeft: 8 }}>✏ Click cell to toggle</span>}</CardTitle>
            {isSuperAdmin && (
              <div style={{ display: 'flex', gap: 8 }}>
                {permChanged && (
                  <>
                    <Button onClick={resetPermissions}>↺ Reset</Button>
                    <Button variant="primary" onClick={savePermissions}>💾 Save Permissions</Button>
                  </>
                )}
                {!permChanged && <span style={{ fontSize: 11, color: '#8892a4' }}>Click any ✔/✗ to edit</span>}
              </div>
            )}
          </CardHeader>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Module / Permission</th>
                  {ROLES.map(r => (
                    <th key={r} style={{ textAlign: 'center', minWidth: 90 }}>
                      <Badge color={ROLE_COLOR[r]}>{r.replace('_', ' ')}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((row, rowIdx) => (
                  <tr key={row[0] as string}>
                    <td style={{ fontWeight: 500 }}>{row[0] as string}</td>
                    {ROLES.map((_, colIdx) => {
                      const val = row[colIdx + 1] as boolean
                      const isLocked = colIdx === 0 // Super Admin column always locked
                      return (
                        <td key={colIdx} style={{ textAlign: 'center' }}>
                          <div
                            onClick={() => !isLocked && togglePerm(rowIdx, colIdx + 1)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6,
                              cursor: isSuperAdmin && !isLocked ? 'pointer' : 'default',
                              background: val ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.08)',
                              border: `1px solid ${val ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.2)'}`,
                              transition: 'all .15s',
                              ...(isSuperAdmin && !isLocked ? { boxShadow: 'none' } : {}),
                            }}
                            onMouseEnter={e => { if (isSuperAdmin && !isLocked) (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                            title={isSuperAdmin && !isLocked ? `Click to ${val ? 'remove' : 'grant'} access` : ''}
                          >
                            {val
                              ? <span style={{ color: '#10b981', fontSize: 14, fontWeight: 700 }}>✔</span>
                              : <span style={{ color: '#ef4444', fontSize: 12 }}>✗</span>
                            }
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isSuperAdmin && permChanged && (
            <div style={{ padding: '10px 16px', background: 'rgba(59,130,246,.08)', borderTop: '1px solid #2a3348', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#3b82f6' }}>⚠ You have unsaved permission changes</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={resetPermissions}>Cancel</Button>
                <Button variant="primary" onClick={savePermissions}>💾 Save Changes</Button>
              </div>
            </div>
          )}
        </Card>

        {/* ── USER MANAGEMENT ── */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            {isSuperAdmin && (
              <Button variant="primary" onClick={() => setShowModal(true)}>+ Add User</Button>
            )}
          </CardHeader>
          {loading ? <Loading /> : users.length === 0 ? <Empty message="No users found" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    {isSuperAdmin && <th>Change Role</th>}
                    {isSuperAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#8892a4' }}>{u.username}</td>
                      <td><Badge color={ROLE_COLOR[u.role] || 'gray'}>{u.role.replace('_', ' ')}</Badge></td>
                      <td style={{ color: '#8892a4' }}>{u.mobile || '—'}</td>
                      <td><Badge color={u.active ? 'green' : 'red'}>{u.active ? 'Active' : 'Inactive'}</Badge></td>

                      {/* Role change dropdown — Super Admin only */}
                      {isSuperAdmin && (
                        <td>
                          {u.role !== 'SUPER_ADMIN' ? (
                            <select
                              value={u.role}
                              onChange={e => changeRole(u.id, e.target.value)}
                              style={{ padding: '4px 8px', background: '#1e2535', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', fontSize: 11, cursor: 'pointer', outline: 'none' }}
                            >
                              {ROLES.filter(r => r !== 'SUPER_ADMIN').map(r => (
                                <option key={r} value={r}>{r.replace('_', ' ')}</option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ fontSize: 11, color: '#8892a4' }}>— Super Admin —</span>
                          )}
                        </td>
                      )}

                      {/* Actions — Super Admin only */}
                      {isSuperAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button size="sm" onClick={() => setEditUser({ ...u, newPassword: '' })}>✏ Edit</Button>
                            {u.role !== 'SUPER_ADMIN' && (
                              <Button size="sm" variant={u.active ? 'danger' : 'default'} onClick={() => toggleActive(u.id, u.active)}>
                                {u.active ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── ADD USER MODAL ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New User"
        footer={<>
          <Button onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : '💾 Create User'}</Button>
        </>}>
        <form onSubmit={handleCreate}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Full Name *"><Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Full name" required /></FormGroup>
            <FormGroup label="Username *"><Input value={form.username} onChange={e => f('username', e.target.value)} placeholder="login username" required /></FormGroup>
            <FormGroup label="Password *"><Input type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Min 6 characters" required minLength={6} /></FormGroup>
            <FormGroup label="Mobile"><Input value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="10-digit mobile" /></FormGroup>
          </Grid>
          <FormGroup label="Role *">
            <Select value={form.role} onChange={e => f('role', e.target.value)}>
              {ROLES.filter(r => r !== 'SUPER_ADMIN').map(r => (
                <option key={r} value={r}>{r.replace('_', ' ')}</option>
              ))}
            </Select>
          </FormGroup>
          <div style={{ background: '#1e2535', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#8892a4', border: '1px solid #2a3348' }}>
            <b style={{ color: '#e2e8f0' }}>Role Guide:</b><br />
            <b style={{ color: '#14b8a6' }}>Reception</b> — books orders, manages customers<br />
            <b style={{ color: '#f97316' }}>Designer</b> — handles design panel only<br />
            <b style={{ color: '#f59e0b' }}>Printing</b> — handles printing room panel<br />
            <b style={{ color: '#10b981' }}>Production</b> — QC and delivery panel<br />
            <b style={{ color: '#3b82f6' }}>Admin</b> — all except access control
          </div>
        </form>
      </Modal>

      {/* ── EDIT USER MODAL ── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit User — ${editUser?.name}`}
        footer={<>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleEditUser} disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</Button>
        </>}>
        {editUser && (
          <form onSubmit={handleEditUser}>
            <Grid cols={2} gap={12}>
              <FormGroup label="Full Name *">
                <Input value={editUser.name} onChange={e => setEditUser((p: any) => ({ ...p, name: e.target.value }))} required />
              </FormGroup>
              <FormGroup label="Mobile">
                <Input value={editUser.mobile || ''} onChange={e => setEditUser((p: any) => ({ ...p, mobile: e.target.value }))} />
              </FormGroup>
            </Grid>
            <FormGroup label="Role">
              <Select value={editUser.role} onChange={e => setEditUser((p: any) => ({ ...p, role: e.target.value }))}>
                {ROLES.filter(r => r !== 'SUPER_ADMIN').map(r => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label="New Password (leave blank to keep current)">
              <Input type="password" value={editUser.newPassword || ''} onChange={e => setEditUser((p: any) => ({ ...p, newPassword: e.target.value }))} placeholder="Enter new password or leave blank" minLength={6} />
            </FormGroup>
            <div style={{ background: '#1e2535', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#8892a4', border: '1px solid #2a3348' }}>
              Username: <b style={{ color: '#3b82f6' }}>{editUser.username}</b> — cannot be changed
            </div>
          </form>
        )}
      </Modal>
    </PageShell>
  )
}