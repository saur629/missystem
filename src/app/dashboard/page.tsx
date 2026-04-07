'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { StatCard, Card, CardHeader, CardTitle, CardBody, Badge } from '@/components/ui'
import { formatCurrency, formatDate, ORDER_STATUS, PRIORITY_COLOR } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'

const MONTHLY = [
  {m:'Apr',rev:124000},{m:'May',rev:138500},{m:'Jun',rev:152000},{m:'Jul',rev:148000},
  {m:'Aug',rev:161000},{m:'Sep',rev:158000},{m:'Oct',rev:172000},{m:'Nov',rev:168000},
  {m:'Dec',rev:145000},{m:'Jan',rev:159000},{m:'Feb',rev:176000},{m:'Mar',rev:184500},
]
const TYPE_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444']

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=summary').then(r => r.json()),
      fetch('/api/orders').then(r => r.json()),
    ]).then(([sum, ords]) => {
      setSummary(sum)
      setOrders(Array.isArray(ords) ? ords.slice(0, 8) : [])
      setLoading(false)
    })
  }, [])

  const statusCounts = ORDER_STATUS
  const pending = orders.filter(o => o.status === 'PENDING').length
  const inProgress = orders.filter(o => ['DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK'].includes(o.status)).length
  const ready = orders.filter(o => o.status === 'READY').length
  const delivered = orders.filter(o => o.status === 'DELIVERED').length

  const orderTypes = orders.reduce((acc, o) => { acc[o.orderType] = (acc[o.orderType] || 0) + 1; return acc }, {} as Record<string,number>)
  const pieData = Object.entries(orderTypes).map(([name, value]) => ({ name, value }))

  const TT = ({ active, payload, label }: any) => active && payload?.length ? (
    <div style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: '#8892a4' }}>{label}</div>
      <div style={{ color: '#3b82f6', fontWeight: 600 }}>{formatCurrency(payload[0].value)}</div>
    </div>
  ) : null

  return (
    <PageShell title="Dashboard">
      <div className="animate-in">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Billed" value={formatCurrency(summary?.totalBilled || 0)} icon="💰" color="green" />
          <StatCard label="Outstanding" value={formatCurrency((summary?.totalBilled || 0) - (summary?.totalPaid || 0))} icon="⏳" color="yellow" />
          <StatCard label="Pending Orders" value={pending} icon="🔴" color="red" />
          <StatCard label="In Progress" value={inProgress} icon="⚙️" color="blue" />
          <StatCard label="Ready to Pickup" value={ready} icon="📦" color="green" />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card>
            <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={MONTHLY} barSize={16}>
                  <XAxis dataKey="m" tick={{ fill: '#8892a4', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<TT />} cursor={{ fill: 'rgba(255,255,255,.03)' }} />
                  <Bar dataKey="rev" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><CardTitle>Order Types</CardTitle></CardHeader>
            <CardBody>
              {pieData.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <PieChart width={90} height={90}>
                    <Pie data={pieData} cx={40} cy={40} innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                  <div>
                    {pieData.map((item, i) => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[i % TYPE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: '#8892a4' }}>{item.name}</span>
                        <span style={{ color: '#e2e8f0', fontWeight: 600, marginLeft: 'auto', paddingLeft: 8 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div style={{ color: '#8892a4', fontSize: 12, textAlign: 'center', padding: 20 }}>No data yet</div>}
            </CardBody>
          </Card>
        </div>

        {/* Status Quick View */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Pending', status: 'PENDING', icon: '🔴', color: '#ef4444' },
            { label: 'Designing', status: 'DESIGNING', icon: '🎨', color: '#8b5cf6' },
            { label: 'Printing', status: 'PRINTING', icon: '🖨️', color: '#f59e0b' },
            { label: 'Ready', status: 'READY', icon: '📦', color: '#10b981' },
          ].map(s => {
            const count = orders.filter(o => o.status === s.status).length
            return (
              <Link key={s.status} href={`/orders?status=${s.status}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#161b27', border: `1px solid ${s.color}30`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'border-color .15s' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{count}</div>
                  <div style={{ fontSize: 11, color: '#8892a4' }}>{s.label}</div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/orders" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}>View All →</Link>
          </CardHeader>
          {loading ? <div style={{ padding: 20, color: '#8892a4', fontSize: 12, textAlign: 'center' }}>Loading...</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Order No</th><th>Customer</th><th>Mobile</th><th>Type</th><th>Amount</th><th>Balance</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#8892a4', padding: 20 }}>No orders yet — create your first order!</td></tr>
                  ) : orders.map(o => {
                    const st = ORDER_STATUS[o.status]
                    return (
                      <tr key={o.id}>
                        <td style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 11 }}>{o.orderNo}</td>
                        <td style={{ fontWeight: 500 }}>{o.customer?.name}</td>
                        <td style={{ color: '#8892a4', fontSize: 11 }}>{o.customer?.mobile}</td>
                        <td><Badge color="blue">{o.orderType}</Badge></td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(o.totalAmount)}</td>
                        <td style={{ color: o.balanceDue > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(o.balanceDue)}</td>
                        <td><Badge color={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge></td>
                        <td><Badge color={st?.color}>{st?.icon} {st?.label}</Badge></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
