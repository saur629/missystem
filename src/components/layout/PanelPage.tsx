'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge, Button, Card, CardHeader, CardTitle, Loading, Empty, StatCard } from '@/components/ui'
import { formatDate, ORDER_STATUS, PRIORITY_COLOR } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PanelConfig {
  title: string
  fetchStatuses: string[]
  columns: { key: string; label: string; color: string; icon: string; action?: { label: string; nextStatus: string; color: string } }[]
}

const CONFIGS: Record<string, PanelConfig> = {
  designer: {
    title: '🎨 Designer Panel',
    fetchStatuses: ['PENDING','DESIGNING','DESIGN_DONE'],
    columns: [
      { key:'PENDING',    label:'New Orders',   color:'#ef4444', icon:'🔴', action:{label:'🎨 Start Design', nextStatus:'DESIGNING', color:'#8b5cf6'} },
      { key:'DESIGNING',  label:'In Design',    color:'#8b5cf6', icon:'🎨', action:{label:'✅ Design Done',  nextStatus:'DESIGN_DONE', color:'#3b82f6'} },
      { key:'DESIGN_DONE',label:'Design Done',  color:'#3b82f6', icon:'✏️' },
    ],
  },
  printing: {
    title: '🖨️ Printing Room Panel',
    fetchStatuses: ['DESIGN_DONE','PRINTING','PRINT_DONE'],
    columns: [
      { key:'DESIGN_DONE', label:'Ready to Print', color:'#3b82f6', icon:'✏️', action:{label:'🖨️ Start Printing', nextStatus:'PRINTING', color:'#f59e0b'} },
      { key:'PRINTING',    label:'Printing',       color:'#f59e0b', icon:'🖨️', action:{label:'✅ Print Done',    nextStatus:'PRINT_DONE', color:'#14b8a6'} },
      { key:'PRINT_DONE',  label:'Print Done',     color:'#14b8a6', icon:'📄' },
    ],
  },
  production: {
    title: '📦 Production & Delivery Panel',
    fetchStatuses: ['PRINT_DONE','QUALITY_CHECK','READY','DELIVERED'],
    columns: [
      { key:'PRINT_DONE',   label:'Awaiting QC',  color:'#14b8a6', icon:'📄', action:{label:'🔍 Start QC',       nextStatus:'QUALITY_CHECK', color:'#f97316'} },
      { key:'QUALITY_CHECK',label:'Quality Check', color:'#f97316', icon:'🔍', action:{label:'✅ Pass & Ready',    nextStatus:'READY', color:'#10b981'} },
      { key:'READY',        label:'Ready',         color:'#10b981', icon:'📦', action:{label:'🚚 Mark Delivered',  nextStatus:'DELIVERED', color:'#10b981'} },
      { key:'DELIVERED',    label:'Delivered',     color:'#10b981', icon:'✅' },
    ],
  },
}

function OrderCard({ order, action, onAction }: { order: any; action?: { label: string; nextStatus: string; color: string }; onAction: (id: string, status: string) => void }) {
  const overdue = order.dueDate && new Date(order.dueDate) < new Date()
  return (
    <div style={{ background:'#1e2535', border:`1px solid ${order.priority==='EXPRESS'?'#ef4444':order.priority==='URGENT'?'#f59e0b':'#2a3348'}`, borderRadius:8, padding:12, marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:10 }}>{order.orderNo}</span>
        <Badge color={PRIORITY_COLOR[order.priority]}>{order.priority}</Badge>
      </div>
      <div style={{ fontWeight:600, marginBottom:2, fontSize:13 }}>{order.customer?.name}</div>
      <div style={{ fontSize:11, color:'#8892a4', marginBottom:2 }}>{order.customer?.mobile}</div>
      <div style={{ fontSize:11, color:'#3b82f6', marginBottom:6 }}>
        {order.orderType === 'FLEX'
          ? `Flex ${order.width}×${order.height}ft = ${order.sqFt?.toFixed(1)} sqft | ${order.flexMedia}`
          : `${order.orderType} | ${order.jobName||order.description||'—'} × ${order.qty||1}`}
      </div>
      {order.description && <div style={{ fontSize:10, color:'#8892a4', marginBottom:6, fontStyle:'italic', background:'#252d40', borderRadius:4, padding:'3px 6px' }}>{order.description}</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        {order.dueDate && (
          <div style={{ fontSize:10, color: overdue?'#ef4444':'#8892a4' }}>⏰ {overdue?'OVERDUE! ':''}{formatDate(order.dueDate)}</div>
        )}
        <div style={{ fontSize:11, color:'#10b981', fontWeight:600 }}>₹{order.totalAmount?.toLocaleString('en-IN')}</div>
      </div>
      {action && (
        <button onClick={() => onAction(order.id, action.nextStatus)}
          style={{ marginTop:8, width:'100%', padding:'6px', background:`${action.color}18`, border:`1px solid ${action.color}40`, borderRadius:6, color:action.color, fontSize:11, cursor:'pointer', fontWeight:600 }}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export function PanelPage({ panel }: { panel: 'designer' | 'printing' | 'production' }) {
  const config = CONFIGS[panel]
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/orders?statuses=${config.fetchStatuses.join(',')}`).then(r=>r.json()).then(d => {
      setOrders(Array.isArray(d)?d:[])
      setLoading(false)
    })
  }, [panel])

  async function handleAction(id: string, status: string) {
    const res = await fetch(`/api/orders/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) })
    if (res.ok) {
      setOrders(p => p.map(o => o.id===id ? {...o, status} : o))
      toast.success(`${ORDER_STATUS[status]?.icon} ${ORDER_STATUS[status]?.label}`)
    }
  }

  return (
    <PageShell title={config.title}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${config.columns.length},1fr)`, gap:12, marginBottom:4 }}>
          {config.columns.map(col => {
            const colOrders = orders.filter(o => o.status === col.key)
            return (
              <div key={col.key}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 0 10px 0' }}>
                  <span style={{ fontSize:14 }}>{col.icon}</span>
                  <span style={{ fontSize:12, fontWeight:700, color: col.color }}>{col.label}</span>
                  <span style={{ marginLeft:'auto', background:`${col.color}18`, color:col.color, padding:'1px 8px', borderRadius:12, fontSize:11, fontWeight:700 }}>{colOrders.length}</span>
                </div>
                <div style={{ background:'#161b27', border:'1px solid #2a3348', borderRadius:10, padding:10, minHeight:200 }}>
                  {loading ? <Loading /> : colOrders.length===0 ? <Empty message="No jobs here" /> :
                    colOrders.map(o => (
                      <OrderCard key={o.id} order={o} action={col.action} onAction={handleAction} />
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
