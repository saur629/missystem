'use client'
import { useState, useEffect, useCallback, memo } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import {
  StatCard, Badge, Button, Modal, FormGroup, Input, Select,
  Textarea, Card, CardHeader, CardTitle, Loading, Empty, Grid, InfoBox,
} from '@/components/ui'
import { formatCurrency, formatDate, ORDER_STATUS, PRIORITY_COLOR } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── Constants ────────────────────────────────────────────────────────────────
const FLEX_MEDIA      = ['Star Flex','Black Back','One Way Vision','Canvas','Backlit','Normal Vinyl','Eco Solvent','UV Print','Gloss Laminated']
const ORDER_TYPES     = ['FLEX','OFFSET','DIGITAL','SCREEN','OTHER']
const PAYMENT_METHODS = ['Cash','UPI','NEFT/RTGS','Cheque','Card','Credit (pay later)']
const TASK_STATUSES   = ['PENDING','IN_PROGRESS','DONE'] as const
const STATUS_COLOR: Record<string, string> = { PENDING: '#8892a4', IN_PROGRESS: '#f59e0b', DONE: '#10b981' }

const INCH_TO_FT = 1 / 12

const defaultFlexItem  = (): any => ({ id: Date.now() + Math.random(), description: '', widthFt: '', heightFt: '', unit: 'ft', sqFt: 0, ratePerSqFt: '', flexMedia: 'Star Flex', qty: '1', amount: 0, designStatus: 'PENDING', printStatus: 'PENDING' })
const defaultPrintItem = (): any => ({ id: Date.now() + Math.random(), jobName: '', qty: '', sellingPrice: '', size: '', colors: '4-color (CMYK)', printSide: 'SINGLE', lamination: '', description: '', amount: 0, designStatus: 'PENDING', printStatus: 'PENDING' })
const defaultForm = { customerId: '', orderType: 'FLEX', priority: 'NORMAL', dueDate: '', notes: '', vendorName: '', costPrice: '', discount: '0', gstPct: '18', advancePaid: '0', paymentMethod: 'Cash' }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcFlexItem(item: any, changed: Record<string, string>) {
  const merged = { ...item, ...changed }
  let wFt = 0, hFt = 0
  if (merged.unit === 'ft') {
    wFt = parseFloat(merged.widthFt)  || 0
    hFt = parseFloat(merged.heightFt) || 0
  } else {
    wFt = (parseFloat(merged.widthFt)  || 0) * INCH_TO_FT
    hFt = (parseFloat(merged.heightFt) || 0) * INCH_TO_FT
  }
  const r    = parseFloat(merged.ratePerSqFt) || 0
  const q    = parseInt(merged.qty || '1') || 1
  const sqFt   = parseFloat((wFt * hFt).toFixed(4))
  const amount = parseFloat((sqFt * r * q).toFixed(2))
  return { ...merged, sqFt, amount }
}

// ─── FlexItemRow — defined OUTSIDE main component so React never remounts it ──
const FlexItemRow = memo(function FlexItemRow({ item, idx, total, onChange, onRemove }: {
  item: any; idx: number; total: number
  onChange: (id: any, key: string, val: string) => void
  onRemove: (id: any) => void
}) {
  const isFt = item.unit !== 'inches'
  return (
    <div style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6' }}>Item {idx + 1}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* ft / inches toggle */}
          <div style={{ display: 'flex', background: '#252d40', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a3348' }}>
            {(['ft', 'inches'] as const).map(u => (
              <button key={u} type="button" onClick={() => onChange(item.id, 'unit', u)}
                style={{ padding: '3px 10px', fontSize: 10, cursor: 'pointer', fontWeight: item.unit === u ? 700 : 400, background: item.unit === u ? '#3b82f6' : 'transparent', color: item.unit === u ? '#fff' : '#8892a4', border: 'none' }}>
                {u}
              </button>
            ))}
          </div>
          {total > 1 && (
            <button type="button" onClick={() => onRemove(item.id)}
              style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: '2px 8px' }}>
              ✕ Remove
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Width ({isFt ? 'ft' : 'in'})</div>
          <Input type="number" step="0.01" value={item.widthFt} onChange={e => onChange(item.id, 'widthFt', e.target.value)} placeholder="0" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Height ({isFt ? 'ft' : 'in'})</div>
          <Input type="number" step="0.01" value={item.heightFt} onChange={e => onChange(item.id, 'heightFt', e.target.value)} placeholder="0" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sq.Ft (Auto)</div>
          <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#10b981', textAlign: 'center' }}>
            {item.sqFt?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate/sqft ₹</div>
          <Input type="number" step="0.01" value={item.ratePerSqFt} onChange={e => onChange(item.id, 'ratePerSqFt', e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</div>
          <Input type="number" min="1" value={item.qty} onChange={e => onChange(item.id, 'qty', e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</div>
          <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#f59e0b', textAlign: 'center' }}>
            ₹{(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flex Media</div>
          <Select value={item.flexMedia} onChange={e => onChange(item.id, 'flexMedia', e.target.value)}>
            {FLEX_MEDIA.map(m => <option key={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description / Label</div>
          <Input value={item.description} onChange={e => onChange(item.id, 'description', e.target.value)} placeholder="e.g. Shop Banner, Left Side" />
        </div>
      </div>
    </div>
  )
})

// ─── PrintItemRow ─────────────────────────────────────────────────────────────
const PrintItemRow = memo(function PrintItemRow({ item, idx, total, onChange, onRemove }: {
  item: any; idx: number; total: number
  onChange: (id: any, key: string, val: string) => void
  onRemove: (id: any) => void
}) {
  return (
    <div style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6' }}>Item {idx + 1}</span>
        {total > 1 && (
          <button type="button" onClick={() => onRemove(item.id)}
            style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 6, color: '#ef4444', fontSize: 11, cursor: 'pointer', padding: '2px 8px' }}>
            ✕ Remove
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Name *</div>
          <Input value={item.jobName} onChange={e => onChange(item.id, 'jobName', e.target.value)} placeholder="e.g. Visiting Card" />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty *</div>
          <Input type="number" value={item.qty} onChange={e => onChange(item.id, 'qty', e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate/piece ₹</div>
          <Input type="number" step="0.01" value={item.sellingPrice} onChange={e => onChange(item.id, 'sellingPrice', e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</div>
          <div style={{ padding: '8px 10px', background: '#252d40', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#f59e0b', textAlign: 'center' }}>
            ₹{(item.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Size</div>
          <Input value={item.size} onChange={e => onChange(item.id, 'size', e.target.value)} placeholder="A4, 12x18..." />
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Colors</div>
          <Select value={item.colors} onChange={e => onChange(item.id, 'colors', e.target.value)}>
            {['1-color','2-color','4-color (CMYK)','Spot Color'].map(c => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Print Side</div>
          <Select value={item.printSide} onChange={e => onChange(item.id, 'printSide', e.target.value)}>
            <option value="SINGLE">Single</option><option value="DOUBLE">Double</option>
          </Select>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lamination</div>
          <Select value={item.lamination} onChange={e => onChange(item.id, 'lamination', e.target.value)}>
            <option value="">None</option>
            {['Matt Lam','Glossy Lam','Soft Touch','UV Coating'].map(l => <option key={l}>{l}</option>)}
          </Select>
        </div>
      </div>
    </div>
  )
})

// ─── OrderFormBody — stable top-level component, receives everything as props ──
const OrderFormBody = memo(function OrderFormBody({
  form, items, customers, subTotalItems, afterDisc, gstAmt, total, balance, profit,
  onFormChange, onAddItem, onUpdateItem, onRemoveItem, onNewCustomer,
}: any) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 0 }}>
        <div style={{ flex: 1 }}>
          <FormGroup label="Customer *">
            <Select value={form.customerId} onChange={e => onFormChange('customerId', e.target.value)} required>
              <option value="">Select Customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </Select>
          </FormGroup>
        </div>
        <Button type="button" onClick={onNewCustomer} style={{ marginBottom: 14 }}>+ New</Button>
      </div>

      <Grid cols={3} gap={10}>
        <FormGroup label="Order Type *">
          <Select value={form.orderType} onChange={e => onFormChange('orderType', e.target.value)}>
            {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </FormGroup>
        <FormGroup label="Priority">
          <Select value={form.priority} onChange={e => onFormChange('priority', e.target.value)}>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">🟡 Urgent</option>
            <option value="EXPRESS">🔴 Express</option>
          </Select>
        </FormGroup>
        <FormGroup label="Due Date">
          <Input type="date" value={form.dueDate} onChange={e => onFormChange('dueDate', e.target.value)} />
        </FormGroup>
      </Grid>

      {/* Items */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
            {form.orderType === 'FLEX' ? '📏 Banner / Flex Items' : '🖨️ Print Items'}
            <span style={{ marginLeft: 8, fontSize: 10, color: '#8892a4', fontWeight: 400 }}>{items.length} item{items.length > 1 ? 's' : ''}</span>
          </div>
          <Button type="button" size="sm" variant="primary" onClick={onAddItem}>+ Add Item</Button>
        </div>

        {form.orderType === 'FLEX'
          ? items.map((item: any, idx: number) => (
              <FlexItemRow key={item.id} item={item} idx={idx} total={items.length} onChange={onUpdateItem} onRemove={onRemoveItem} />
            ))
          : items.map((item: any, idx: number) => (
              <PrintItemRow key={item.id} item={item} idx={idx} total={items.length} onChange={onUpdateItem} onRemove={onRemoveItem} />
            ))
        }

        <div style={{ background: '#252d40', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#8892a4' }}>{items.length} item(s) subtotal</span>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{formatCurrency(subTotalItems)}</span>
        </div>
      </div>

      <Grid cols={3} gap={12}>
        <FormGroup label="Vendor (if outsourced)">
          <Input value={form.vendorName} onChange={e => onFormChange('vendorName', e.target.value)} placeholder="Vendor name" />
        </FormGroup>
        <FormGroup label="Cost Price ₹ (profit calc)">
          <Input type="number" step="0.01" value={form.costPrice} onChange={e => onFormChange('costPrice', e.target.value)} placeholder="0.00" />
        </FormGroup>
        <FormGroup label="Payment Method">
          <Select value={form.paymentMethod} onChange={e => onFormChange('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </Select>
        </FormGroup>
      </Grid>

      <FormGroup label="Notes / Instructions">
        <Textarea value={form.notes} onChange={e => onFormChange('notes', e.target.value)} rows={2} placeholder="Special instructions..." />
      </FormGroup>

      <Grid cols={3} gap={12}>
        <FormGroup label="Discount ₹">
          <Input type="number" value={form.discount} onChange={e => onFormChange('discount', e.target.value)} />
        </FormGroup>
        <FormGroup label="GST %">
          <Select value={form.gstPct} onChange={e => onFormChange('gstPct', e.target.value)}>
            <option value="0">No GST</option><option value="5">5%</option>
            <option value="12">12%</option><option value="18">18%</option>
          </Select>
        </FormGroup>
        <FormGroup label="Advance Paid ₹">
          <Input type="number" value={form.advancePaid} onChange={e => onFormChange('advancePaid', e.target.value)} />
        </FormGroup>
      </Grid>

      {/* Summary */}
      <div style={{ background: '#1e2535', borderRadius: 10, padding: 14, border: '1px solid #2a3348' }}>
        <div style={{ display: 'grid', gridTemplateColumns: profit !== null ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div><div style={{ fontSize: 10, color: '#8892a4', marginBottom: 3 }}>Subtotal</div><div style={{ fontWeight: 600 }}>{formatCurrency(afterDisc)}</div></div>
          <div><div style={{ fontSize: 10, color: '#8892a4', marginBottom: 3 }}>GST {form.gstPct}%</div><div style={{ fontWeight: 600 }}>{formatCurrency(gstAmt)}</div></div>
          <div><div style={{ fontSize: 10, color: '#8892a4', marginBottom: 3 }}>Total</div><div style={{ fontSize: 17, fontWeight: 800, color: '#10b981' }}>{formatCurrency(total)}</div></div>
          <div><div style={{ fontSize: 10, color: '#8892a4', marginBottom: 3 }}>Balance Due</div><div style={{ fontSize: 15, fontWeight: 700, color: balance > 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(balance)}</div></div>
          {profit !== null && <div><div style={{ fontSize: 10, color: '#8892a4', marginBottom: 3 }}>Profit</div><div style={{ fontWeight: 700, color: profit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(profit)}</div></div>}
        </div>
      </div>
    </>
  )
})

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'USER'

  const [orders, setOrders]               = useState<any[]>([])
  const [customers, setCustomers]         = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [showModal, setShowModal]         = useState(false)
  const [showCustModal, setShowCustModal] = useState(false)
  const [viewOrder, setViewOrder]         = useState<any>(null)
  const [editOrder, setEditOrder]         = useState<any>(null)
  const [deleteTarget, setDeleteTarget]   = useState<any>(null)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterType, setFilterType]       = useState('')
  const [search, setSearch]               = useState('')
  const [form, setForm]                   = useState(defaultForm)
  const [items, setItems]                 = useState<any[]>([defaultFlexItem()])
  const [custForm, setCustForm]           = useState({ name: '', mobile: '', email: '', city: '', gstNo: '' })

  // useCallback so child memo components never re-mount
  const handleFormChange = useCallback((k: string, v: string) => setForm(p => ({ ...p, [k]: v })), [])

  const handleUpdateItem = useCallback((id: any, key: string, val: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      if (['widthFt','heightFt','ratePerSqFt','qty','unit','flexMedia','description'].includes(key)) {
        return calcFlexItem(item, { [key]: val })
      }
      // print item amount calc
      const updated = { ...item, [key]: val }
      if (key === 'sellingPrice' || key === 'qty') {
        const sp = parseFloat(key === 'sellingPrice' ? val : updated.sellingPrice) || 0
        const q  = parseInt(key === 'qty' ? val : updated.qty) || 0
        updated.amount = sp * q
      }
      return updated
    }))
  }, [])

  const handleAddItem = useCallback(() => {
    setItems(prev => {
      // read orderType from form at call time via closure — but form may be stale in memo
      // so we derive from existing items' shape
      const isFlex = 'widthFt' in (prev[0] || {})
      return [...prev, isFlex ? defaultFlexItem() : defaultPrintItem()]
    })
  }, [])

  const handleRemoveItem = useCallback((id: any) => {
    setItems(prev => {
      if (prev.length === 1) { toast.error('At least one item required'); return prev }
      return prev.filter(i => i.id !== id)
    })
  }, [])

  useEffect(() => {
    setItems([form.orderType === 'FLEX' ? defaultFlexItem() : defaultPrintItem()])
  }, [form.orderType])

  // Totals
  const subTotalItems = items.reduce((s, i) => s + (i.amount || 0), 0)
  const disc          = parseFloat(form.discount || '0')
  const afterDisc     = subTotalItems - disc
  const gstAmt        = afterDisc * parseFloat(form.gstPct || '18') / 100
  const total         = afterDisc + gstAmt
  const balance       = total - parseFloat(form.advancePaid || '0')
  const costTotal     = form.costPrice ? parseFloat(form.costPrice) : null
  const profit        = costTotal !== null ? afterDisc - costTotal : null

  // Fetch
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterType)   params.set('orderType', filterType)
    if (search)       params.set('search', search)
    const res  = await fetch(`/api/orders?${params}`)
    const data = await res.json()
    setOrders(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filterStatus, filterType, search])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
  }, [])

  function resetForm() { setForm(defaultForm); setItems([defaultFlexItem()]) }

  function buildPayload() {
    const normItems = items.map(i => ({ ...i, sqFt: i.sqFt ?? 0 }))
    return {
      ...form, items: normItems,
      subTotal: afterDisc, gstAmount: gstAmt, totalAmount: total,
      advancePaid: parseFloat(form.advancePaid || '0'),
      balanceDue: balance, itemCount: items.length,
      orderItemsJson: JSON.stringify(normItems),
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) { toast.error('Select a customer'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
      if (!res.ok) throw new Error()
      const order = await res.json()
      setOrders(p => [order, ...p])
      setShowModal(false); resetForm()
      toast.success(`✅ Order ${order.orderNo} created!`)
    } catch { toast.error('Failed to create order') }
    setSaving(false)
  }

  function openEdit(o: any) {
    const parsed = (() => { try { return JSON.parse(o.orderItemsJson || '[]') } catch { return [] } })()
    setEditOrder(o)
    setForm({
      customerId: o.customerId, orderType: o.orderType, priority: o.priority,
      dueDate: o.dueDate ? o.dueDate.slice(0, 10) : '',
      notes: o.notes || '', vendorName: o.vendorName || '',
      costPrice: o.costPrice != null ? String(o.costPrice) : '',
      discount: String(o.discount ?? 0), gstPct: String(o.gstPct ?? 18),
      advancePaid: String(o.advancePaid ?? 0), paymentMethod: o.paymentMethod || 'Cash',
    })
    setItems(parsed.length ? parsed : [o.orderType === 'FLEX' ? defaultFlexItem() : defaultPrintItem()])
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editOrder) return
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${editOrder.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(p => p.map(o => o.id === updated.id ? updated : o))
      setEditOrder(null); resetForm()
      toast.success('✅ Order updated!')
    } catch { toast.error('Failed to update order') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setOrders(p => p.filter(o => o.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('🗑️ Order deleted')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) {
      setOrders(p => p.map(o => o.id === id ? { ...o, status } : o))
      if (viewOrder?.id === id) setViewOrder((v: any) => ({ ...v, status }))
      toast.success(`→ ${ORDER_STATUS[status]?.label}`)
    }
  }

  async function saveItemStatuses(orderId: string, updatedItems: any[]) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItemsJson: JSON.stringify(updatedItems) }),
    })
    if (res.ok) {
      setOrders(p => p.map(o => o.id === orderId ? { ...o, orderItemsJson: JSON.stringify(updatedItems) } : o))
      toast.success('Task statuses saved ✅')
    } else { toast.error('Failed to save') }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custForm) })
    if (res.ok) {
      const c = await res.json()
      setCustomers(p => [...p, c])
      setForm(p => ({ ...p, customerId: c.id }))
      setShowCustModal(false)
      setCustForm({ name: '', mobile: '', email: '', city: '', gstNo: '' })
      toast.success('Customer added!')
    }
  }

  const canBook   = ['SUPER_ADMIN', 'ADMIN', 'RECEPTION'].includes(role)
  const canDelete = ['SUPER_ADMIN', 'ADMIN'].includes(role)
  const counts = {
    total:      orders.length,
    pending:    orders.filter(o => o.status === 'PENDING').length,
    inProgress: orders.filter(o => ['DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK'].includes(o.status)).length,
    ready:      orders.filter(o => o.status === 'READY').length,
  }

  const formProps = {
    form, items, customers, subTotalItems, afterDisc, gstAmt, total, balance, profit,
    onFormChange: handleFormChange,
    onAddItem:    handleAddItem,
    onUpdateItem: handleUpdateItem,
    onRemoveItem: handleRemoveItem,
    onNewCustomer: () => setShowCustModal(true),
  }

  return (
    <PageShell title="Orders" action={canBook ? { label: '+ New Order', onClick: () => setShowModal(true) } : undefined}>
      <div className="animate-in">

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total"       value={counts.total}      icon="📋" color="blue" />
          <StatCard label="Pending"     value={counts.pending}    icon="🔴" color="red" />
          <StatCard label="In Progress" value={counts.inProgress} icon="⚙️" color="yellow" />
          <StatCard label="Ready"       value={counts.ready}      icon="📦" color="green" />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <Input placeholder="🔍 Search name, mobile, order no..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()}
            style={{ flex: 1, minWidth: 200 }} />
          <Select style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{(v as any).icon} {(v as any).label}</option>)}
          </Select>
          <Select style={{ width: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Button onClick={fetchOrders}>Search</Button>
          {canBook && <Button variant="primary" onClick={() => setShowModal(true)}>+ New Order</Button>}
        </div>

        <Card>
          <CardHeader><CardTitle>All Orders ({orders.length})</CardTitle></CardHeader>
          {loading ? <Loading /> : orders.length === 0 ? <Empty message="No orders yet." /> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order No</th><th>Date</th><th>Customer</th><th>Mobile</th>
                    <th>Type</th><th>Items</th><th>Payment</th>
                    <th>Total</th><th>Advance</th><th>Balance</th>
                    <th>Due Date</th><th>Priority</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const st      = ORDER_STATUS[o.status]
                    const overdue = o.dueDate && new Date(o.dueDate) < new Date() && !['DELIVERED','CANCELLED'].includes(o.status)
                    const pItems: any[] = (() => { try { return JSON.parse(o.orderItemsJson || '[]') } catch { return [] } })()
                    const allDesign = pItems.length > 0 && pItems.every((i: any) => i.designStatus === 'DONE')
                    const allPrint  = pItems.length > 0 && pItems.every((i: any) => i.printStatus  === 'DONE')
                    return (
                      <tr key={o.id}>
                        <td style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 11 }}>{o.orderNo}</td>
                        <td style={{ color: '#8892a4', fontSize: 11, whiteSpace: 'nowrap' }}>{formatDate(o.date)}</td>
                        <td style={{ fontWeight: 600 }}>{o.customer?.name}</td>
                        <td style={{ fontSize: 11, color: '#8892a4' }}>{o.customer?.mobile}</td>
                        <td><Badge color="blue">{o.orderType}</Badge></td>
                        <td>
                          <div style={{ fontSize: 11 }}>
                            {o.itemCount > 1
                              ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>📦 {o.itemCount} items</span>
                              : <span style={{ color: '#8892a4' }}>{o.orderType === 'FLEX' ? `${o.sqFt?.toFixed(1)} sqft` : `${o.jobName || '—'} ×${o.qty}`}</span>
                            }
                          </div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: allDesign ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.1)', color: allDesign ? '#10b981' : '#f59e0b' }}>🎨 {allDesign ? 'Done' : 'Design'}</span>
                            <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: allPrint  ? 'rgba(16,185,129,.15)' : 'rgba(139,92,246,.1)',  color: allPrint  ? '#10b981' : '#8b5cf6' }}>🖨️ {allPrint  ? 'Done' : 'Print'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: '#8892a4' }}>{o.paymentMethod || '—'}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(o.totalAmount)}</td>
                        <td style={{ color: '#3b82f6' }}>{formatCurrency(o.advancePaid)}</td>
                        <td style={{ color: o.balanceDue > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{formatCurrency(o.balanceDue)}</td>
                        <td style={{ fontSize: 11, color: overdue ? '#ef4444' : '#8892a4', whiteSpace: 'nowrap' }}>
                          {o.dueDate ? formatDate(o.dueDate) : '—'}{overdue ? ' ⚠️' : ''}
                        </td>
                        <td><Badge color={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge></td>
                        <td><Badge color={(st as any)?.color}>{(st as any)?.icon} {(st as any)?.label}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Button size="sm" onClick={() => setViewOrder({ ...o, orderItems: (() => { try { return JSON.parse(o.orderItemsJson || '[]') } catch { return [] } })() })}>👁 View</Button>
                            {canBook   && <Button size="sm" variant="primary" onClick={() => openEdit(o)}>✏️ Edit</Button>}
                            {canDelete && <Button size="sm" onClick={() => setDeleteTarget(o)} style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', color: '#ef4444' }}>🗑️</Button>}
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

      {/* CREATE */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="📋 New Order Booking" width={700}
        footer={<>
          <Button onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : `💾 Save Order (${items.length} item${items.length > 1 ? 's' : ''})`}</Button>
        </>}>
        <form onSubmit={handleCreate}><OrderFormBody {...formProps} /></form>
      </Modal>

      {/* EDIT */}
      <Modal open={!!editOrder} onClose={() => { setEditOrder(null); resetForm() }} title={`✏️ Edit — ${editOrder?.orderNo}`} width={700}
        footer={<>
          <Button onClick={() => { setEditOrder(null); resetForm() }}>Cancel</Button>
          <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : '💾 Update Order'}</Button>
        </>}>
        <form onSubmit={handleEdit}><OrderFormBody {...formProps} /></form>
      </Modal>

      {/* VIEW */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`${viewOrder?.orderNo} — ${viewOrder?.customer?.name}`} width={680}
        footer={<Button onClick={() => setViewOrder(null)}>Close</Button>}>
        {viewOrder && (() => {
          const vItems: any[] = viewOrder.orderItems || []
          const setVItems = (updated: any[]) => setViewOrder((v: any) => ({ ...v, orderItems: updated }))
          return (
            <div>
              <Grid cols={3} gap={14} style={{ marginBottom: 16 }}>
                <InfoBox label="Order Type" value={viewOrder.orderType} />
                <InfoBox label="Priority"   value={viewOrder.priority} />
                <InfoBox label="Payment"    value={viewOrder.paymentMethod || '—'} />
                <InfoBox label="Total"      value={formatCurrency(viewOrder.totalAmount)} color="#10b981" />
                <InfoBox label="Advance"    value={formatCurrency(viewOrder.advancePaid)} color="#3b82f6" />
                <InfoBox label="Balance"    value={formatCurrency(viewOrder.balanceDue)}  color={viewOrder.balanceDue > 0 ? '#ef4444' : '#10b981'} />
                <InfoBox label="Due Date"   value={viewOrder.dueDate ? formatDate(viewOrder.dueDate) : '—'} />
                <InfoBox label="GST"        value={`${viewOrder.gstPct}% = ${formatCurrency(viewOrder.gstAmount)}`} />
                <InfoBox label="Discount"   value={formatCurrency(viewOrder.discount)} />
              </Grid>

              {viewOrder.notes && (
                <div style={{ background: '#1e2535', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12, color: '#8892a4' }}>📝 {viewOrder.notes}</div>
              )}

              {vItems.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>🎨 Design & 🖨️ Print Task Tracker</div>
                  {vItems.map((item: any, idx: number) => (
                    <div key={item.id || idx} style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
                        Item {idx + 1}: {item.description || item.jobName || `${item.widthFt ?? item.width}×${item.heightFt ?? item.height} ${item.unit || 'ft'}`}
                        <span style={{ marginLeft: 8, fontSize: 10, color: '#8892a4', fontWeight: 400 }}>{item.sqFt?.toFixed(2)} sqft — {formatCurrency(item.amount)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {(['design','print'] as const).map(dept => {
                          const field = dept === 'design' ? 'designStatus' : 'printStatus'
                          return (
                            <div key={dept}>
                              <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {dept === 'design' ? '🎨' : '🖨️'} {dept} Status
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {TASK_STATUSES.map(s => (
                                  <button key={s} type="button"
                                    onClick={() => setVItems(vItems.map((it: any, i: number) => i === idx ? { ...it, [field]: s } : it))}
                                    style={{ flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: item[field] === s ? 700 : 400, border: `1px solid ${item[field] === s ? STATUS_COLOR[s] : '#2a3348'}`, background: item[field] === s ? `${STATUS_COLOR[s]}22` : '#252d40', color: item[field] === s ? STATUS_COLOR[s] : '#8892a4' }}>
                                    {s === 'PENDING' ? '⏳' : s === 'IN_PROGRESS' ? '🔄' : '✅'} {s.replace('_',' ')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button variant="primary" size="sm" onClick={() => saveItemStatuses(viewOrder.id, vItems)}>💾 Save Task Statuses</Button>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 8, fontSize: 10, color: '#8892a4', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Update Order Status</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(ORDER_STATUS).map(([key, val]) => (
                  <button key={key} onClick={() => updateStatus(viewOrder.id, key)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: `1px solid ${viewOrder.status === key ? '#3b82f6' : '#2a3348'}`, background: viewOrder.status === key ? 'rgba(59,130,246,.15)' : '#1e2535', color: viewOrder.status === key ? '#3b82f6' : '#8892a4', fontWeight: viewOrder.status === key ? 700 : 400 }}>
                    {(val as any).icon} {(val as any).label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* DELETE */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="🗑️ Delete Order"
        footer={<>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete} disabled={deleting} style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444' }}>
            {deleting ? 'Deleting...' : '🗑️ Yes, Delete'}
          </Button>
        </>}>
        {deleteTarget && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Delete {deleteTarget.orderNo}?</div>
            <div style={{ fontSize: 13, color: '#8892a4' }}>
              Customer: <strong style={{ color: '#e2e8f0' }}>{deleteTarget.customer?.name}</strong><br />
              Amount: <strong style={{ color: '#ef4444' }}>{formatCurrency(deleteTarget.totalAmount)}</strong>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,.08)', borderRadius: 8, padding: '8px 14px' }}>
              This cannot be undone. Status logs will also be deleted.
            </div>
          </div>
        )}
      </Modal>

      {/* ADD CUSTOMER */}
      <Modal open={showCustModal} onClose={() => setShowCustModal(false)} title="Add New Customer"
        footer={<><Button onClick={() => setShowCustModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAddCustomer}>💾 Save</Button></>}>
        <form onSubmit={handleAddCustomer}>
          <FormGroup label="Name *"><Input value={custForm.name}   onChange={e => setCustForm(p => ({ ...p, name:   e.target.value }))} required /></FormGroup>
          <FormGroup label="Mobile *"><Input value={custForm.mobile} onChange={e => setCustForm(p => ({ ...p, mobile: e.target.value }))} required /></FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Email"><Input value={custForm.email} onChange={e => setCustForm(p => ({ ...p, email: e.target.value }))} /></FormGroup>
            <FormGroup label="City"><Input  value={custForm.city}  onChange={e => setCustForm(p => ({ ...p, city:  e.target.value }))} /></FormGroup>
          </Grid>
          <FormGroup label="GST No."><Input value={custForm.gstNo} onChange={e => setCustForm(p => ({ ...p, gstNo: e.target.value }))} placeholder="09XXXXX1234Z1ZX" /></FormGroup>
        </form>
      </Modal>
    </PageShell>
  )
}