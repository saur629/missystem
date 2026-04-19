'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, StatCard, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency, formatDate, ORDER_STATUS } from '@/lib/utils'
import toast from 'react-hot-toast'

const FRAME_TYPES     = ['Iron Frame', 'Wooden Frame', 'Aluminium Frame', 'MS Frame', 'GI Frame']
const FRAME_FINISHES  = ['Powder Coated', 'Painted', 'Raw', 'Galvanized', 'Polished', 'Matte Black', 'Chrome']
const FLEX_MEDIA      = ['Star Flex', 'Black Back', 'One Way Vision', 'Canvas', 'Backlit', 'Normal Vinyl', 'Eco Solvent']
const PAYMENT_METHODS = ['Cash', 'UPI', 'NEFT/RTGS', 'Cheque', 'Card', 'Credit (pay later)']

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'gray', DESIGNING: 'purple', DESIGN_DONE: 'blue',
  PRINTING: 'yellow', PRINT_DONE: 'teal', QUALITY_CHECK: 'orange',
  READY: 'green', DISPATCHED: 'blue', DELIVERED: 'green', CANCELLED: 'red',
}

interface FrameItem {
  id: number
  description: string
  widthFt: string
  heightFt: string
  sqFt: number
  qty: string
  frameType: string
  frameFinish: string
  framePricePerPiece: string
  frameAmount: number
  includesFlex: boolean
  flexMedia: string
  flexPricePerPiece: string
  flexAmount: number
  installationRequired: boolean
  installationCharge: string
  totalAmount: number
  notes: string
}

function calcItem(item: FrameItem, changed: Partial<FrameItem>): FrameItem {
  const merged = { ...item, ...changed }
  const w = parseFloat(merged.widthFt)  || 0
  const h = parseFloat(merged.heightFt) || 0
  const q = parseInt(merged.qty)        || 1
  const sqFt       = parseFloat((w * h).toFixed(3))
  const framePrice = parseFloat(merged.framePricePerPiece) || 0
  const flexPrice  = parseFloat(merged.flexPricePerPiece)  || 0
  const instCharge = parseFloat(merged.installationCharge) || 0
  const frameAmount = framePrice * q
  const flexAmount  = merged.includesFlex ? flexPrice * q : 0
  const totalAmount = frameAmount + flexAmount + (merged.installationRequired ? instCharge : 0)
  return { ...merged, sqFt, frameAmount: parseFloat(frameAmount.toFixed(2)), flexAmount: parseFloat(flexAmount.toFixed(2)), totalAmount: parseFloat(totalAmount.toFixed(2)) }
}

function defaultItem(): FrameItem {
  return {
    id: Date.now() + Math.random(), description: '',
    widthFt: '', heightFt: '', sqFt: 0, qty: '1',
    frameType: 'Iron Frame', frameFinish: 'Powder Coated',
    framePricePerPiece: '', frameAmount: 0,
    includesFlex: true, flexMedia: 'Star Flex', flexPricePerPiece: '', flexAmount: 0,
    installationRequired: false, installationCharge: '0',
    totalAmount: 0, notes: '',
  }
}

function FrameItemRow({ item, idx, total, onChange, onRemove }: {
  item: FrameItem; idx: number; total: number
  onChange: (id: number, changed: Partial<FrameItem>) => void
  onRemove: (id: number) => void
}) {
  const up = (k: keyof FrameItem, v: any) => onChange(item.id, { [k]: v })
  const qty = parseInt(item.qty) || 1

  return (
    <div style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 12, padding: 14, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>🖼️ Frame {idx + 1}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => up('includesFlex', !item.includesFlex)}
            style={{ padding: '3px 10px', fontSize: 10, borderRadius: 6, cursor: 'pointer', fontWeight: 600, border: `1px solid ${item.includesFlex ? '#3b82f6' : '#2a3348'}`, background: item.includesFlex ? 'rgba(59,130,246,.12)' : 'transparent', color: item.includesFlex ? '#3b82f6' : '#8892a4' }}>
            🖨️ {item.includesFlex ? 'Flex ✓' : '+ Add Flex'}
          </button>
          <button type="button" onClick={() => up('installationRequired', !item.installationRequired)}
            style={{ padding: '3px 10px', fontSize: 10, borderRadius: 6, cursor: 'pointer', fontWeight: 600, border: `1px solid ${item.installationRequired ? '#10b981' : '#2a3348'}`, background: item.installationRequired ? 'rgba(16,185,129,.12)' : 'transparent', color: item.installationRequired ? '#10b981' : '#8892a4' }}>
            🔧 {item.installationRequired ? 'Install ✓' : '+ Installation'}
          </button>
          {total > 1 && (
            <button type="button" onClick={() => onRemove(item.id)}
              style={{ padding: '3px 10px', fontSize: 10, borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: '#ef4444' }}>✕</button>
          )}
        </div>
      </div>

      {/* Description + Qty */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Description / Label</div>
          <Input value={item.description} onChange={e => up('description', e.target.value)} placeholder="e.g. Shop front iron frame banner" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Quantity (Pieces)</div>
          <Input type="number" min="1" value={item.qty} onChange={e => up('qty', e.target.value)} />
        </div>
      </div>

      {/* Size */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Width (ft)</div>
          <Input type="number" step="0.01" value={item.widthFt} onChange={e => up('widthFt', e.target.value)} placeholder="0" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Height (ft)</div>
          <Input type="number" step="0.01" value={item.heightFt} onChange={e => up('heightFt', e.target.value)} placeholder="0" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sq.Ft (Reference)</div>
          <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#8892a4', textAlign: 'center' }}>{item.sqFt.toFixed(2)}</div>
        </div>
      </div>

      {/* Frame section */}
      <div style={{ background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>🖼️ Frame Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Frame Type</div>
            <Select value={item.frameType} onChange={e => up('frameType', e.target.value)}>
              {FRAME_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Color / Finish</div>
            <Select value={item.frameFinish} onChange={e => up('frameFinish', e.target.value)}>
              {FRAME_FINISHES.map(f => <option key={f}>{f}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Price / Piece ₹</div>
            <Input type="number" step="0.01" value={item.framePricePerPiece}
              onChange={e => up('framePricePerPiece', e.target.value)} placeholder="0.00"
              style={{ border: '1px solid rgba(245,158,11,.35)', background: 'rgba(245,158,11,.04)' }} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Frame Total ({qty} pc{qty > 1 ? 's' : ''})</div>
            <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#f59e0b', textAlign: 'center' }}>
              ₹{item.frameAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Flex section */}
      {item.includesFlex && (
        <div style={{ background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>🖨️ Flex / Banner Inside Frame</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Flex Media</div>
              <Select value={item.flexMedia} onChange={e => up('flexMedia', e.target.value)}>
                {FLEX_MEDIA.map(m => <option key={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Flex Price / Piece ₹</div>
              <Input type="number" step="0.01" value={item.flexPricePerPiece}
                onChange={e => up('flexPricePerPiece', e.target.value)} placeholder="0.00"
                style={{ border: '1px solid rgba(59,130,246,.35)', background: 'rgba(59,130,246,.04)' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Flex Total ({qty} pc{qty > 1 ? 's' : ''})</div>
              <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#3b82f6', textAlign: 'center' }}>
                ₹{item.flexAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Installation section */}
      {item.installationRequired && (
        <div style={{ background: 'rgba(16,185,129,.05)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>🔧 Installation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Installation Charge ₹ (Flat)</div>
              <Input type="number" step="0.01" value={item.installationCharge}
                onChange={e => up('installationCharge', e.target.value)}
                style={{ border: '1px solid rgba(16,185,129,.35)', background: 'rgba(16,185,129,.04)' }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Installation Address / Notes</div>
              <Input value={item.notes} onChange={e => up('notes', e.target.value)} placeholder="Location, floor, any special requirements..." />
            </div>
          </div>
        </div>
      )}

      {/* Item total strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#252d40', borderRadius: 8, marginTop: 4 }}>
        <div style={{ fontSize: 11, color: '#8892a4', display: 'flex', gap: 14 }}>
          <span>🖼️ <strong style={{ color: '#f59e0b' }}>₹{item.frameAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
          {item.includesFlex && <span>🖨️ <strong style={{ color: '#3b82f6' }}>₹{item.flexAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>}
          {item.installationRequired && <span>🔧 <strong style={{ color: '#10b981' }}>₹{parseFloat(item.installationCharge || '0').toLocaleString('en-IN')}</strong></span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>
          ₹{item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  )
}

export default function FrameOrdersPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const canBook = ['SUPER_ADMIN', 'ADMIN', 'RECEPTION'].includes(role)

  const [orders, setOrders]             = useState<any[]>([])
  const [customers, setCustomers]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [viewOrder, setViewOrder]       = useState<any>(null)
  const [saving, setSaving]             = useState(false)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage]                 = useState(1)
  const PAGE_SIZE = 20

  const [items, setItems] = useState<FrameItem[]>([defaultItem()])
  const [form, setForm]   = useState({ customerId: '', priority: 'NORMAL', dueDate: '', notes: '', discount: '0', gstPct: '18', advancePaid: '0', paymentMethod: 'Cash' })
  const [custForm, setCustForm]         = useState({ name: '', mobile: '', email: '', city: '' })
  const [showCustModal, setShowCustModal] = useState(false)

  const fv = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  function handleUpdateItem(id: number, changed: Partial<FrameItem>) {
    setItems(prev => prev.map(item => item.id === id ? calcItem(item, changed) : item))
  }
  function handleAddItem() { setItems(p => [...p, defaultItem()]) }
  function handleRemoveItem(id: number) {
    setItems(p => { if (p.length === 1) { toast.error('At least one item required'); return p } return p.filter(i => i.id !== id) })
  }

  const subTotal  = items.reduce((s, i) => s + i.totalAmount, 0)
  const disc      = parseFloat(form.discount || '0')
  const afterDisc = subTotal - disc
  const gstAmt    = afterDisc * parseFloat(form.gstPct || '18') / 100
  const total     = afterDisc + gstAmt
  const balance   = total - parseFloat(form.advancePaid || '0')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ orderType: 'FRAME' })
    if (filterStatus) params.set('status', filterStatus)
    if (search)       params.set('search', search)
    const res = await fetch(`/api/orders?${params}`)
    setOrders(Array.isArray(await res.json()) ? await fetch(`/api/orders?${params}`).then(r => r.json()) : [])
    setLoading(false)
  }, [filterStatus, search])

  // fix double fetch
  const fetchOrdersOnce = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ orderType: 'FRAME' })
    if (filterStatus) params.set('status', filterStatus)
    if (search)       params.set('search', search)
    const data = await fetch(`/api/orders?${params}`).then(r => r.json())
    setOrders(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filterStatus, search])

  useEffect(() => { fetchOrdersOnce() }, [fetchOrdersOnce])
  useEffect(() => { setPage(1) }, [filterStatus, search])
  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
  }, [])

  function resetForm() {
    setForm({ customerId: '', priority: 'NORMAL', dueDate: '', notes: '', discount: '0', gstPct: '18', advancePaid: '0', paymentMethod: 'Cash' })
    setItems([defaultItem()])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) { toast.error('Select a customer'); return }
    setSaving(true)
    try {
      const fi = items[0]
      const payload = {
        ...form, orderType: 'FRAME', items,
        subTotal: afterDisc, gstAmount: gstAmt, totalAmount: total,
        advancePaid: parseFloat(form.advancePaid || '0'), balanceDue: balance,
        itemCount: items.length, orderItemsJson: JSON.stringify(items),
        description: fi.description || `${fi.frameType} ${fi.widthFt}×${fi.heightFt}ft`,
        width: parseFloat(fi.widthFt) || null, height: parseFloat(fi.heightFt) || null,
        sqFt: fi.sqFt, flexMedia: fi.includesFlex ? fi.flexMedia : null,
      }
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      const order = await res.json()
      setOrders(p => [order, ...p])
      setShowModal(false); resetForm()
      toast.success(`✅ Frame Order ${order.orderNo} created!`)
    } catch { toast.error('Failed to create order') }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) {
      setOrders(p => p.map(o => o.id === id ? { ...o, status } : o))
      if (viewOrder?.id === id) setViewOrder((v: any) => ({ ...v, status }))
      toast.success(`→ ${ORDER_STATUS[status]?.label}`)
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custForm) })
    if (res.ok) {
      const c = await res.json()
      setCustomers(p => [...p, c]); setForm(p => ({ ...p, customerId: c.id }))
      setShowCustModal(false); setCustForm({ name: '', mobile: '', email: '', city: '' })
      toast.success('Customer added!')
    }
  }

  const pending     = orders.filter(o => o.status === 'PENDING').length
  const inProg      = orders.filter(o => ['DESIGNING','PRINTING','QUALITY_CHECK'].includes(o.status)).length
  const ready       = orders.filter(o => o.status === 'READY').length
  const totalPages  = Math.ceil(orders.length / PAGE_SIZE)
  const paginated   = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <PageShell title="Frame Orders" action={canBook ? { label: '+ New Frame Order', onClick: () => setShowModal(true) } : undefined}>
      <div className="animate-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Frame Orders" value={orders.length} icon="🖼️" color="yellow" />
          <StatCard label="Pending"            value={pending}       icon="🔴"  color="red" />
          <StatCard label="In Progress"        value={inProg}        icon="⚙️"  color="blue" />
          <StatCard label="Ready"              value={ready}         icon="📦"  color="green" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Input placeholder="🔍 Search customer, order no..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrdersOnce()}
            style={{ flex: 1, minWidth: 200 }} />
          <Select style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{(v as any).icon} {(v as any).label}</option>)}
          </Select>
          <Button onClick={fetchOrdersOnce}>Search</Button>
          {canBook && <Button variant="primary" onClick={() => setShowModal(true)}>+ New Frame Order</Button>}
        </div>

        <Card>
          <CardHeader><CardTitle>🖼️ Frame Orders ({orders.length})</CardTitle></CardHeader>
          {loading ? <Loading /> : orders.length === 0 ? <Empty message="No frame orders yet." /> : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Order No</th><th>Date</th><th>Customer</th><th>Frame</th>
                      <th>Size</th><th>Qty</th><th>Includes</th>
                      <th>Total</th><th>Balance</th><th>Due</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(o => {
                      const st = ORDER_STATUS[o.status]
                      const pItems: FrameItem[] = (() => { try { return JSON.parse(o.orderItemsJson || '[]') } catch { return [] } })()
                      const fi = pItems[0]
                      const hasInstall = pItems.some(i => i.installationRequired)
                      const hasFlex    = pItems.some(i => i.includesFlex)
                      const overdue    = o.dueDate && new Date(o.dueDate) < new Date() && !['DELIVERED','CANCELLED'].includes(o.status)
                      return (
                        <tr key={o.id}>
                          <td style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{o.orderNo}</td>
                          <td style={{ color: '#8892a4', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(o.date)}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.customer?.name}</div>
                            <div style={{ fontSize: 10, color: '#8892a4' }}>{o.customer?.mobile}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>{fi?.frameType || '—'}</div>
                            <div style={{ fontSize: 10, color: '#8892a4' }}>{fi?.frameFinish}</div>
                          </td>
                          <td style={{ fontSize: 11 }}>
                            {fi ? `${fi.widthFt}×${fi.heightFt}ft` : '—'}
                            <div style={{ fontSize: 10, color: '#8892a4' }}>{fi?.sqFt?.toFixed(2)} sqft</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {pItems.reduce((s, i) => s + (parseInt(i.qty) || 1), 0)} pcs
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {hasFlex    && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(59,130,246,.12)', color: '#3b82f6', width: 'fit-content' }}>🖨️ Flex</span>}
                              {hasInstall && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(16,185,129,.12)', color: '#10b981', width: 'fit-content' }}>🔧 Install</span>}
                            </div>
                          </td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(o.totalAmount)}</td>
                          <td style={{ color: o.balanceDue > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(o.balanceDue)}</td>
                          <td style={{ fontSize: 11, color: overdue ? '#ef4444' : '#8892a4', whiteSpace: 'nowrap' }}>
                            {o.dueDate ? formatDate(o.dueDate) : '—'}{overdue ? ' ⚠️' : ''}
                          </td>
                          <td><Badge color={STATUS_COLOR[o.status] || 'gray'}>{(st as any)?.icon} {(st as any)?.label}</Badge></td>
                          <td><Button size="sm" onClick={() => setViewOrder({ ...o, pItems })}>👁 View</Button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #2a3348' }}>
                  <span style={{ fontSize: 12, color: '#8892a4' }}>Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,orders.length)} of {orders.length}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ padding:'4px 10px', background:'#1e2535', border:'1px solid #2a3348', borderRadius:6, color:page===1?'#4a5568':'#e2e8f0', cursor:page===1?'not-allowed':'pointer', fontSize:12 }}>‹</button>
                    {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                      <button key={p} onClick={()=>setPage(p)} style={{ padding:'4px 10px', background:page===p?'#f59e0b':'#1e2535', border:`1px solid ${page===p?'#f59e0b':'#2a3348'}`, borderRadius:6, color:page===p?'#000':'#e2e8f0', cursor:'pointer', fontSize:12, fontWeight:page===p?700:400 }}>{p}</button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ padding:'4px 10px', background:'#1e2535', border:'1px solid #2a3348', borderRadius:6, color:page===totalPages?'#4a5568':'#e2e8f0', cursor:page===totalPages?'not-allowed':'pointer', fontSize:12 }}>›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* CREATE MODAL */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="🖼️ New Frame Order" width={750}
        footer={<><Button onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : `💾 Book Frame Order (${items.length} frame${items.length>1?'s':''})`}</Button></>}>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <FormGroup label="Customer *">
                <Select value={form.customerId} onChange={e => fv('customerId', e.target.value)} required>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
                </Select>
              </FormGroup>
            </div>
            <Button type="button" onClick={() => setShowCustModal(true)} style={{ marginBottom: 14 }}>+ New</Button>
          </div>
          <Grid cols={3} gap={10} style={{ marginBottom: 14 }}>
            <FormGroup label="Priority">
              <Select value={form.priority} onChange={e => fv('priority', e.target.value)}>
                <option value="NORMAL">Normal</option><option value="URGENT">🟡 Urgent</option><option value="EXPRESS">🔴 Express</option>
              </Select>
            </FormGroup>
            <FormGroup label="Due Date"><Input type="date" value={form.dueDate} onChange={e => fv('dueDate', e.target.value)} /></FormGroup>
            <FormGroup label="Payment Method">
              <Select value={form.paymentMethod} onChange={e => fv('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </Select>
            </FormGroup>
          </Grid>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>
              🖼️ Frame Items <span style={{ fontSize: 10, color: '#8892a4', fontWeight: 400 }}>{items.length} frame{items.length>1?'s':''}</span>
            </div>
            {items.map((item, idx) => <FrameItemRow key={item.id} item={item} idx={idx} total={items.length} onChange={handleUpdateItem} onRemove={handleRemoveItem} />)}
            <button type="button" onClick={handleAddItem}
              style={{ width: '100%', padding: 9, background: 'rgba(245,158,11,.06)', border: '1px dashed rgba(245,158,11,.4)', borderRadius: 8, color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              ＋ Add Another Frame
            </button>
          </div>

          <FormGroup label="Order Notes"><Input value={form.notes} onChange={e => fv('notes', e.target.value)} placeholder="Any special requirements..." /></FormGroup>

          <Grid cols={3} gap={12} style={{ marginBottom: 12 }}>
            <FormGroup label="Discount ₹"><Input type="number" value={form.discount} onChange={e => fv('discount', e.target.value)} /></FormGroup>
            <FormGroup label="GST %">
              <Select value={form.gstPct} onChange={e => fv('gstPct', e.target.value)}>
                <option value="0">No GST</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
              </Select>
            </FormGroup>
            <FormGroup label="Advance Paid ₹"><Input type="number" value={form.advancePaid} onChange={e => fv('advancePaid', e.target.value)} /></FormGroup>
          </Grid>

          <div style={{ background: '#1e2535', borderRadius: 10, padding: 14, border: '1px solid #2a3348' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Subtotal', val: formatCurrency(afterDisc), color: '#e2e8f0' },
                { label: `GST ${form.gstPct}%`, val: formatCurrency(gstAmt), color: '#e2e8f0' },
                { label: 'Total', val: formatCurrency(total), color: '#10b981', big: true },
                { label: 'Balance Due', val: formatCurrency(balance), color: balance > 0 ? '#ef4444' : '#10b981', big: true },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 10, color: '#8892a4', marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: s.big ? 18 : 13, fontWeight: s.big ? 800 : 600, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* VIEW MODAL */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`${viewOrder?.orderNo} — ${viewOrder?.customer?.name}`} width={620}
        footer={<Button onClick={() => setViewOrder(null)}>Close</Button>}>
        {viewOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total',   val: formatCurrency(viewOrder.totalAmount), color: '#10b981' },
                { label: 'Advance', val: formatCurrency(viewOrder.advancePaid),  color: '#3b82f6' },
                { label: 'Balance', val: formatCurrency(viewOrder.balanceDue),   color: viewOrder.balanceDue > 0 ? '#ef4444' : '#10b981' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: '#1e2535', borderRadius: 8, padding: 12, border: '1px solid #2a3348', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#8892a4', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
                </div>
              ))}
            </div>
            {viewOrder.pItems?.map((item: FrameItem, i: number) => (
              <div key={i} style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 10 }}>Frame {i+1}{item.description ? ` — ${item.description}` : ''}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, fontSize: 12, marginBottom: 10 }}>
                  <div><span style={{ color:'#8892a4' }}>Type: </span><strong style={{ color:'#f59e0b' }}>{item.frameType}</strong></div>
                  <div><span style={{ color:'#8892a4' }}>Finish: </span><strong>{item.frameFinish}</strong></div>
                  <div><span style={{ color:'#8892a4' }}>Size: </span><strong>{item.widthFt}×{item.heightFt}ft ({item.sqFt.toFixed(2)} sqft)</strong></div>
                  <div><span style={{ color:'#8892a4' }}>Qty: </span><strong>{item.qty} piece{parseInt(item.qty)>1?'s':''}</strong></div>
                </div>
                <div style={{ background: '#252d40', borderRadius: 8, padding: 10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #2a3348', fontSize:12 }}>
                    <span style={{ color:'#8892a4' }}>🖼️ Frame — ₹{item.framePricePerPiece}/pc × {item.qty}</span>
                    <strong style={{ color:'#f59e0b' }}>₹{item.frameAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  {item.includesFlex && (
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #2a3348', fontSize:12 }}>
                      <span style={{ color:'#8892a4' }}>🖨️ {item.flexMedia} — ₹{item.flexPricePerPiece}/pc × {item.qty}</span>
                      <strong style={{ color:'#3b82f6' }}>₹{item.flexAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {item.installationRequired && (
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #2a3348', fontSize:12 }}>
                      <span style={{ color:'#8892a4' }}>🔧 Installation{item.notes?` — ${item.notes}`:''}</span>
                      <strong style={{ color:'#10b981' }}>₹{parseFloat(item.installationCharge||'0').toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0 0', fontSize:14, fontWeight:800 }}>
                    <span style={{ color:'#e2e8f0' }}>Item Total</span>
                    <span style={{ color:'#10b981' }}>₹{item.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ marginTop:16, marginBottom:8, fontSize:10, color:'#8892a4', fontWeight:600, textTransform:'uppercase' }}>Update Status</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {Object.entries(ORDER_STATUS).map(([key,val]) => (
                <button key={key} onClick={() => updateStatus(viewOrder.id, key)}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:11, cursor:'pointer', fontWeight:viewOrder.status===key?700:400, border:`1px solid ${viewOrder.status===key?'#f59e0b':'#2a3348'}`, background:viewOrder.status===key?'rgba(245,158,11,.15)':'#1e2535', color:viewOrder.status===key?'#f59e0b':'#8892a4' }}>
                  {(val as any).icon} {(val as any).label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ADD CUSTOMER MODAL */}
      <Modal open={showCustModal} onClose={() => setShowCustModal(false)} title="Add New Customer"
        footer={<><Button onClick={() => setShowCustModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAddCustomer}>💾 Save</Button></>}>
        <form onSubmit={handleAddCustomer}>
          <FormGroup label="Name *"><Input value={custForm.name} onChange={e => setCustForm(p=>({...p,name:e.target.value}))} required /></FormGroup>
          <FormGroup label="Mobile *"><Input value={custForm.mobile} onChange={e => setCustForm(p=>({...p,mobile:e.target.value}))} required /></FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Email"><Input value={custForm.email} onChange={e => setCustForm(p=>({...p,email:e.target.value}))} /></FormGroup>
            <FormGroup label="City"><Input value={custForm.city} onChange={e => setCustForm(p=>({...p,city:e.target.value}))} /></FormGroup>
          </Grid>
        </form>
      </Modal>
    </PageShell>
  )
}