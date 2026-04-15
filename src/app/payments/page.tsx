'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { StatCard, Badge, Button, Modal, FormGroup, Input, Select, Card, CardHeader, CardTitle, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT/RTGS', 'Cheque', 'Card']
const MODE_ICON:  Record<string,string> = { Cash:'💵', UPI:'📱', 'NEFT/RTGS':'🏦', Cheque:'📝', Card:'💳', CREDIT:'🏷️' }
const MODE_COLOR: Record<string,string> = { Cash:'#10b981', UPI:'#3b82f6', 'NEFT/RTGS':'#8b5cf6', Cheque:'#f59e0b', Card:'#f97316', CREDIT:'#14b8a6' }

function printReceipt(payment: any, shopName: string) {
  const now = new Date()
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt ${payment.receiptNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff}
    @page{size:A5;margin:12mm}
    .header{text-align:center;border-bottom:3px double #1a56db;padding-bottom:12px;margin-bottom:14px}
    .shop{font-size:20px;font-weight:800;color:#1a56db}
    .receipt-no{font-size:13px;font-weight:800;color:#1a56db;font-family:monospace;margin-top:4px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
    .info-box{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px}
    .info-label{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .info-value{font-size:12px;font-weight:700;color:#111}
    .amount-box{background:#1a56db;color:#fff;border-radius:10px;padding:16px;text-align:center;margin:14px 0}
    .amount-value{font-size:28px;font-weight:800;font-family:monospace}
    .mode-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-top:8px;background:rgba(255,255,255,.2);color:#fff}
    .order-ref{background:#f3f4f6;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px}
    .order-row{display:flex;justify-content:space-between;margin-bottom:4px}
    .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
    .sig-line{height:30px;border-bottom:1px solid #374151;margin-bottom:4px}
    .sig-label{font-size:9px;color:#6b7280;text-align:center}
    .footer{margin-top:14px;text-align:center;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
    .credit-badge{background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;display:inline-block;margin-top:6px}
    .thank-you{font-size:13px;font-weight:700;color:#1a56db;text-align:center;margin-top:10px}
  </style></head><body>
  <div class="header">
    <div class="shop">🖨️ ${shopName}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px">Payment Receipt</div>
    <div class="receipt-no">${payment.receiptNo}</div>
  </div>
  <div class="info-grid">
    <div class="info-box"><div class="info-label">Customer</div><div class="info-value">${payment.customer?.name||'—'}</div></div>
    <div class="info-box"><div class="info-label">Mobile</div><div class="info-value" style="color:#1a56db">${payment.customer?.mobile||'—'}</div></div>
    <div class="info-box"><div class="info-label">Date</div><div class="info-value">${new Date(payment.date||payment.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
    <div class="info-box"><div class="info-label">Time</div><div class="info-value">${now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>
  </div>
  <div class="amount-box">
    <div style="font-size:11px;opacity:.8;margin-bottom:4px">Amount Received</div>
    <div class="amount-value">₹${Number(payment.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
    <div class="mode-badge">${MODE_ICON[payment.mode]||'💰'} ${payment.mode}</div>
  </div>
  ${(payment.creditAdded||0)>0?`<div style="text-align:center;margin-bottom:10px"><span class="credit-badge">✅ ₹${payment.creditAdded.toLocaleString('en-IN')} added to credit balance</span></div>`:''}
  ${payment.order?`<div class="order-ref">
    <div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:6px">Against Order</div>
    <div class="order-row"><span style="color:#6b7280">Order No.</span><span style="font-weight:700;color:#1a56db;font-family:monospace">${payment.order.orderNo}</span></div>
    <div class="order-row"><span style="color:#6b7280">This Payment</span><span style="font-weight:600;color:#059669">₹${Number(payment.amount).toLocaleString('en-IN')}</span></div>
    <div class="order-row"><span style="color:#6b7280">Balance After</span><span style="font-weight:600;color:${(payment.order.balanceDue||0)>0?'#dc2626':'#059669'}">₹${(payment.order.balanceDue||0).toLocaleString('en-IN')}</span></div>
  </div>`:''} 
  ${payment.notes?`<div style="background:#f9fafb;border-radius:6px;padding:8px 12px;font-size:11px;color:#6b7280;margin-bottom:14px">📝 ${payment.notes}</div>`:''}
  <div class="sig-row">
    <div><div class="sig-line"></div><div class="sig-label">Authorised Signatory</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Customer Signature</div></div>
  </div>
  <div class="thank-you">🙏 Thank you for your payment!</div>
  <div class="footer">${shopName} • ${payment.receiptNo} • ${now.toLocaleString('en-IN')}</div>
  </body></html>`
  const win = window.open('','_blank','width=700,height=550')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

export default function PaymentsPage() {
  const shopName = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SHOP_NAME||'PrintFlow') : 'PrintFlow'

  const [payments, setPayments]       = useState<any[]>([])
  const [customers, setCustomers]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [showModal, setShowModal]     = useState(false)
  const [editPayment, setEditPayment] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting]       = useState(false)
  const [viewLedger, setViewLedger]   = useState<any>(null)
  const [ledgerData, setLedgerData]   = useState<any>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [search, setSearch]           = useState('')
  const [filterMode, setFilterMode]   = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')

  // Credit modal state
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditCustomer, setCreditCustomer]   = useState<any>(null)
  const [creditOrders, setCreditOrders]       = useState<any[]>([])
  const [creditForm, setCreditForm]           = useState({ orderId:'', amount:'' })

  // New payment form
  const [form, setForm] = useState({
    customerId:'', orderId:'', amount:'', mode:'Cash',
    reference:'', notes:'', date: new Date().toISOString().slice(0,10),
  })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Edit form
  const [editForm, setEditForm] = useState({ amount:'', mode:'Cash', reference:'', notes:'', date:'' })
  const ef = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }))

  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder]   = useState<any>(null)

  // Refresh customers (to get updated .balance)
  const refreshCustomers = useCallback(() => {
    fetch('/api/customers').then(r=>r.json()).then(d=>setCustomers(Array.isArray(d)?d:[]))
  }, [])

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMode)     params.set('mode', filterMode)
    if (filterCustomer) params.set('customerId', filterCustomer)
    if (search)         params.set('search', search)
    const res  = await fetch(`/api/payments?${params}`)
    const data = await res.json()
    setPayments(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filterMode, filterCustomer, search])

  useEffect(() => { fetchPayments() }, [fetchPayments])
  useEffect(() => { refreshCustomers() }, [refreshCustomers])

  // Load customer orders when customerId changes in form
  useEffect(() => {
    if (!form.customerId) { setCustomerOrders([]); setSelectedOrder(null); f('orderId',''); return }
    fetch(`/api/orders?customerId=${form.customerId}`).then(r=>r.json()).then(d => {
      const sorted = (Array.isArray(d)?d:[]).sort((a:any,b:any)=>(b.balanceDue||0)-(a.balanceDue||0))
      setCustomerOrders(sorted)
    })
  }, [form.customerId])

  useEffect(() => {
    if (!form.orderId) { setSelectedOrder(null); return }
    const o = customerOrders.find(o => o.id === form.orderId)
    setSelectedOrder(o||null)
    if (o && o.balanceDue > 0) f('amount', String(o.balanceDue.toFixed(2)))
  }, [form.orderId, customerOrders])

  const selectedCustomer = customers.find(c => c.id === form.customerId)
  const availableCredit  = selectedCustomer?.balance || 0

  // ── CREATE PAYMENT ─────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) { toast.error('Select a customer'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payments', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), orderId: form.orderId||null }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const payment = await res.json()
      setPayments(p => [payment, ...p])
      refreshCustomers()
      setShowModal(false); resetForm()
      if (payment.creditAdded > 0 && !form.orderId) {
        toast.success(`✅ ${payment.receiptNo} — ₹${payment.creditAdded.toLocaleString('en-IN')} stored as credit balance!`, { duration: 6000 })
      } else if (payment.creditAdded > 0) {
        toast.success(`✅ ${payment.receiptNo} — ₹${payment.creditAdded.toLocaleString('en-IN')} added to credit!`, { duration: 5000 })
      } else {
        toast.success(`✅ Receipt ${payment.receiptNo} recorded!`)
      }
    } catch (err: any) { toast.error(err.message||'Failed') }
    setSaving(false)
  }

  // ── APPLY CREDIT TO ORDER ──────────────────────────────────
  async function openCreditApply(customer: any) {
    setCreditCustomer(customer)
    setCreditForm({ orderId:'', amount:'' })
    // Load their orders with pending balance
    const ords = await fetch(`/api/orders?customerId=${customer.id}`).then(r=>r.json())
    const withBalance = (Array.isArray(ords)?ords:[]).filter((o:any)=>(o.balanceDue||0)>0)
    setCreditOrders(withBalance)
    setShowCreditModal(true)
    // Close ledger if open
    setViewLedger(null); setLedgerData(null)
  }

  async function handleApplyCredit(e: React.FormEvent) {
    e.preventDefault()
    if (!creditForm.orderId)  { toast.error('Select an order'); return }
    if (!creditForm.amount || parseFloat(creditForm.amount) <= 0) { toast.error('Enter a valid amount'); return }
    const amt = parseFloat(creditForm.amount)
    if (amt > (creditCustomer?.balance||0) + 0.01) {
      toast.error(`Insufficient credit. Available: ₹${(creditCustomer?.balance||0).toLocaleString('en-IN')}`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/payments', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          customerId: creditCustomer.id,
          amount:     0,  // sentinel — API ignores this when applyCredit is set
          mode:       'CREDIT',
          applyCredit: { orderId: creditForm.orderId, amount: amt },
        }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const result = await res.json()
      fetchPayments()
      refreshCustomers()
      setShowCreditModal(false)
      toast.success(`✅ ₹${amt.toLocaleString('en-IN')} credit applied to order! Receipt: ${result.receiptNo}`, { duration: 6000 })
    } catch (err: any) { toast.error(err.message||'Failed to apply credit') }
    setSaving(false)
  }

  // ── EDIT PAYMENT ───────────────────────────────────────────
  function openEdit(p: any) {
    setEditPayment(p)
    setEditForm({ amount:String(p.amount), mode:p.mode||'Cash', reference:p.reference||'', notes:p.notes||'', date:p.date?new Date(p.date).toISOString().slice(0,10):new Date().toISOString().slice(0,10) })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPayment) return
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/payments/${editPayment.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...editForm, amount: parseFloat(editForm.amount) }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const updated = await res.json()
      setPayments(p => p.map(x => x.id===updated.id ? updated : x))
      setEditPayment(null)
      toast.success(`✅ Payment updated — ${updated.receiptNo}`)
    } catch (err: any) { toast.error(err.message||'Failed') }
    setSaving(false)
  }

  // ── DELETE PAYMENT ─────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/payments/${deleteTarget.id}`, { method:'DELETE' })
      if (!res.ok) throw new Error()
      setPayments(p => p.filter(x => x.id!==deleteTarget.id))
      refreshCustomers()
      setDeleteTarget(null)
      toast.success('🗑️ Payment deleted and balance restored')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  // ── LEDGER ─────────────────────────────────────────────────
  async function openLedger(customer: any) {
    if (!customer?.id) return
    setViewLedger(customer)
    setLedgerLoading(true)
    const [pmts, ords, freshCustomer] = await Promise.all([
      fetch(`/api/payments?customerId=${customer.id}`).then(r=>r.json()),
      fetch(`/api/orders?customerId=${customer.id}`).then(r=>r.json()),
      fetch(`/api/customers`).then(r=>r.json()).then((list:any[]) => list.find((c:any)=>c.id===customer.id) || customer),
    ])
    const paymentList = Array.isArray(pmts) ? pmts : []
    const orderList   = Array.isArray(ords) ? ords : []
    setLedgerData({
      payments:      paymentList,
      orders:        orderList,
      customer:      freshCustomer,
      totalOrders:   orderList.reduce((s:number,o:any)=>s+(o.totalAmount||0),0),
      totalPaid:     paymentList.filter((p:any)=>p.type!=='CREDIT_APPLIED').reduce((s:number,p:any)=>s+(p.amount||0),0),
      totalBalance:  orderList.reduce((s:number,o:any)=>s+Math.max(0,o.balanceDue||0),0),
      creditBalance: freshCustomer?.balance || 0,
    })
    setLedgerLoading(false)
  }

  function resetForm() {
    setForm({ customerId:'', orderId:'', amount:'', mode:'Cash', reference:'', notes:'', date:new Date().toISOString().slice(0,10) })
    setCustomerOrders([]); setSelectedOrder(null)
  }

  // ── STATS ──────────────────────────────────────────────────
  const today    = new Date().toISOString().slice(0,10)
  const todayAmt = payments.filter(p=>new Date(p.date||p.createdAt).toISOString().slice(0,10)===today).reduce((s,p)=>s+(p.amount||0),0)
  const totalAmt = payments.filter(p=>p.type!=='CREDIT_APPLIED').reduce((s,p)=>s+(p.amount||0),0)
  const cashAmt  = payments.filter(p=>p.mode==='Cash').reduce((s,p)=>s+(p.amount||0),0)
  const upiAmt   = payments.filter(p=>p.mode==='UPI').reduce((s,p)=>s+(p.amount||0),0)
  const customersWithCredit = customers.filter(c=>(c.balance||0)>0.01)
  const amountOver  = selectedOrder && parseFloat(form.amount||'0') > (selectedOrder.balanceDue||0)
  const overpayAmt  = amountOver ? parseFloat(form.amount||'0') - (selectedOrder?.balanceDue||0) : 0
  const selectedCreditOrder = creditOrders.find(o=>o.id===creditForm.orderId)

  const filtered = payments.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return p.receiptNo?.toLowerCase().includes(s) || p.customer?.name?.toLowerCase().includes(s) ||
           p.customer?.mobile?.includes(s) || p.reference?.toLowerCase().includes(s)
  })

  return (
    <PageShell title="💳 Payment Management" action={{ label:'+ Record Payment', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 }}>
          <StatCard label="Total Receipts"     value={payments.length}          icon="🧾" color="blue" />
          <StatCard label="Today's Collection" value={formatCurrency(todayAmt)} icon="📅" color="green" />
          <StatCard label="Total Collected"    value={formatCurrency(totalAmt)} icon="💰" color="green" />
          <StatCard label="Cash"               value={formatCurrency(cashAmt)}  icon="💵" color="yellow" />
          <StatCard label="UPI"                value={formatCurrency(upiAmt)}   icon="📱" color="blue" />
        </div>

        {/* Credit Balance Alert */}
        {customersWithCredit.length > 0 && (
          <div style={{ background:'rgba(20,184,166,.08)', border:'1px solid rgba(20,184,166,.25)', borderRadius:10, padding:'10px 16px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#14b8a6', marginBottom:8 }}>
              🏷️ Customers with Credit Balance ({customersWithCredit.length}) — Click to apply to their next order
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {customersWithCredit.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(20,184,166,.1)', border:'1px solid rgba(20,184,166,.3)', borderRadius:8, padding:'6px 12px' }}>
                  <span style={{ fontWeight:700, fontSize:12 }}>{c.name}</span>
                  <span style={{ fontSize:11, color:'#14b8a6', fontWeight:700 }}>₹{(c.balance||0).toLocaleString('en-IN')}</span>
                  <button onClick={() => openCreditApply(c)}
                    style={{ padding:'3px 10px', background:'rgba(20,184,166,.25)', border:'1px solid rgba(20,184,166,.5)', borderRadius:6, color:'#14b8a6', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                    Apply →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <Input placeholder="🔍 Receipt no, customer, mobile, ref..." value={search}
            onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchPayments()}
            style={{ flex:1, minWidth:220 }} />
          <Select style={{ width:130 }} value={filterMode} onChange={e=>setFilterMode(e.target.value)}>
            <option value="">All Modes</option>
            {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
          </Select>
          <Select style={{ width:180 }} value={filterCustomer} onChange={e=>setFilterCustomer(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}{(c.balance||0)>0.01?` 🏷️₹${c.balance.toFixed(0)}`:''}</option>)}
          </Select>
          <Button onClick={fetchPayments}>Search</Button>
          <Button variant="primary" onClick={()=>setShowModal(true)}>+ Record Payment</Button>
        </div>

        {/* Quick ledger */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#8892a4', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>📊 Customer Ledger — Quick Access</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {customers.slice(0,15).map(c => (
              <button key={c.id} onClick={()=>openLedger(c)}
                style={{ padding:'4px 12px', background:'#1e2535', border:`1px solid ${(c.balance||0)>0.01?'rgba(20,184,166,.4)':'#2a3348'}`, borderRadius:20, color:(c.balance||0)>0.01?'#14b8a6':'#8892a4', fontSize:11, cursor:'pointer' }}>
                👤 {c.name}{(c.balance||0)>0.01?' 🏷️':''}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History ({filtered.length})</CardTitle>
            <div style={{ fontSize:11, color:'#8892a4' }}>Today: <strong style={{ color:'#10b981' }}>{formatCurrency(todayAmt)}</strong></div>
          </CardHeader>
          {loading ? <Loading /> : filtered.length===0 ? <Empty message="No payments yet." /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>
                  <th>Receipt No</th><th>Date</th><th>Customer</th><th>Mobile</th>
                  <th>Mode</th><th>Amount</th><th>Order Ref</th><th>Reference</th><th>Notes</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ background: p.type==='CREDIT_APPLIED'?'rgba(20,184,166,.04)':undefined }}>
                      <td style={{ color:p.type==='CREDIT_APPLIED'?'#14b8a6':'#3b82f6', fontFamily:'monospace', fontSize:11, fontWeight:700 }}>{p.receiptNo}</td>
                      <td style={{ color:'#8892a4', fontSize:11, whiteSpace:'nowrap' }}>
                        {new Date(p.date||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                      </td>
                      <td style={{ fontWeight:600 }}>{p.customer?.name}</td>
                      <td style={{ fontSize:11, color:'#8892a4' }}>{p.customer?.mobile}</td>
                      <td>
                        <span style={{ padding:'2px 10px', borderRadius:12, fontSize:10, fontWeight:700, background:`${MODE_COLOR[p.mode]||'#6b7280'}18`, color:MODE_COLOR[p.mode]||'#6b7280', border:`1px solid ${MODE_COLOR[p.mode]||'#6b7280'}40` }}>
                          {MODE_ICON[p.mode]||'💰'} {p.mode}
                        </span>
                      </td>
                      <td style={{ color:p.type==='CREDIT_APPLIED'?'#14b8a6':'#10b981', fontWeight:700, fontSize:14 }}>{formatCurrency(p.amount)}</td>
                      <td style={{ fontSize:11, color:'#3b82f6', fontFamily:'monospace' }}>{p.order?.orderNo||p.invoice?.invNo||'—'}</td>
                      <td style={{ fontSize:11, color:'#8892a4' }}>{p.reference||'—'}</td>
                      <td style={{ fontSize:11, color:'#8892a4', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.notes||'—'}</td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={()=>printReceipt(p,shopName)}
                            style={{ padding:'3px 8px', background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:6, color:'#3b82f6', fontSize:10, cursor:'pointer', fontWeight:600 }}>🖨️</button>
                          {p.type!=='CREDIT_APPLIED' && (
                            <button onClick={()=>openEdit(p)}
                              style={{ padding:'3px 8px', background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', borderRadius:6, color:'#10b981', fontSize:10, cursor:'pointer', fontWeight:600 }}>✏️</button>
                          )}
                          <button onClick={()=>openLedger(p.customer)}
                            style={{ padding:'3px 8px', background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.3)', borderRadius:6, color:'#8b5cf6', fontSize:10, cursor:'pointer', fontWeight:600 }}>📊</button>
                          <button onClick={()=>setDeleteTarget(p)}
                            style={{ padding:'3px 8px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#ef4444', fontSize:10, cursor:'pointer', fontWeight:600 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Mode summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginTop:16 }}>
          {PAYMENT_MODES.map(mode => {
            const mp=payments.filter(p=>p.mode===mode), total=mp.reduce((s,p)=>s+(p.amount||0),0)
            return (
              <div key={mode} style={{ background:'#1e2535', border:`1px solid ${MODE_COLOR[mode]}30`, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{MODE_ICON[mode]}</div>
                <div style={{ fontSize:11, color:'#8892a4', marginBottom:2 }}>{mode}</div>
                <div style={{ fontSize:15, fontWeight:700, color:MODE_COLOR[mode] }}>{formatCurrency(total)}</div>
                <div style={{ fontSize:10, color:'#8892a4', marginTop:2 }}>{mp.length} txn{mp.length!==1?'s':''}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RECORD PAYMENT MODAL ── */}
      <Modal open={showModal} onClose={()=>{setShowModal(false);resetForm()}} title="💳 Record Payment" width={580}
        footer={<><Button onClick={()=>{setShowModal(false);resetForm()}}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving?'Saving...':'💾 Record Payment'}</Button></>}>
        <form onSubmit={handleCreate}>
          <FormGroup label="Customer *">
            <Select value={form.customerId} onChange={e=>f('customerId',e.target.value)} required>
              <option value="">Select Customer</option>
              {customers.map(c=>(
                <option key={c.id} value={c.id}>
                  {c.name} — {c.mobile}{(c.balance||0)>0.01?` 🏷️ Credit: ₹${c.balance.toFixed(2)}`:''}
                </option>
              ))}
            </Select>
          </FormGroup>

          {/* Credit alert */}
          {availableCredit > 0.01 && (
            <div style={{ background:'rgba(20,184,166,.08)', border:'1px solid rgba(20,184,166,.3)', borderRadius:8, padding:'8px 12px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:12, color:'#14b8a6' }}>
                🏷️ <strong>{selectedCustomer?.name}</strong> has <strong>₹{availableCredit.toLocaleString('en-IN')}</strong> credit balance
              </div>
              <button type="button" onClick={()=>{setShowModal(false);openCreditApply(selectedCustomer)}}
                style={{ padding:'4px 12px', background:'rgba(20,184,166,.2)', border:'1px solid rgba(20,184,166,.4)', borderRadius:6, color:'#14b8a6', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                Apply Credit to Order →
              </button>
            </div>
          )}

          {form.customerId && (
            <FormGroup label="Against Order (optional — leave blank for general advance)">
              <Select value={form.orderId} onChange={e=>f('orderId',e.target.value)}>
                <option value="">— General Advance / No specific order —</option>
                {customerOrders.map(o=>(
                  <option key={o.id} value={o.id}>
                    {o.orderNo} | {o.orderType} | Total: ₹{o.totalAmount?.toLocaleString('en-IN')} | Bal: ₹{o.balanceDue?.toLocaleString('en-IN')}{o.balanceDue<=0?' ✅':''}
                  </option>
                ))}
              </Select>
            </FormGroup>
          )}

          {selectedOrder && (
            <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#3b82f6', marginBottom:8, fontFamily:'monospace' }}>📋 {selectedOrder.orderNo}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['Order Total',   formatCurrency(selectedOrder.totalAmount),  '#e2e8f0'],
                  ['Already Paid',  formatCurrency(selectedOrder.advancePaid),  '#3b82f6'],
                  ['Balance Due',   formatCurrency(selectedOrder.balanceDue),   selectedOrder.balanceDue>0?'#ef4444':'#10b981']
                ].map(([label,value,color])=>(
                  <div key={label} style={{ background:'#252d40', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Grid cols={2} gap={12}>
            <FormGroup label="Amount ₹ *">
              <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>f('amount',e.target.value)} placeholder="0.00" required style={{ fontSize:16, fontWeight:700 }} />
            </FormGroup>
            <FormGroup label="Payment Mode *">
              <Select value={form.mode} onChange={e=>f('mode',e.target.value)}>
                {PAYMENT_MODES.map(m=><option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Payment Date *">
              <Input type="date" value={form.date} onChange={e=>f('date',e.target.value)} required />
            </FormGroup>
            <FormGroup label={form.mode==='UPI'?'UPI Ref No':form.mode==='Cheque'?'Cheque No':form.mode==='NEFT/RTGS'?'UTR No':'Reference (optional)'}>
              <Input value={form.reference} onChange={e=>f('reference',e.target.value)} placeholder="Optional" />
            </FormGroup>
          </Grid>
          <FormGroup label="Notes">
            <Input value={form.notes} onChange={e=>f('notes',e.target.value)} placeholder="Optional..." />
          </FormGroup>

          {amountOver && (
            <div style={{ background:'rgba(20,184,166,.08)', border:'1px solid rgba(20,184,166,.3)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#14b8a6', marginBottom:8 }}>
              💡 ₹{overpayAmt.toLocaleString('en-IN')} more than balance due → excess will be <strong>added to credit balance automatically</strong>!
            </div>
          )}

          {!form.orderId && form.customerId && (
            <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.15)', borderRadius:8, fontSize:11, color:'#8892a4' }}>
              💡 No order selected — full amount stored as <strong style={{ color:'#3b82f6' }}>credit balance</strong> for this customer.
            </div>
          )}

          {form.amount && parseFloat(form.amount)>0 && (
            <div style={{ background:'#1e2535', borderRadius:8, padding:'10px 14px', border:'1px solid #2a3348', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
              <span style={{ fontSize:11, color:'#8892a4' }}>Recording</span>
              <span style={{ fontSize:18, fontWeight:800, color:'#10b981' }}>{formatCurrency(parseFloat(form.amount)||0)}</span>
            </div>
          )}
        </form>
      </Modal>

      {/* ── APPLY CREDIT MODAL ── */}
      <Modal open={showCreditModal} onClose={()=>setShowCreditModal(false)}
        title={`🏷️ Apply Credit — ${creditCustomer?.name}`} width={520}
        footer={<><Button onClick={()=>setShowCreditModal(false)}>Cancel</Button><Button variant="primary" onClick={handleApplyCredit} disabled={saving||creditOrders.length===0}>{saving?'Applying...':'✅ Apply Credit to Order'}</Button></>}>
        <form onSubmit={handleApplyCredit}>
          {/* Big credit balance display */}
          <div style={{ background:'rgba(20,184,166,.08)', border:'2px solid rgba(20,184,166,.3)', borderRadius:12, padding:'16px 20px', marginBottom:20, textAlign:'center' }}>
            <div style={{ fontSize:11, color:'#8892a4', marginBottom:4 }}>Available Credit Balance</div>
            <div style={{ fontSize:36, fontWeight:900, color:'#14b8a6' }}>
              ₹{((creditCustomer?.balance)||0).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize:11, color:'#8892a4', marginTop:4 }}>
              {creditCustomer?.name} — from excess/advance payments
            </div>
          </div>

          {creditOrders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#8892a4', fontSize:13 }}>
              ✅ No pending orders with balance due for this customer.<br/>
              <span style={{ fontSize:11 }}>Create a new order to apply this credit.</span>
            </div>
          ) : (
            <>
              <FormGroup label="Select Order to Apply Credit *">
                <Select value={creditForm.orderId} onChange={e=>{
                  const val = e.target.value
                  const o   = creditOrders.find(x=>x.id===val)
                  setCreditForm({ orderId:val, amount: o ? String(Math.min(o.balanceDue, creditCustomer?.balance||0).toFixed(2)) : '' })
                }} required>
                  <option value="">Choose an order...</option>
                  {creditOrders.map(o=>(
                    <option key={o.id} value={o.id}>
                      {o.orderNo} | {o.orderType} | Balance Due: ₹{o.balanceDue?.toLocaleString('en-IN')}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              {selectedCreditOrder && (
                <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:12, marginBottom:14 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                    {[['Order Total', formatCurrency(selectedCreditOrder.totalAmount), '#e2e8f0'],
                      ['Paid So Far', formatCurrency(selectedCreditOrder.advancePaid), '#3b82f6'],
                      ['Balance Due', formatCurrency(selectedCreditOrder.balanceDue), '#ef4444']
                    ].map(([label,value,color])=>(
                      <div key={label} style={{ background:'#252d40', borderRadius:7, padding:'8px 10px' }}>
                        <div style={{ fontSize:9, color:'#8892a4', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                        <div style={{ fontSize:13, fontWeight:700, color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <FormGroup label="Credit Amount to Apply ₹ *">
                <Input type="number" step="0.01" min="0.01"
                  max={Math.min(creditCustomer?.balance||0, selectedCreditOrder?.balanceDue||999999)}
                  value={creditForm.amount} onChange={e=>setCreditForm(p=>({...p,amount:e.target.value}))}
                  placeholder="0.00" required style={{ fontSize:16, fontWeight:700 }} />
              </FormGroup>

              {creditForm.amount && parseFloat(creditForm.amount)>0 && (
                <div style={{ background:'rgba(20,184,166,.06)', border:'1px solid rgba(20,184,166,.25)', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                    {[['Credit Used', formatCurrency(parseFloat(creditForm.amount||'0')), '#14b8a6'],
                      ['Credit Left', formatCurrency(Math.max(0,(creditCustomer?.balance||0)-parseFloat(creditForm.amount||'0'))), '#3b82f6'],
                      ['Order Balance After', formatCurrency(Math.max(0,(selectedCreditOrder?.balanceDue||0)-parseFloat(creditForm.amount||'0'))), Math.max(0,(selectedCreditOrder?.balanceDue||0)-parseFloat(creditForm.amount||'0'))>0?'#ef4444':'#10b981']
                    ].map(([label,value,color])=>(
                      <div key={label} style={{ textAlign:'center' }}>
                        <div style={{ fontSize:9, color:'#8892a4', marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:14, fontWeight:800, color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </form>
      </Modal>

      {/* ── EDIT PAYMENT ── */}
      <Modal open={!!editPayment} onClose={()=>setEditPayment(null)} title={`✏️ Edit — ${editPayment?.receiptNo}`} width={480}
        footer={<><Button onClick={()=>setEditPayment(null)}>Cancel</Button><Button variant="primary" onClick={handleEdit} disabled={saving}>{saving?'Saving...':'💾 Update'}</Button></>}>
        {editPayment && (
          <form onSubmit={handleEdit}>
            <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12 }}>
              <div style={{ fontWeight:600 }}>{editPayment.customer?.name} — {editPayment.customer?.mobile}</div>
              {editPayment.order && <div style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:11, marginTop:3 }}>Against: {editPayment.order?.orderNo}</div>}
              <div style={{ color:'#f59e0b', fontSize:11, marginTop:3 }}>⚠️ Editing amount auto-adjusts the order balance</div>
            </div>
            <Grid cols={2} gap={12}>
              <FormGroup label="Amount ₹ *"><Input type="number" step="0.01" min="0.01" value={editForm.amount} onChange={e=>ef('amount',e.target.value)} required style={{ fontSize:16, fontWeight:700 }} /></FormGroup>
              <FormGroup label="Mode"><Select value={editForm.mode} onChange={e=>ef('mode',e.target.value)}>{PAYMENT_MODES.map(m=><option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}</Select></FormGroup>
              <FormGroup label="Date"><Input type="date" value={editForm.date} onChange={e=>ef('date',e.target.value)} /></FormGroup>
              <FormGroup label="Reference"><Input value={editForm.reference} onChange={e=>ef('reference',e.target.value)} /></FormGroup>
            </Grid>
            <FormGroup label="Notes"><Input value={editForm.notes} onChange={e=>ef('notes',e.target.value)} /></FormGroup>
          </form>
        )}
      </Modal>

      {/* ── DELETE CONFIRM ── */}
      <Modal open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="🗑️ Delete Payment"
        footer={<><Button onClick={()=>setDeleteTarget(null)}>Cancel</Button><Button onClick={handleDelete} disabled={deleting} style={{ background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', color:'#ef4444' }}>{deleting?'Deleting...':'🗑️ Yes, Delete'}</Button></>}>
        {deleteTarget && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:6 }}>Delete {deleteTarget.receiptNo}?</div>
            <div style={{ fontSize:13, color:'#8892a4', marginBottom:10 }}>{deleteTarget.customer?.name} — {formatCurrency(deleteTarget.amount)} via {deleteTarget.mode}</div>
            {deleteTarget.order && <div style={{ fontSize:11, color:'#f59e0b', background:'rgba(245,158,11,.08)', borderRadius:8, padding:'8px 14px', marginBottom:8 }}>⚠️ Will restore ₹{deleteTarget.amount.toLocaleString('en-IN')} to order {deleteTarget.order?.orderNo}</div>}
            <div style={{ fontSize:11, color:'#ef4444', background:'rgba(239,68,68,.08)', borderRadius:8, padding:'8px 14px' }}>Cannot be undone.</div>
          </div>
        )}
      </Modal>

      {/* ── LEDGER MODAL ── */}
      <Modal open={!!viewLedger} onClose={()=>{setViewLedger(null);setLedgerData(null)}}
        title={`📊 Account Ledger — ${viewLedger?.name}`} width={760}
        footer={
          <div style={{ display:'flex', justifyContent:'space-between', width:'100%', gap:8 }}>
            <div style={{ display:'flex', gap:8 }}>
              {(ledgerData?.creditBalance||0) > 0.01 && (
                <button onClick={()=>openCreditApply(ledgerData.customer)}
                  style={{ padding:'7px 14px', background:'rgba(20,184,166,.15)', border:'1px solid rgba(20,184,166,.4)', borderRadius:8, color:'#14b8a6', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  🏷️ Apply Credit (₹{(ledgerData?.creditBalance||0).toLocaleString('en-IN')})
                </button>
              )}
              <button onClick={()=>{setViewLedger(null);setLedgerData(null);f('customerId',viewLedger.id);setShowModal(true)}}
                style={{ padding:'7px 14px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                + Record Payment
              </button>
            </div>
            <Button onClick={()=>{setViewLedger(null);setLedgerData(null)}}>Close</Button>
          </div>
        }>
        {ledgerLoading ? <Loading /> : ledgerData && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              {[['Total Orders Value', formatCurrency(ledgerData.totalOrders), '#e2e8f0'],
                ['Total Paid',        formatCurrency(ledgerData.totalPaid),   '#10b981'],
                ['Outstanding',       formatCurrency(ledgerData.totalBalance), ledgerData.totalBalance>0?'#ef4444':'#10b981'],
                ['Credit Balance',    formatCurrency(ledgerData.creditBalance), '#14b8a6'],
              ].map(([label,value,color])=>(
                <div key={label} style={{ background:'#1e2535', border:`1px solid ${label==='Credit Balance'?'rgba(20,184,166,.3)':'#2a3348'}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:9, color:'#8892a4', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:17, fontWeight:800, color }}>{value}</div>
                </div>
              ))}
            </div>

            {ledgerData.creditBalance > 0.01 && (
              <div style={{ background:'rgba(20,184,166,.08)', border:'1px solid rgba(20,184,166,.3)', borderRadius:8, padding:'10px 14px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:12, color:'#14b8a6' }}>
                  🏷️ <strong>₹{ledgerData.creditBalance.toLocaleString('en-IN')} credit</strong> available from excess payments
                </div>
                <button onClick={()=>openCreditApply(ledgerData.customer)}
                  style={{ padding:'5px 12px', background:'rgba(20,184,166,.2)', border:'1px solid rgba(20,184,166,.4)', borderRadius:6, color:'#14b8a6', fontSize:11, cursor:'pointer', fontWeight:700 }}>
                  Apply to Order →
                </button>
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>📋 Orders ({ledgerData.orders.length})</div>
              <div style={{ maxHeight:180, overflowY:'auto', border:'1px solid #2a3348', borderRadius:8, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead><tr style={{ background:'#252d40' }}>
                    {['Order No','Date','Type','Total','Paid','Balance','Status'].map(h=>(
                      <th key={h} style={{ padding:'6px 8px', textAlign:['Total','Paid','Balance'].includes(h)?'right':'left', color:'#8892a4', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {ledgerData.orders.map((o:any)=>(
                      <tr key={o.id} style={{ borderBottom:'1px solid #2a3348' }}>
                        <td style={{ padding:'6px 8px', color:'#3b82f6', fontFamily:'monospace', fontWeight:700 }}>{o.orderNo}</td>
                        <td style={{ padding:'6px 8px', color:'#8892a4' }}>{new Date(o.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                        <td style={{ padding:'6px 8px', color:'#8892a4' }}>{o.orderType}</td>
                        <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:600 }}>{formatCurrency(o.totalAmount)}</td>
                        <td style={{ padding:'6px 8px', textAlign:'right', color:'#3b82f6' }}>{formatCurrency(o.advancePaid)}</td>
                        <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:Math.max(0,o.balanceDue)>0?'#ef4444':'#10b981' }}>{formatCurrency(Math.max(0,o.balanceDue))}</td>
                        <td style={{ padding:'6px 8px' }}>
                          <span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:Math.max(0,o.balanceDue)<=0?'rgba(16,185,129,.15)':'rgba(239,68,68,.1)', color:Math.max(0,o.balanceDue)<=0?'#10b981':'#ef4444', fontWeight:700 }}>
                            {Math.max(0,o.balanceDue)<=0?'✅ PAID':'⏳ DUE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>💳 Payment History ({ledgerData.payments.length})</div>
              {ledgerData.payments.length===0
                ? <div style={{ textAlign:'center', padding:'16px 0', color:'#8892a4', fontSize:12 }}>No payments recorded</div>
                : <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #2a3348', borderRadius:8, overflow:'hidden' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                      <thead><tr style={{ background:'#252d40' }}>
                        {['Receipt','Date','Mode','Order','Ref','Amount',''].map(h=>(
                          <th key={h} style={{ padding:'6px 8px', textAlign:h==='Amount'?'right':'left', color:'#8892a4', fontWeight:600 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {ledgerData.payments.map((p:any,idx:number)=>(
                          <tr key={p.id} style={{ borderBottom:'1px solid #2a3348', background:idx%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                            <td style={{ padding:'6px 8px', color:p.type==='CREDIT_APPLIED'?'#14b8a6':'#3b82f6', fontFamily:'monospace', fontWeight:700, fontSize:10 }}>{p.receiptNo}</td>
                            <td style={{ padding:'6px 8px', color:'#8892a4' }}>{new Date(p.date||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                            <td style={{ padding:'6px 8px' }}>
                              <span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:`${MODE_COLOR[p.mode]||'#6b7280'}18`, color:MODE_COLOR[p.mode]||'#6b7280', fontWeight:700 }}>
                                {MODE_ICON[p.mode]||'💰'} {p.mode}
                              </span>
                            </td>
                            <td style={{ padding:'6px 8px', color:'#8892a4', fontSize:10, fontFamily:'monospace' }}>{p.order?.orderNo||'—'}</td>
                            <td style={{ padding:'6px 8px', color:'#8892a4', fontSize:10 }}>{p.reference||'—'}</td>
                            <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:p.type==='CREDIT_APPLIED'?'#14b8a6':'#10b981', fontSize:13 }}>{formatCurrency(p.amount)}</td>
                            <td style={{ padding:'6px 8px' }}>
                              <button onClick={()=>printReceipt(p,shopName)}
                                style={{ padding:'2px 6px', background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:5, color:'#3b82f6', fontSize:10, cursor:'pointer', fontWeight:600 }}>🖨️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:'#252d40', fontWeight:700 }}>
                          <td colSpan={5} style={{ padding:'8px', textAlign:'right', color:'#8892a4', fontSize:11 }}>Total Received:</td>
                          <td style={{ padding:'8px', textAlign:'right', color:'#10b981', fontSize:14, fontWeight:800 }}>{formatCurrency(ledgerData.totalPaid)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
              }
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}