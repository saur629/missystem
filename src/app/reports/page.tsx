'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, CardBody, StatCard, Badge, Loading } from '@/components/ui'
import { formatCurrency, ORDER_STATUS } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const MONTHLY = [
  {m:'Apr',rev:124000,exp:78200},{m:'May',rev:138500,exp:84100},{m:'Jun',rev:152000,exp:91000},
  {m:'Jul',rev:148000,exp:89000},{m:'Aug',rev:161000,exp:95000},{m:'Sep',rev:158000,exp:93000},
  {m:'Oct',rev:172000,exp:102000},{m:'Nov',rev:168000,exp:99000},{m:'Dec',rev:145000,exp:87000},
  {m:'Jan',rev:159000,exp:94000},{m:'Feb',rev:176000,exp:104000},{m:'Mar',rev:184500,exp:110200},
]
const TABS = ['Overview','Orders','Customers','Monthly P&L']
const TT = ({ active, payload, label }: any) => active && payload?.length ? (
  <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:'8px 12px', fontSize:11 }}>
    <div style={{ color:'#8892a4' }}>{label}</div>
    {payload.map((p: any) => <div key={p.name} style={{ color:p.color, fontWeight:600 }}>{p.name}: {formatCurrency(p.value)}</div>)}
  </div>
) : null

export default function ReportsPage() {
  const [tab, setTab] = useState('Overview')
  const [summary, setSummary] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=summary').then(r=>r.json()),
      fetch('/api/reports?type=customers').then(r=>r.json()),
      fetch('/api/orders').then(r=>r.json()),
    ]).then(([sum,cls,ords]) => { setSummary(sum); setCustomers(Array.isArray(cls)?cls:[]); setOrders(Array.isArray(ords)?ords:[]); setLoading(false) })
  }, [])

  const totalRevFY = MONTHLY.reduce((s,m)=>s+m.rev,0)
  const totalExpFY = MONTHLY.reduce((s,m)=>s+m.exp,0)
  const profit = totalRevFY - totalExpFY
  const margin = Math.round((profit/totalRevFY)*100)

  const ordersByType = orders.reduce((acc,o)=>{ acc[o.orderType]=(acc[o.orderType]||0)+1; return acc },{} as Record<string,number>)
  const pieData = Object.entries(ordersByType).map(([name,value])=>({name,value}))
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444']

  return (
    <PageShell title="Reports & Analytics">
      <div className="animate-in">
        {/* Tabs */}
        <div style={{ display:'flex', gap:2, padding:3, background:'#1e2535', borderRadius:8, marginBottom:20, width:'fit-content' }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'5px 16px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:tab===t?'#161b27':'transparent', color:tab===t?'#e2e8f0':'#8892a4' }}>{t}</button>
          ))}
        </div>

        {loading ? <Loading /> : (
          <>
            {tab==='Overview' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                  <StatCard label="Total Revenue FY" value={formatCurrency(totalRevFY)} icon="📈" color="blue" />
                  <StatCard label="Total Expenses FY" value={formatCurrency(totalExpFY)} icon="💸" color="yellow" />
                  <StatCard label="Net Profit FY" value={formatCurrency(profit)} icon="📊" color="green" />
                  <StatCard label="Profit Margin" value={`${margin}%`} icon="🎯" color="green" />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
                  <Card>
                    <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
                    <CardBody>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={MONTHLY} barSize={10} barGap={2}>
                          <XAxis dataKey="m" tick={{ fill:'#8892a4', fontSize:10 }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Tooltip content={<TT/>} cursor={{ fill:'rgba(255,255,255,.02)' }} />
                          <Bar dataKey="rev" name="Revenue" fill="#3b82f6" radius={[3,3,0,0]} />
                          <Bar dataKey="exp" name="Expenses" fill="#ef4444" radius={[3,3,0,0]} opacity={0.7} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Order Types</CardTitle></CardHeader>
                    <CardBody>
                      <PieChart width={160} height={160} style={{ margin:'0 auto' }}>
                        <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={0}>
                          {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                      {pieData.map((item,i)=>(
                        <div key={item.name} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, fontSize:11 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                          <span style={{ flex:1, color:'#8892a4' }}>{item.name}</span>
                        <span style={{ fontWeight:600 }}>{String(item.value)}</span>
                        </div>
                      ))}
                    </CardBody>
                  </Card>
                </div>
              </div>
            )}

            {tab==='Orders' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                  <StatCard label="Total Orders" value={orders.length} icon="📋" color="blue" />
                  <StatCard label="Delivered" value={orders.filter(o=>o.status==='DELIVERED').length} icon="✅" color="green" />
                  <StatCard label="Cancelled" value={orders.filter(o=>o.status==='CANCELLED').length} icon="❌" color="red" />
                </div>
                <Card>
                  <CardHeader><CardTitle>Orders by Status</CardTitle></CardHeader>
                  <div style={{ overflowX:'auto' }}>
                    <table>
                      <thead><tr><th>Status</th><th>Count</th><th>%</th></tr></thead>
                      <tbody>
                        {Object.entries(ORDER_STATUS).map(([key,val])=>{
                          const count = orders.filter(o=>o.status===key).length
                          const pct = orders.length ? Math.round((count/orders.length)*100) : 0
                          return (
                            <tr key={key}>
                              <td><Badge color={val.color}>{val.icon} {val.label}</Badge></td>
                              <td style={{ fontWeight:600 }}>{count}</td>
                              <td>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <div style={{ flex:1, height:6, background:'#252d40', borderRadius:3, overflow:'hidden' }}>
                                    <div style={{ height:'100%', width:`${pct}%`, background:'#3b82f6', borderRadius:3 }}/>
                                  </div>
                                  <span style={{ color:'#8892a4', fontSize:11, minWidth:30 }}>{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {tab==='Customers' && (
              <Card>
                <CardHeader><CardTitle>Customer-wise Report</CardTitle></CardHeader>
                {customers.length===0 ? <div style={{ padding:20, color:'#8892a4', textAlign:'center', fontSize:12 }}>No data yet</div> : (
                  <div style={{ overflowX:'auto' }}>
                    <table>
                      <thead><tr><th>Customer</th><th>City</th><th>Orders</th><th>Total Business</th><th>Total Paid</th><th>Outstanding</th></tr></thead>
                      <tbody>
                        {customers.sort((a,b)=>b.totalBusiness-a.totalBusiness).map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight:500 }}>{c.name}</td>
                            <td style={{ color:'#8892a4' }}>{c.city||'—'}</td>
                            <td style={{ fontWeight:600 }}>{c.totalOrders}</td>
                            <td style={{ color:'#10b981' }}>{formatCurrency(c.totalBusiness)}</td>
                            <td style={{ color:'#3b82f6' }}>{formatCurrency(c.totalPaid)}</td>
                            <td><Badge color={c.totalBusiness-c.totalPaid>0?'red':'green'}>{formatCurrency(c.totalBusiness-c.totalPaid)}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {tab==='Monthly P&L' && (
              <Card>
                <CardHeader><CardTitle>Monthly Profit & Loss — FY 2025-26</CardTitle></CardHeader>
                <div style={{ overflowX:'auto' }}>
                  <table>
                    <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th><th>Margin</th></tr></thead>
                    <tbody>
                      {MONTHLY.map(m => {
                        const p = m.rev - m.exp
                        return (
                          <tr key={m.m}>
                            <td style={{ fontWeight:500 }}>{m.m}</td>
                            <td style={{ color:'#10b981' }}>{formatCurrency(m.rev)}</td>
                            <td style={{ color:'#ef4444' }}>{formatCurrency(m.exp)}</td>
                            <td style={{ color:'#3b82f6', fontWeight:700 }}>{formatCurrency(p)}</td>
                            <td><Badge color="green">{Math.round((p/m.rev)*100)}%</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}
