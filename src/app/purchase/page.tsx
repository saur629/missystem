'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, Textarea, StatCard, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PO_COLOR: Record<string, string> = {
  ORDERED: 'yellow', IN_TRANSIT: 'blue', RECEIVED: 'green', CANCELLED: 'red'
}

const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'PrintFlow MIS'

// ── A4 Print ───────────────────────────────────────────────────
function printPO(po: any) {
  const items: any[] = (() => { try { return JSON.parse(po.itemsJson || '[]') } catch { return [] } })()
  const now = new Date()
  const statusColors: Record<string, string> = {
    ORDERED: '#d97706', IN_TRANSIT: '#2563eb', RECEIVED: '#16a34a', CANCELLED: '#dc2626'
  }
  const sc = statusColors[po.status] || '#6b7280'

  const rows = items.map((item: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td style="text-align:center;color:#1a56db;font-weight:700;padding:6px 8px">${i + 1}</td>
      <td style="padding:6px 8px;font-weight:600">${item.itemName || '—'}</td>
      <td style="text-align:center;padding:6px 8px">${item.unit || '—'}</td>
      <td style="text-align:center;padding:6px 8px;font-weight:700">${item.qty || '—'}</td>
      <td style="text-align:right;padding:6px 8px">₹${parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
      <td style="text-align:right;padding:6px 8px;color:#059669;font-weight:700">₹${((parseFloat(item.qty || 0) * parseFloat(item.rate || 0))).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PO ${po.poNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff}
    @page{size:A4;margin:12mm}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #1a56db;margin-bottom:14px}
    .shop{font-size:20px;font-weight:800;color:#1a56db}.sub{font-size:11px;color:#6b7280;margin-top:2px}
    .pono{font-size:18px;font-weight:800;color:#1a56db;font-family:monospace;text-align:right}
    .meta{font-size:10px;color:#6b7280;text-align:right;margin-top:2px}
    .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:800;color:#fff;background:${sc};margin-bottom:14px}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
    .ibox{border:1px solid #e5e7eb;border-radius:6px;padding:8px 12px}
    .ilabel{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
    .ival{font-size:13px;font-weight:700;color:#111}
    .sec{font-size:9px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:4px 8px;margin:12px 0 6px;border-radius:0 4px 4px 0;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#1a56db;color:#fff;padding:6px 8px;text-align:left;font-size:10px;font-weight:700}
    td{border-bottom:1px solid #f3f4f6;vertical-align:middle}
    .totbox{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;max-width:280px;margin-left:auto;margin-top:10px}
    .trow{display:flex;justify-content:space-between;padding:7px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}
    .trow:last-child{border:none}.grand{background:#1a56db;color:#fff;font-size:14px;font-weight:800}
    .notes{border:1px solid #e5e7eb;border-radius:6px;padding:10px 12px;font-size:11px;color:#374151;margin-top:12px;min-height:30px}
    .footer{margin-top:24px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:8px}
    .sigrow{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:30px}
    .sigbox{text-align:center}.sigline{height:30px;border-bottom:1px solid #374151;margin-bottom:4px}
    .siglabel{font-size:9px;color:#6b7280}
  </style></head><body>
  <div class="hdr">
    <div><div class="shop">🛒 ${SHOP_NAME}</div><div class="sub">Purchase Order</div></div>
    <div><div class="pono">${po.poNo}</div>
    <div class="meta">Date: <strong>${formatDate(po.date)}</strong></div>
    <div class="meta">Printed: ${now.toLocaleString('en-IN')}</div></div>
  </div>
  <span class="badge">${po.status}</span>
  <div class="two">
    <div class="ibox"><div class="ilabel">Supplier</div><div class="ival">${po.supplier?.name || '—'}</div></div>
    <div class="ibox"><div class="ilabel">Supplier Mobile</div><div class="ival" style="color:#1a56db">${po.supplier?.mobile || '—'}</div></div>
    <div class="ibox"><div class="ilabel">Total Items</div><div class="ival">${items.length} item${items.length !== 1 ? 's' : ''}</div></div>
    <div class="ibox"><div class="ilabel">Order Total</div><div class="ival" style="color:#059669">₹${(po.totalAmount || 0).toLocaleString('en-IN')}</div></div>
  </div>
  <div class="sec">📦 Item Details</div>
  <table><thead><tr>
    <th style="width:32px">Sr.</th><th>Item Name</th><th style="width:60px;text-align:center">Unit</th>
    <th style="width:60px;text-align:center">Qty</th><th style="width:80px;text-align:right">Rate</th>
    <th style="width:90px;text-align:right">Amount</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <div class="totbox">
    <div class="trow grand"><span>TOTAL AMOUNT</span><span>₹${(po.totalAmount || 0).toLocaleString('en-IN')}</span></div>
  </div>
  ${po.notes ? `<div class="sec">📝 Notes</div><div class="notes">${po.notes}</div>` : ''}
  <div class="sigrow">
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Prepared By</div></div>
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Supplier Signature</div></div>
  </div>
  <div class="footer">${SHOP_NAME} • Purchase Order • ${po.poNo} • ${now.toLocaleString('en-IN')}</div>
  </body></html>`

  const win = window.open('', '_blank', 'width=860,height=700')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

export default function PurchasePage() {
  const [purchases, setPurchases]   = useState<any[]>([])
  const [suppliers, setSuppliers]   = useState<any[]>([])
  const [stock, setStock]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [viewPO, setViewPO]         = useState<any>(null)
  const [editPO, setEditPO]         = useState<any>(null)
  const [deletePO, setDeletePO]     = useState<any>(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)

  const [form, setForm] = useState({
    supplierId: '', notes: '',
    items: [{ itemName: '', unit: 'KG', qty: '', rate: '' }]
  })

  useEffect(() => {
    fetch('/api/purchase').then(r => r.json()).then(d => {
      setPurchases(d.purchases || [])
      setSuppliers(d.suppliers || [])
      setStock(d.stock || [])
      setLoading(false)
    })
  }, [])

  function addItem() {
    setForm(p => ({ ...p, items: [...p.items, { itemName: '', unit: 'KG', qty: '', rate: '' }] }))
  }
  function removeItem(i: number) {
    setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  }
  function updateItem(i: number, k: string, v: string) {
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [k]: v }; return { ...p, items } })
  }

  function resetForm() {
    setForm({ supplierId: '', notes: '', items: [{ itemName: '', unit: 'KG', qty: '', rate: '' }] })
  }

  function openEdit(po: any) {
    const items = (() => { try { return JSON.parse(po.itemsJson || '[]') } catch { return [] } })()
    setEditPO(po)
    setForm({
      supplierId: po.supplierId || '',
      notes: po.notes || '',
      items: items.length > 0 ? items.map((i: any) => ({
        itemName: i.itemName || '',
        unit: i.unit || 'KG',
        qty: String(i.qty || ''),
        rate: String(i.rate || ''),
      })) : [{ itemName: '', unit: 'KG', qty: '', rate: '' }]
    })
  }

  // ── CREATE ─────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const po = await res.json()
      setPurchases(p => [po, ...p])
      setShowModal(false); resetForm()
      toast.success(`PO ${po.poNo} created!`)
    } catch { toast.error('Failed to create PO') }
    setSaving(false)
  }

  // ── EDIT ───────────────────────────────────────────────────
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPO) return
    setSaving(true)
    try {
      const res = await fetch(`/api/purchase/${editPO.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setPurchases(p => p.map(po => po.id === updated.id ? updated : po))
      setEditPO(null); resetForm()
      toast.success('PO updated!')
    } catch { toast.error('Failed to update PO') }
    setSaving(false)
  }

  // ── DELETE ─────────────────────────────────────────────────
  async function handleDelete() {
    if (!deletePO) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/purchase/${deletePO.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPurchases(p => p.filter(po => po.id !== deletePO.id))
      setDeletePO(null)
      toast.success('PO deleted')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/purchase/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setPurchases(p => p.map(po => po.id === id ? { ...po, status } : po))
      if (viewPO?.id === id) setViewPO((v: any) => ({ ...v, status }))
      toast.success('Status updated')
    }
  }

  // ── Form body (shared for create + edit) ───────────────────
  function FormBody() {
    return (
      <>
        <FormGroup label="Supplier *">
          <Select value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))} required>
            <option value="">Select Supplier</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </FormGroup>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items *</label>
            <Button size="sm" type="button" onClick={addItem}>+ Add Item</Button>
          </div>
          {form.items.map((item, i) => (
            <div key={i} style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <Input style={{ marginBottom: 8 }} value={item.itemName} onChange={e => updateItem(i, 'itemName', e.target.value)} placeholder="Item name" required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
                <Select value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                  {['KG', 'PCS', 'ROLL', 'SQ FT', 'LITRE', 'METRE'].map(u => <option key={u}>{u}</option>)}
                </Select>
                <Input type="number" step="0.01" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} placeholder="Qty" required />
                <Input type="number" step="0.01" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} placeholder="Rate ₹" required />
                {form.items.length > 1 && <Button size="sm" type="button" variant="danger" onClick={() => removeItem(i)}>✕</Button>}
              </div>
              {item.qty && item.rate && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#10b981', textAlign: 'right', fontWeight: 600 }}>
                  = ₹{(parseFloat(item.qty) * parseFloat(item.rate)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              )}
            </div>
          ))}
          {/* Grand total preview */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <div style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, color: '#10b981' }}>
              Total: ₹{form.items.reduce((s, i) => s + (parseFloat(i.qty || '0') * parseFloat(i.rate || '0')), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <FormGroup label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
        </FormGroup>
      </>
    )
  }

  return (
    <PageShell title="Purchase & Inventory" action={{ label: '+ New PO', onClick: () => setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          <StatCard label="Total POs"         value={purchases.length} icon="🛒" color="blue" />
          <StatCard label="Total Spend"        value={formatCurrency(purchases.reduce((s, p) => s + (p.totalAmount || 0), 0))} icon="💸" color="yellow" />
          <StatCard label="Pending Delivery"   value={purchases.filter(p => p.status === 'ORDERED').length} icon="🚚" color="green" />
        </div>

        <Grid cols={2} gap={16}>
          {/* PO Table */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <Button variant="primary" onClick={() => setShowModal(true)}>+ New PO</Button>
            </CardHeader>
            {loading ? <Loading /> : purchases.length === 0 ? <Empty message="No purchase orders yet" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>PO No.</th>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(po => (
                      <tr key={po.id}>
                        <td style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 11 }}>{po.poNo}</td>
                        <td style={{ color: '#8892a4', fontSize: 11 }}>{formatDate(po.date)}</td>
                        <td style={{ fontWeight: 500 }}>{po.supplier?.name}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(po.totalAmount)}</td>
                        <td><Badge color={PO_COLOR[po.status]}>{po.status}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {/* View */}
                            <button
                              onClick={() => setViewPO({ ...po, parsedItems: (() => { try { return JSON.parse(po.itemsJson || '[]') } catch { return [] } })() })}
                              title="View"
                              style={{ padding: '4px 8px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.25)', borderRadius: 6, color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>
                              👁
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => openEdit(po)}
                              title="Edit"
                              style={{ padding: '4px 8px', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 6, color: '#10b981', fontSize: 12, cursor: 'pointer' }}>
                              ✏️
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => setDeletePO(po)}
                              title="Delete"
                              style={{ padding: '4px 8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 6, color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Stock */}
          <Card>
            <CardHeader><CardTitle>Stock / Inventory</CardTitle></CardHeader>
            <div style={{ padding: 14 }}>
              {stock.length === 0 ? <Empty message="No stock items" /> : stock.map(item => {
                const pct = Math.min(100, Math.round((item.stock / Math.max(item.minStock * 3, 1)) * 100))
                const color = pct < 30 ? '#ef4444' : pct < 60 ? '#f59e0b' : '#10b981'
                return (
                  <div key={item.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{item.name}</span>
                      <span style={{ color, fontWeight: 600 }}>{item.stock} {item.unit}</span>
                    </div>
                    <div style={{ height: 5, background: '#252d40', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                    </div>
                    {item.stock < item.minStock && <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ Low stock — reorder needed</div>}
                  </div>
                )
              })}
            </div>
          </Card>
        </Grid>
      </div>

      {/* ── CREATE MODAL ── */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="New Purchase Order"
        footer={<><Button onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Saving...' : '💾 Save PO'}</Button></>}>
        <form onSubmit={handleCreate}><FormBody /></form>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={!!editPO} onClose={() => { setEditPO(null); resetForm() }} title={`✏️ Edit — ${editPO?.poNo}`}
        footer={<><Button onClick={() => { setEditPO(null); resetForm() }}>Cancel</Button><Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : '💾 Update PO'}</Button></>}>
        <form onSubmit={handleEdit}><FormBody /></form>
      </Modal>

      {/* ── VIEW MODAL ── */}
      <Modal open={!!viewPO} onClose={() => setViewPO(null)}
        title={`${viewPO?.poNo} — ${viewPO?.supplier?.name}`} width={580}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* A4 Print button */}
              <button
                onClick={() => printPO(viewPO)}
                style={{ padding: '7px 16px', background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.4)', borderRadius: 8, color: '#3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                🖨️ Print A4
              </button>
            </div>
            <Button onClick={() => setViewPO(null)}>Close</Button>
          </div>
        }>
        {viewPO && (
          <div>
            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'PO Number',  val: viewPO.poNo,              color: '#3b82f6' },
                { label: 'Date',       val: formatDate(viewPO.date),  color: '#e2e8f0' },
                { label: 'Supplier',   val: viewPO.supplier?.name,    color: '#e2e8f0' },
                { label: 'Status',     val: viewPO.status,            color: PO_COLOR[viewPO.status] === 'green' ? '#10b981' : PO_COLOR[viewPO.status] === 'red' ? '#ef4444' : '#f59e0b' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: '#1e2535', borderRadius: 8, padding: 10, border: '1px solid #2a3348' }}>
                  <div style={{ fontSize: 9, color: '#8892a4', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Status updater */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#8892a4', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Update Status</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['ORDERED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'].map(s => (
                  <button key={s} onClick={() => updateStatus(viewPO.id, s)}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: `1px solid ${viewPO.status === s ? '#3b82f6' : '#2a3348'}`, background: viewPO.status === s ? 'rgba(59,130,246,.15)' : '#1e2535', color: viewPO.status === s ? '#3b82f6' : '#8892a4' }}>
                    {s === 'ORDERED' ? '🛒' : s === 'IN_TRANSIT' ? '🚚' : s === 'RECEIVED' ? '✅' : '❌'} {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Items table */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
              📦 Items ({viewPO.parsedItems?.length || 0})
            </div>
            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th style={{ textAlign: 'center' }}>Unit</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewPO.parsedItems?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ color: '#3b82f6', fontWeight: 700, textAlign: 'center', width: 28 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                      <td style={{ textAlign: 'center', color: '#8892a4', fontSize: 11 }}>{item.unit}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', color: '#8892a4' }}>₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 700 }}>
                        ₹{(parseFloat(item.qty || 0) * parseFloat(item.rate || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: '8px 16px', fontSize: 15, fontWeight: 800, color: '#10b981' }}>
                Total: {formatCurrency(viewPO.totalAmount)}
              </div>
            </div>

            {/* Notes */}
            {viewPO.notes && (
              <div style={{ marginTop: 12, background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: 10, fontSize: 12, color: '#8892a4' }}>
                📝 {viewPO.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal open={!!deletePO} onClose={() => setDeletePO(null)} title="🗑️ Delete Purchase Order"
        footer={<>
          <Button onClick={() => setDeletePO(null)}>Cancel</Button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '8px 18px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {deleting ? 'Deleting...' : '🗑️ Yes, Delete'}
          </button>
        </>}>
        {deletePO && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Delete {deletePO.poNo}?</div>
            <div style={{ fontSize: 13, color: '#8892a4' }}>
              Supplier: <strong style={{ color: '#e2e8f0' }}>{deletePO.supplier?.name}</strong><br />
              Amount: <strong style={{ color: '#ef4444' }}>{formatCurrency(deletePO.totalAmount)}</strong>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,.08)', borderRadius: 8, padding: '8px 14px' }}>
              This cannot be undone.
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}