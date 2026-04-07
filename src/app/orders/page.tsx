'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge, Button, Modal, FormGroup, Input, Select, Textarea, Card, CardHeader, CardTitle, CardBody, StatCard, Loading, Empty } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_FLOW = [
  { key: 'PENDING',      label: 'Pending',        color: 'red',    icon: '🔴', roles: ['SUPER_ADMIN','ADMIN','RECEPTION'] },
  { key: 'DESIGNING',    label: 'Designing',       color: 'purple', icon: '🟣', roles: ['SUPER_ADMIN','ADMIN','DESIGNER'] },
  { key: 'DESIGN_DONE',  label: 'Design Done',     color: 'blue',   icon: '🔵', roles: ['SUPER_ADMIN','ADMIN','DESIGNER'] },
  { key: 'PRINTING',     label: 'Printing',        color: 'yellow', icon: '🟡', roles: ['SUPER_ADMIN','ADMIN','PRINTING'] },
  { key: 'PRINT_DONE',   label: 'Print Done',      color: 'teal',   icon: '🩵', roles: ['SUPER_ADMIN','ADMIN','PRINTING'] },
  { key: 'QUALITY_CHECK',label: 'Quality Check',   color: 'orange', icon: '🟠', roles: ['SUPER_ADMIN','ADMIN','PRODUCTION'] },
  { key: 'READY',        label: 'Ready',           color: 'green',  icon: '🟢', roles: ['SUPER_ADMIN','ADMIN','PRODUCTION'] },
  { key: 'DELIVERED',    label: 'Delivered',       color: 'green',  icon: '✅', roles: ['SUPER_ADMIN','ADMIN','RECEPTION','PRODUCTION'] },
  { key: 'CANCELLED',    label: 'Cancelled',       color: 'red',    icon: '❌', roles: ['SUPER_ADMIN','ADMIN'] },
]

const ORDER_TYPES = ['FLEX', 'OFFSET', 'DIGITAL', 'SCREEN', 'OTHER']
const PRIORITY_COLORS: Record<string, string> = { NORMAL: 'gray', URGENT: 'yellow', EXPRESS: 'red' }

export default function OrdersPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'USER'

  const [orders, setOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [viewOrder, setViewOrder] = useState<any>(null)
  const [editOrder, setEditOrder] = useState<any>(null)
  const [deleteOrder, setDeleteOrder] = useState<any>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [unit, setUnit] = useState<'ft' | 'inch'>('ft')

  const [form, setForm] = useState({
    customerId: '', orderType: 'FLEX',
    width: '', height: '', ratePerSqFt: '', flexMedia: '',
    jobName: '', paperType: '', paperGsm: '', size: '', qty: '',
    colors: '4-color (CMYK)', printSide: 'SINGLE', lamination: '',
    description: '', vendorName: '', costPrice: '', sellingPrice: '',
    discount: '0', gstPct: '18', advancePaid: '0',
    priority: 'NORMAL', dueDate: '', notes: '',
  })

  const [customerForm, setCustomerForm] = useState({ name: '', mobile: '', email: '', city: '', gstNo: '' })

  useEffect(() => { fetchOrders(); fetchCustomers() }, [filterStatus, filterType])

  async function fetchOrders() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterType) params.set('orderType', filterType)
    if (search) params.set('search', search)
    const res = await fetch(`/api/orders?${params}`)
    const data = await res.json()
    setOrders(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function fetchCustomers() {
    const res = await fetch('/api/customers')
    const data = await res.json()
    setCustomers(Array.isArray(data) ? data : [])
  }

  const sqFt = form.orderType === 'FLEX' && form.width && form.height
    ? unit === 'ft'
      ? parseFloat(form.width) * parseFloat(form.height)
      : (parseFloat(form.width) / 12) * (parseFloat(form.height) / 12)
    : 0
  const baseAmt = form.orderType === 'FLEX'
    ? sqFt * parseFloat(form.ratePerSqFt || '0')
    : parseFloat(form.sellingPrice || '0') * parseInt(form.qty || '1')
  const afterDiscount = baseAmt - parseFloat(form.discount || '0')
  const gstAmt = afterDiscount * parseFloat(form.gstPct || '18') / 100
  const total = afterDiscount + gstAmt
  const balance = total - parseFloat(form.advancePaid || '0')

  function resetForm() {
    setForm({ customerId: '', orderType: 'FLEX', width: '', height: '', ratePerSqFt: '', flexMedia: '', jobName: '', paperType: '', paperGsm: '', size: '', qty: '', colors: '4-color (CMYK)', printSide: 'SINGLE', lamination: '', description: '', vendorName: '', costPrice: '', sellingPrice: '', discount: '0', gstPct: '18', advancePaid: '0', priority: 'NORMAL', dueDate: '', notes: '' })
  }

  function openEdit(order: any) {
    setForm({
      customerId: order.customerId || '',
      orderType: order.orderType || 'FLEX',
      width: order.width?.toString() || '',
      height: order.height?.toString() || '',
      ratePerSqFt: order.ratePerSqFt?.toString() || '',
      flexMedia: order.flexMedia || '',
      jobName: order.jobName || '',
      paperType: order.paperType || '',
      paperGsm: order.paperGsm || '',
      size: order.size || '',
      qty: order.qty?.toString() || '',
      colors: order.colors || '4-color (CMYK)',
      printSide: order.printSide || 'SINGLE',
      lamination: order.lamination || '',
      description: order.description || '',
      vendorName: order.vendorName || '',
      costPrice: order.costPrice?.toString() || '',
      sellingPrice: order.sellingPrice?.toString() || '',
      discount: order.discount?.toString() || '0',
      gstPct: order.gstPct?.toString() || '18',
      advancePaid: order.advancePaid?.toString() || '0',
      priority: order.priority || 'NORMAL',
      dueDate: order.dueDate ? order.dueDate.split('T')[0] : '',
      notes: order.notes || '',
    })
    setEditOrder(order)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sqFt, unit }),
      })
      if (!res.ok) throw new Error()
      const order = await res.json()
      setOrders(prev => [order, ...prev])
      setShowModal(false)
      resetForm()
      toast.success(`Order ${order.orderNo} created!`)
    } catch { toast.error('Failed to create order') }
    setSaving(false)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editOrder) return
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${editOrder.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sqFt, unit }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === editOrder.id ? { ...o, ...updated } : o))
      setEditOrder(null)
      resetForm()
      toast.success('Order updated!')
    } catch { toast.error('Failed to update order') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteOrder) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${deleteOrder.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setOrders(prev => prev.filter(o => o.id !== deleteOrder.id))
      setDeleteOrder(null)
      toast.success('Order deleted!')
    } catch { toast.error('Failed to delete order') }
    setDeleting(false)
  }

  async function updateStatus(orderId: string, status: string) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      if (viewOrder?.id === orderId) setViewOrder((v: any) => ({ ...v, status }))
      toast.success(`Status updated!`)
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerForm),
    })
    if (res.ok) {
      const c = await res.json()
      setCustomers(prev => [...prev, c])
      setForm(f => ({ ...f, customerId: c.id }))
      setShowCustomerModal(false)
      setCustomerForm({ name: '', mobile: '', email: '', city: '', gstNo: '' })
      toast.success('Customer added!')
    }
  }

  const canBook = ['SUPER_ADMIN', 'ADMIN', 'RECEPTION'].includes(role)
  const canDelete = ['SUPER_ADMIN', 'ADMIN'].includes(role)
  const filtered = orders.filter(o => !search || o.orderNo?.includes(search) || o.customer?.name?.toLowerCase().includes(search.toLowerCase()) || o.customer?.mobile?.includes(search))

  const counts = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    inProgress: orders.filter(o => ['DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK'].includes(o.status)).length,
    ready: orders.filter(o => o.status === 'READY').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  }

  // Reusable form JSX
  const orderFormFields = (
    <form onSubmit={editOrder ? handleEdit : handleCreate}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <FormGroup label="Customer *">
            <Select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} required>
              <option value="">Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </Select>
          </FormGroup>
        </div>
        <Button type="button" onClick={() => setShowCustomerModal(true)} style={{ marginBottom: 14 }}>+ New</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <FormGroup label="Order Type *">
          <Select value={form.orderType} onChange={e => setForm(f => ({ ...f, orderType: e.target.value }))}>
            {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormGroup>
        <FormGroup label="Priority">
          <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
            <option value="EXPRESS">Express</option>
          </Select>
        </FormGroup>
        <FormGroup label="Due Date">
          <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        </FormGroup>
      </div>

      {form.orderType === 'FLEX' && (
        <div style={{ background: '#1e2535', borderRadius: 8, padding: 12, border: '1px solid #3b82f6', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6' }}>FLEX PRINTING DETAILS</div>
            <div style={{ display: 'flex', background: '#161b27', borderRadius: 6, padding: 2, gap: 2 }}>
              <button type="button" onClick={() => setUnit('ft')} style={{ padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: unit === 'ft' ? '#3b82f6' : 'transparent', color: unit === 'ft' ? '#fff' : '#8892a4' }}>Feet</button>
              <button type="button" onClick={() => setUnit('inch')} style={{ padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: unit === 'inch' ? '#3b82f6' : 'transparent', color: unit === 'inch' ? '#fff' : '#8892a4' }}>Inches</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <FormGroup label={`Width (${unit}) *`}>
              <Input type="number" step="0.01" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} placeholder="0.00" />
            </FormGroup>
            <FormGroup label={`Height (${unit}) *`}>
              <Input type="number" step="0.01" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="0.00" />
            </FormGroup>
            <FormGroup label="Sq. Ft (Auto)">
              <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                {sqFt.toFixed(2)} sqft
                {unit === 'inch' && form.width && form.height && <div style={{ fontSize: 10, color: '#8892a4', marginTop: 2 }}>{form.width}" x {form.height}"</div>}
              </div>
            </FormGroup>
            <FormGroup label="Rate/sqft (Rs.) *">
              <Input type="number" step="0.01" value={form.ratePerSqFt} onChange={e => setForm(f => ({ ...f, ratePerSqFt: e.target.value }))} placeholder="0.00" />
            </FormGroup>
          </div>
          <FormGroup label="Flex Media Type">
            <Select value={form.flexMedia} onChange={e => setForm(f => ({ ...f, flexMedia: e.target.value }))}>
              <option value="">Select Media</option>
              <option>Star Flex</option><option>Black Back</option><option>One Way Vision</option>
              <option>Canvas</option><option>Backlit</option><option>Normal Vinyl</option>
              <option>Eco Solvent</option><option>UV Print</option>
            </Select>
          </FormGroup>
        </div>
      )}

      {['OFFSET', 'DIGITAL', 'SCREEN'].includes(form.orderType) && (
        <div style={{ background: '#1e2535', borderRadius: 8, padding: 12, border: '1px solid #8b5cf6', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', marginBottom: 8 }}>🖨️ {form.orderType} PRINTING DETAILS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormGroup label="Job Name"><Input value={form.jobName} onChange={e => setForm(f => ({ ...f, jobName: e.target.value }))} placeholder="e.g. Visiting Card" /></FormGroup>
            <FormGroup label="Quantity *"><Input type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} placeholder="0" /></FormGroup>
            <FormGroup label="Paper Type"><Input value={form.paperType} onChange={e => setForm(f => ({ ...f, paperType: e.target.value }))} placeholder="Art Paper, Maplitho..." /></FormGroup>
            <FormGroup label="Paper GSM">
              <Select value={form.paperGsm} onChange={e => setForm(f => ({ ...f, paperGsm: e.target.value }))}>
                <option value="">Select GSM</option>
                <option>70 GSM</option><option>90 GSM</option><option>100 GSM</option><option>130 GSM</option><option>170 GSM</option><option>300 GSM</option>
              </Select>
            </FormGroup>
            <FormGroup label="Size">
              <Select value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
                <option value="">Select Size</option>
                <option>A4</option><option>A3</option><option>A5</option><option>3.5x2 inch</option><option>12x18</option><option>Custom</option>
              </Select>
            </FormGroup>
            <FormGroup label="Colors">
              <Select value={form.colors} onChange={e => setForm(f => ({ ...f, colors: e.target.value }))}>
                <option>1-color</option><option>2-color</option><option>4-color (CMYK)</option><option>Spot Color</option>
              </Select>
            </FormGroup>
            <FormGroup label="Print Side">
              <Select value={form.printSide} onChange={e => setForm(f => ({ ...f, printSide: e.target.value }))}>
                <option value="SINGLE">Single Side</option><option value="DOUBLE">Double Side</option>
              </Select>
            </FormGroup>
            <FormGroup label="Lamination">
              <Select value={form.lamination} onChange={e => setForm(f => ({ ...f, lamination: e.target.value }))}>
                <option value="">No Lamination</option><option>Matt Lamination</option><option>Glossy Lamination</option><option>Soft Touch</option><option>UV Coating</option>
              </Select>
            </FormGroup>
          </div>
          <FormGroup label="Selling Price per piece (Rs.) *">
            <Input type="number" step="0.01" value={form.sellingPrice} onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} placeholder="0.00" />
          </FormGroup>
        </div>
      )}

      <FormGroup label="Description / Instructions">
        <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Special instructions..." />
      </FormGroup>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormGroup label="Vendor Name"><Input value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} placeholder="Vendor / press name" /></FormGroup>
        <FormGroup label="Cost Price (Rs.)"><Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} placeholder="0.00" /></FormGroup>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <FormGroup label="Discount (Rs.)"><Input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="0" /></FormGroup>
        <FormGroup label="GST %">
          <Select value={form.gstPct} onChange={e => setForm(f => ({ ...f, gstPct: e.target.value }))}>
            <option value="0">No GST</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
          </Select>
        </FormGroup>
        <FormGroup label="Advance Paid (Rs.)"><Input type="number" value={form.advancePaid} onChange={e => setForm(f => ({ ...f, advancePaid: e.target.value }))} placeholder="0" /></FormGroup>
      </div>

      <div style={{ background: '#1e2535', borderRadius: 8, padding: 14, border: '1px solid #2a3348', marginTop: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12 }}>
          <div><div style={{ color: '#8892a4', marginBottom: 2 }}>Base Amount</div><div style={{ fontWeight: 600 }}>{formatCurrency(afterDiscount)}</div></div>
          <div><div style={{ color: '#8892a4', marginBottom: 2 }}>GST {form.gstPct}%</div><div style={{ fontWeight: 600 }}>{formatCurrency(gstAmt)}</div></div>
          <div><div style={{ color: '#8892a4', marginBottom: 2 }}>Total Amount</div><div style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>{formatCurrency(total)}</div></div>
          <div><div style={{ color: '#8892a4', marginBottom: 2 }}>Advance Paid</div><div style={{ color: '#3b82f6', fontWeight: 600 }}>{formatCurrency(parseFloat(form.advancePaid || '0'))}</div></div>
          <div><div style={{ color: '#8892a4', marginBottom: 2 }}>Balance Due</div><div style={{ color: balance > 0 ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: 15 }}>{formatCurrency(balance)}</div></div>
        </div>
      </div>
    </form>
  )

  return (
    <PageShell title="Orders" action={canBook ? { label: '+ New Order', onClick: () => setShowModal(true) } : undefined}>
      <div className="animate-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Orders" value={counts.total} icon="📋" color="blue" />
          <StatCard label="Pending" value={counts.pending} icon="🔴" color="red" />
          <StatCard label="In Progress" value={counts.inProgress} icon="⚙️" color="yellow" />
          <StatCard label="Ready" value={counts.ready} icon="✅" color="green" />
          <StatCard label="Delivered" value={counts.delivered} icon="🚚" color="green" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input placeholder="Search by name, mobile, order no..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            style={{ flex: 1, minWidth: 200 }} />
          <Select style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
          </Select>
          <Select style={{ width: 130 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {ORDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Button onClick={fetchOrders}>Search</Button>
          {canBook && <Button variant="primary" onClick={() => setShowModal(true)}>+ New Order</Button>}
        </div>

        <Card>
          <CardHeader><CardTitle>All Orders ({filtered.length})</CardTitle></CardHeader>
          {loading ? <Loading /> : filtered.length === 0 ? <Empty message="No orders found" /> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Order No</th><th>Date</th><th>Customer</th><th>Mobile</th><th>Type</th><th>Details</th><th>Amount</th><th>Advance</th><th>Balance</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filtered.map(order => {
                    const st = STATUS_FLOW.find(s => s.key === order.status)
                    return (
                      <tr key={order.id}>
                        <td style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 11 }}>{order.orderNo}</td>
                        <td style={{ fontSize: 11, color: '#8892a4' }}>{formatDate(order.date)}</td>
                        <td style={{ fontWeight: 500 }}>{order.customer?.name}</td>
                        <td style={{ fontSize: 11, color: '#8892a4' }}>{order.customer?.mobile}</td>
                        <td><Badge color="blue">{order.orderType}</Badge></td>
                        <td style={{ fontSize: 11, color: '#8892a4', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.orderType === 'FLEX' ? `${order.sqFt?.toFixed(2)} sqft @ Rs.${order.ratePerSqFt}/sqft` : `${order.jobName || order.description} x ${order.qty}`}
                        </td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(order.totalAmount)}</td>
                        <td style={{ color: '#3b82f6' }}>{formatCurrency(order.advancePaid)}</td>
                        <td style={{ color: order.balanceDue > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(order.balanceDue)}</td>
                        <td><Badge color={PRIORITY_COLORS[order.priority]}>{order.priority}</Badge></td>
                        <td><Badge color={st?.color || 'gray'}>{st?.icon} {st?.label}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Button size="sm" onClick={() => setViewOrder(order)}>View</Button>
                            {canBook && <Button size="sm" onClick={() => openEdit(order)}>Edit</Button>}
                            {canDelete && (
                              <button onClick={() => setDeleteOrder(order)}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                                Del
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* New Order Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="New Order Booking"
        footer={<>
          <Button onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save Order'}</Button>
        </>}>
        {orderFormFields}
      </Modal>

      {/* Edit Order Modal */}
      <Modal open={!!editOrder} onClose={() => { setEditOrder(null); resetForm() }} title={`Edit Order — ${editOrder?.orderNo}`}
        footer={<>
          <Button onClick={() => { setEditOrder(null); resetForm() }}>Cancel</Button>
          <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Update Order'}</Button>
        </>}>
        {orderFormFields}
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order — ${viewOrder?.orderNo}`}
        footer={<Button onClick={() => setViewOrder(null)}>Close</Button>}>
        {viewOrder && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                ['Customer', viewOrder.customer?.name],
                ['Mobile', viewOrder.customer?.mobile],
                ['Order Type', viewOrder.orderType],
                ['Priority', viewOrder.priority],
                ['Total Amount', formatCurrency(viewOrder.totalAmount)],
                ['Advance Paid', formatCurrency(viewOrder.advancePaid)],
                ['Balance Due', formatCurrency(viewOrder.balanceDue)],
                ['Due Date', viewOrder.dueDate ? formatDate(viewOrder.dueDate) : '-'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: '#8892a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13 }}>{v}</div>
                </div>
              ))}
            </div>
            {viewOrder.orderType === 'FLEX' && (
              <div style={{ background: '#1e2535', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: 6 }}>Flex Details</div>
                <div>Size: {viewOrder.width} x {viewOrder.height} ft = <b>{viewOrder.sqFt?.toFixed(2)} sqft</b></div>
                <div>Rate: Rs.{viewOrder.ratePerSqFt}/sqft | Media: {viewOrder.flexMedia || '-'}</div>
              </div>
            )}
            {viewOrder.description && (
              <div style={{ marginBottom: 14, fontSize: 12, color: '#8892a4', background: '#1e2535', borderRadius: 8, padding: 10 }}>{viewOrder.description}</div>
            )}
            <div>
              <div style={{ fontSize: 10, color: '#8892a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Update Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {STATUS_FLOW.filter(s => s.roles.includes(role)).map(s => (
                  <button key={s.key} onClick={() => updateStatus(viewOrder.id, s.key)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${viewOrder.status === s.key ? '#3b82f6' : '#2a3348'}`, background: viewOrder.status === s.key ? 'rgba(59,130,246,0.15)' : '#1e2535', color: viewOrder.status === s.key ? '#3b82f6' : '#8892a4', fontSize: 12, cursor: 'pointer', fontWeight: viewOrder.status === s.key ? 600 : 400 }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteOrder} onClose={() => setDeleteOrder(null)} title="Delete Order"
        footer={<>
          <Button onClick={() => setDeleteOrder(null)}>Cancel</Button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </>}>
        <div style={{ fontSize: 14, color: '#e2e8f0' }}>
          Are you sure you want to delete order <b>{deleteOrder?.orderNo}</b> for <b>{deleteOrder?.customer?.name}</b>?
          <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>This action cannot be undone.</div>
        </div>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal open={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Add New Customer"
        footer={<>
          <Button onClick={() => setShowCustomerModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddCustomer}>Save Customer</Button>
        </>}>
        <FormGroup label="Name *"><Input value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} required /></FormGroup>
        <FormGroup label="Mobile *"><Input value={customerForm.mobile} onChange={e => setCustomerForm(f => ({ ...f, mobile: e.target.value }))} required /></FormGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormGroup label="Email"><Input value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} /></FormGroup>
          <FormGroup label="City"><Input value={customerForm.city} onChange={e => setCustomerForm(f => ({ ...f, city: e.target.value }))} /></FormGroup>
        </div>
        <FormGroup label="GST No."><Input value={customerForm.gstNo} onChange={e => setCustomerForm(f => ({ ...f, gstNo: e.target.value }))} placeholder="09XXXXX1234Z1ZX" /></FormGroup>
      </Modal>
    </PageShell>
  )
}