'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Input, Select, StatCard, Loading, Empty } from '@/components/ui'
import { formatDate } from '@/lib/utils'

const ACTION_COLOR: Record<string, string> = {
  LOGIN:               'green',
  LOGOUT:              'gray',
  CREATE_ORDER:        'blue',
  UPDATE_ORDER:        'yellow',
  UPDATE_ORDER_STATUS: 'teal',
  CREATE_USER:         'purple',
  UPDATE_USER:         'orange',
}

const ACTION_ICON: Record<string, string> = {
  LOGIN:               '🔓',
  LOGOUT:              '🔒',
  CREATE_ORDER:        '📋',
  UPDATE_ORDER:        '✏️',
  UPDATE_ORDER_STATUS: '🔄',
  CREATE_USER:         '👤',
  UPDATE_USER:         '👥',
}

export default function ActivityPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const [logs, setLogs]       = useState<any[]>([])
  const [users, setUsers]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState('')
  const [action, setAction]   = useState('')
  const [days, setDays]       = useState('7')

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    if (action) params.set('action', action)
    params.set('days', days)
    fetch(`/api/activity?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false) })
  }, [userId, action, days])

  // Stats
  const todayLogs  = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString())
  const loginCount = logs.filter(l => l.action === 'LOGIN').length
  const orderCount = logs.filter(l => l.action.includes('ORDER')).length
  const activeUsers = [...new Set(logs.filter(l => l.action === 'LOGIN').map(l => l.userId))].length

  // Per-user summary
  const userSummary = users.map(u => ({
    ...u,
    logins:  logs.filter(l => l.userId === u.id && l.action === 'LOGIN').length,
    actions: logs.filter(l => l.userId === u.id).length,
    lastSeen: logs.find(l => l.userId === u.id)?.createdAt,
  })).filter(u => u.actions > 0).sort((a, b) => b.actions - a.actions)

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return <PageShell title="Activity Log"><div style={{ color:'#ef4444', padding:20 }}>Access denied.</div></PageShell>
  }

  return (
    <PageShell title="Activity Log">
      <div className="animate-in">

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Today's Activities" value={todayLogs.length}  icon="📊" color="blue" />
          <StatCard label="Logins"              value={loginCount}        icon="🔓" color="green" />
          <StatCard label="Order Actions"       value={orderCount}        icon="📋" color="yellow" />
          <StatCard label="Active Users"        value={activeUsers}       icon="👥" color="purple" />
        </div>

        {/* User Summary */}
        <Card style={{ marginBottom:16 }}>
          <CardHeader><CardTitle>👥 User Activity Summary (last {days} days)</CardTitle></CardHeader>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Role</th><th>Logins</th>
                  <th>Total Actions</th><th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {userSummary.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign:'center', color:'#8892a4', padding:20 }}>No activity yet</td></tr>
                  : userSummary.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight:600 }}>{u.name}</td>
                      <td><Badge color="blue">{u.role.replace('_',' ')}</Badge></td>
                      <td style={{ color:'#10b981', fontWeight:600 }}>{u.logins}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, background:'#1e2535', borderRadius:4, height:6, maxWidth:100 }}>
                            <div style={{ width:`${Math.min(100,(u.actions/Math.max(...userSummary.map(x=>x.actions)))*100)}%`, background:'#3b82f6', height:'100%', borderRadius:4 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:600 }}>{u.actions}</span>
                        </div>
                      </td>
                      <td style={{ fontSize:11, color:'#8892a4' }}>
                        {u.lastSeen ? new Date(u.lastSeen).toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </Card>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <Select style={{ width:160 }} value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select style={{ width:160 }} value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All Actions</option>
            {Object.keys(ACTION_COLOR).map(a => <option key={a} value={a}>{ACTION_ICON[a]} {a.replace(/_/g,' ')}</option>)}
          </Select>
          <Select style={{ width:120 }} value={days} onChange={e => setDays(e.target.value)}>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>
        </div>

        {/* Log Table */}
        <Card>
          <CardHeader><CardTitle>📜 Activity Log ({logs.length})</CardTitle></CardHeader>
          {loading ? <Loading /> : logs.length === 0 ? <Empty message="No activity found" /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th><th>User</th><th>Role</th>
                    <th>Action</th><th>Module</th><th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize:11, color:'#8892a4', whiteSpace:'nowrap' }}>
                        {new Date(l.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight:600 }}>{l.user?.name}</td>
                      <td><Badge color="blue">{l.user?.role?.replace('_',' ')}</Badge></td>
                      <td>
                        <Badge color={ACTION_COLOR[l.action] || 'gray'}>
                          {ACTION_ICON[l.action] || '•'} {l.action.replace(/_/g,' ')}
                        </Badge>
                      </td>
                      <td style={{ fontSize:11, color:'#8892a4', textTransform:'capitalize' }}>{l.module}</td>
                      <td style={{ fontSize:11, color:'#8892a4', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  )
}