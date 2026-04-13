'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const TABS = ['Suppliers', 'Stock Items', 'Job Types', 'Flex Media Rates']

const actionBtn = (color: string) => ({
  padding: '3px 10px', borderRadius: 6, border: `1px solid ${color}40`,
  background: `${color}12`, color, fontSize: 11, cursor: 'pointer', fontWeight: 600,
})
const deleteStyle = {
  padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,.3)',
  background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: 11, cursor: 'pointer', fontWeight: 600,
}

function DeleteConfirm({ open, name, onClose, onConfirm, deleting }: any) {
  return (
    <Modal open={open} onClose={onClose} title="🗑️ Confirm Delete"
      footer={<>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} disabled={deleting} style={deleteStyle}>
          {deleting ? 'Deleting...' : '🗑️ Yes, Delete'}
        </Button>
      </>}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Delete "{name}"?</div>
        <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,.08)', borderRadius: 8, padding: '8px 14px', marginTop: 10 }}>
          This action cannot be undone.
        </div>
      </div>
    </Modal>
  )
}

export default function MastersPage() {
  const [tab, setTab]         = useState('Suppliers')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [stock, setStock]     = useState<any[]>([])
  const [jobTypes, setJobTypes] = useState<any[]>([])
  const [flexRates, setFlexRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Supplier state ────────────────────────────────────────────────────────
  const [showSupModal, setShowSupModal]   = useState(false)
  const [viewSup, setViewSup]             = useState<any>(null)
  const [editSup, setEditSup]             = useState<any>(null)
  const [deleteSup, setDeleteSup]         = useState<any>(null)
  const [supForm, setSupForm]             = useState({ name: '', contact: '', email: '', gstNo: '', items: '' })

  // ── Stock state ───────────────────────────────────────────────────────────
  const [showStockModal, setShowStockModal] = useState(false)
  const [viewStock, setViewStock]           = useState<any>(null)
  const [editStock, setEditStock]           = useState<any>(null)
  const [deleteStock, setDeleteStock]       = useState<any>(null)
  const [stockForm, setStockForm] = useState({ name: '', category: 'Flex Media', unit: 'SQ FT', hsnCode: '', gstPct: '18', saleRate: '', stock: '0', minStock: '10' })

  // ── Job Type state ────────────────────────────────────────────────────────
  const [showJobModal, setShowJobModal] = useState(false)
  const [editJob, setEditJob]           = useState<any>(null)
  const [deleteJob, setDeleteJob]       = useState<any>(null)
  const [jobForm, setJobForm]           = useState({ code: '', name: '', rate: '', unit: 'sqft', gst: '18%', tat: '1 Day' })

  // ── Flex Rate state ───────────────────────────────────────────────────────
  const [showFlexModal, setShowFlexModal] = useState(false)
  const [editFlex, setEditFlex]           = useState<any>(null)
  const [deleteFlex, setDeleteFlex]       = useState<any>(null)
  const [flexForm, setFlexForm]           = useState({ name: '', rate: '', unit: 'sqft', gst: '18%' })

  const sf  = (k: string, v: string) => setSupForm(p => ({ ...p, [k]: v }))
  const stf = (k: string, v: string) => setStockForm(p => ({ ...p, [k]: v }))
  const jf  = (k: string, v: string) => setJobForm(p => ({ ...p, [k]: v }))
  const ff  = (k: string, v: string) => setFlexForm(p => ({ ...p, [k]: v }))

  // ── Fetch all data ────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/purchase').then(r => r.json()),
      fetch('/api/masters/jobtypes').then(r => r.json()),
      fetch('/api/masters/flexmedia').then(r => r.json()),
    ]).then(([pd, jt, fm]) => {
      setSuppliers(pd.suppliers || [])
      setStock(pd.stock || [])
      setJobTypes(Array.isArray(jt) ? jt : [])
      setFlexRates(Array.isArray(fm) ? fm : [])
      setLoading(false)
    })
  }, [])

  // ── SUPPLIER ACTIONS ──────────────────────────────────────────────────────
  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/masters/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) })
      if (!res.ok) throw new Error()
      const s = await res.json()
      setSuppliers(p => [...p, s])
      setShowSupModal(false)
      setSupForm({ name: '', contact: '', email: '', gstNo: '', items: '' })
      toast.success(`Supplier ${s.name} added!`)
    } catch { toast.error('Failed to add supplier') }
    setSaving(false)
  }

  async function handleEditSupplier(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/masters/suppliers/${editSup.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setSuppliers(p => p.map(s => s.id === updated.id ? updated : s))
      setEditSup(null)
      toast.success('Supplier updated!')
    } catch { toast.error('Failed to update supplier') }
    setSaving(false)
  }

  async function handleDeleteSupplier() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/masters/suppliers/${deleteSup.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setSuppliers(p => p.filter(s => s.id !== deleteSup.id))
      setDeleteSup(null)
      toast.success('Supplier deleted')
    } catch { toast.error('Cannot delete — may have existing purchases') }
    setDeleting(false)
  }

  function openEditSupplier(s: any) {
    setSupForm({ name: s.name, contact: s.contact, email: s.email || '', gstNo: s.gstNo || '', items: s.items || '' })
    setEditSup(s)
  }

  // ── STOCK ACTIONS ─────────────────────────────────────────────────────────
  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/masters/stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stockForm) })
      if (!res.ok) throw new Error()
      const item = await res.json()
      setStock(p => [...p, item])
      setShowStockModal(false)
      setStockForm({ name: '', category: 'Flex Media', unit: 'SQ FT', hsnCode: '', gstPct: '18', saleRate: '', stock: '0', minStock: '10' })
      toast.success(`${item.name} added!`)
    } catch { toast.error('Failed to add stock item') }
    setSaving(false)
  }

  async function handleEditStock(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch(`/api/masters/stock/${editStock.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stockForm) })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setStock(p => p.map(s => s.id === updated.id ? updated : s))
      setEditStock(null)
      toast.success('Stock item updated!')
    } catch { toast.error('Failed to update') }
    setSaving(false)
  }

  async function handleDeleteStock() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/masters/stock/${deleteStock.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setStock(p => p.filter(s => s.id !== deleteStock.id))
      setDeleteStock(null)
      toast.success('Stock item deleted')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  function openEditStock(item: any) {
    setStockForm({ name: item.name, category: item.category, unit: item.unit, hsnCode: item.hsnCode || '', gstPct: String(item.gstPct), saleRate: String(item.saleRate), stock: String(item.stock), minStock: String(item.minStock) })
    setEditStock(item)
  }

  // ── JOB TYPE ACTIONS — now DB-backed ─────────────────────────────────────
  async function handleSaveJobType(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...jobForm, rate: jobForm.rate.startsWith('₹') ? jobForm.rate : `₹${jobForm.rate}/${jobForm.unit}` }
      if (editJob) {
        const res = await fetch(`/api/masters/jobtypes/${editJob.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setJobTypes(p => p.map(j => j.id === updated.id ? updated : j))
        setEditJob(null)
        toast.success('Job type updated!')
      } else {
        const res = await fetch('/api/masters/jobtypes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setJobTypes(p => [...p, created])
        setShowJobModal(false)
        toast.success('Job type added!')
      }
      setJobForm({ code: '', name: '', rate: '', unit: 'sqft', gst: '18%', tat: '1 Day' })
    } catch { toast.error('Failed to save job type') }
    setSaving(false)
  }

  async function handleDeleteJobType() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/masters/jobtypes/${deleteJob.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setJobTypes(p => p.filter(j => j.id !== deleteJob.id))
      setDeleteJob(null)
      toast.success('Job type deleted')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  function openEditJob(item: any) {
    setJobForm({ code: item.code || '', name: item.name, rate: item.rate, unit: item.unit, gst: item.gst, tat: item.tat })
    setEditJob(item)
    setShowJobModal(true)
  }

  // ── FLEX RATE ACTIONS — now DB-backed ─────────────────────────────────────
  async function handleSaveFlex(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      if (editFlex) {
        const res = await fetch(`/api/masters/flexmedia/${editFlex.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flexForm) })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setFlexRates(p => p.map(f => f.id === updated.id ? updated : f))
        setEditFlex(null)
        toast.success('Flex rate updated!')
      } else {
        const res = await fetch('/api/masters/flexmedia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flexForm) })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setFlexRates(p => [...p, created])
        setShowFlexModal(false)
        toast.success('Flex media added!')
      }
      setFlexForm({ name: '', rate: '', unit: 'sqft', gst: '18%' })
    } catch { toast.error('Failed to save flex media') }
    setSaving(false)
  }

  async function handleDeleteFlex() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/masters/flexmedia/${deleteFlex.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFlexRates(p => p.filter(f => f.id !== deleteFlex.id))
      setDeleteFlex(null)
      toast.success('Flex media deleted')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  function openEditFlex(item: any) {
    setFlexForm({ name: item.name, rate: item.rate, unit: item.unit, gst: item.gst })
    setEditFlex(item)
    setShowFlexModal(true)
  }

  function stockColor(item: any) {
    if (item.stock < item.minStock) return '#ef4444'
    if (item.stock < item.minStock * 2) return '#f59e0b'
    return '#10b981'
  }

  // ── Shared form components ────────────────────────────────────────────────
  function SupplierForm() {
    return (
      <form onSubmit={editSup ? handleEditSupplier : handleAddSupplier}>
        <Grid cols={2} gap={12}>
          <FormGroup label="Supplier Name *"><Input value={supForm.name} onChange={e => sf('name', e.target.value)} required /></FormGroup>
          <FormGroup label="Contact No. *"><Input value={supForm.contact} onChange={e => sf('contact', e.target.value)} required /></FormGroup>
          <FormGroup label="Email"><Input type="email" value={supForm.email} onChange={e => sf('email', e.target.value)} /></FormGroup>
          <FormGroup label="GST No."><Input value={supForm.gstNo} onChange={e => sf('gstNo', e.target.value)} /></FormGroup>
        </Grid>
        <FormGroup label="Items Supplied">
          <Input value={supForm.items} onChange={e => sf('items', e.target.value)} placeholder="Flex, Star Flex, Ink..." />
        </FormGroup>
      </form>
    )
  }

  function StockForm() {
    return (
      <form onSubmit={editStock ? handleEditStock : handleAddStock}>
        <FormGroup label="Item Name *">
          <Input value={stockForm.name} onChange={e => stf('name', e.target.value)} required />
        </FormGroup>
        <Grid cols={2} gap={12}>
          <FormGroup label="Category *">
            <Select value={stockForm.category} onChange={e => stf('category', e.target.value)}>
              {['Flex Media','Paper','Ink','Lamination','Board','Chemical','Other'].map(c => <option key={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Unit *">
            <Select value={stockForm.unit} onChange={e => stf('unit', e.target.value)}>
              {['SQ FT','KG','ROLL','PCS','LITRE','METRE','SHEET'].map(u => <option key={u}>{u}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="HSN Code"><Input value={stockForm.hsnCode} onChange={e => stf('hsnCode', e.target.value)} /></FormGroup>
          <FormGroup label="GST %">
            <Select value={stockForm.gstPct} onChange={e => stf('gstPct', e.target.value)}>
              {['5','12','18','28'].map(g => <option key={g} value={g}>{g}%</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Sale Rate (₹) *"><Input type="number" step="0.01" value={stockForm.saleRate} onChange={e => stf('saleRate', e.target.value)} required /></FormGroup>
          <FormGroup label="Current Stock"><Input type="number" step="0.01" value={stockForm.stock} onChange={e => stf('stock', e.target.value)} /></FormGroup>
          <FormGroup label="Min. Stock Level"><Input type="number" step="0.01" value={stockForm.minStock} onChange={e => stf('minStock', e.target.value)} /></FormGroup>
        </Grid>
      </form>
    )
  }

  return (
    <PageShell title="Masters & Settings">
      <div className="animate-in">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: 3, background: '#1e2535', borderRadius: 8, marginBottom: 20, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: tab === t ? '#161b27' : 'transparent', color: tab === t ? '#e2e8f0' : '#8892a4' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── SUPPLIERS ── */}
        {tab === 'Suppliers' && (
          <Card>
            <CardHeader>
              <CardTitle>Suppliers ({suppliers.length})</CardTitle>
              <Button variant="primary" onClick={() => { setSupForm({ name:'', contact:'', email:'', gstNo:'', items:'' }); setShowSupModal(true) }}>+ Add Supplier</Button>
            </CardHeader>
            {loading ? <Loading /> : suppliers.length === 0 ? <Empty message="No suppliers yet" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Code</th><th>Name</th><th>Contact</th><th>Email</th><th>GST No.</th><th>Items Supplied</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {suppliers.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{s.code}</td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ color: '#8892a4' }}>{s.contact}</td>
                        <td style={{ color: '#8892a4', fontSize: 11 }}>{s.email || '—'}</td>
                        <td style={{ fontSize: 11, color: '#8892a4' }}>{s.gstNo || '—'}</td>
                        <td style={{ color: '#8892a4' }}>{s.items || '—'}</td>
                        <td><Badge color={s.active ? 'green' : 'red'}>{s.active ? 'Active' : 'Inactive'}</Badge></td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={actionBtn('#3b82f6')} onClick={() => setViewSup(s)}>👁 View</button>
                            <button style={actionBtn('#10b981')} onClick={() => openEditSupplier(s)}>✏️ Edit</button>
                            <button style={deleteStyle} onClick={() => setDeleteSup(s)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── STOCK ITEMS ── */}
        {tab === 'Stock Items' && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory / Stock Items ({stock.length})</CardTitle>
              <Button variant="primary" onClick={() => { setStockForm({ name:'', category:'Flex Media', unit:'SQ FT', hsnCode:'', gstPct:'18', saleRate:'', stock:'0', minStock:'10' }); setShowStockModal(true) }}>+ Add Item</Button>
            </CardHeader>
            {loading ? <Loading /> : stock.length === 0 ? <Empty message="No stock items yet" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Name</th><th>Category</th><th>Unit</th><th>HSN</th><th>GST%</th><th>Sale Rate</th><th>Stock</th><th>Min</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {stock.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ color: '#8892a4' }}>{item.category}</td>
                        <td style={{ color: '#8892a4' }}>{item.unit}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#8892a4' }}>{item.hsnCode || '—'}</td>
                        <td><Badge color="blue">{item.gstPct}%</Badge></td>
                        <td style={{ color: '#10b981' }}>{formatCurrency(item.saleRate)}/{item.unit}</td>
                        <td><span style={{ fontWeight: 700, color: stockColor(item) }}>{item.stock} {item.unit}</span></td>
                        <td style={{ color: '#8892a4' }}>{item.minStock}</td>
                        <td>{item.stock < item.minStock ? <Badge color="red">⚠ Low</Badge> : <Badge color="green">OK</Badge>}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={actionBtn('#3b82f6')} onClick={() => setViewStock(item)}>👁 View</button>
                            <button style={actionBtn('#10b981')} onClick={() => openEditStock(item)}>✏️ Edit</button>
                            <button style={deleteStyle} onClick={() => setDeleteStock(item)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #2a3348' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#8892a4', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock Levels</div>
              {stock.map(item => {
                const pct = Math.min(100, Math.round((item.stock / Math.max(item.minStock * 3, 1)) * 100))
                const color = stockColor(item)
                return (
                  <div key={item.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span>{item.name}</span>
                      <span style={{ color, fontWeight: 600 }}>{item.stock} {item.unit}</span>
                    </div>
                    <div style={{ height: 5, background: '#252d40', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .5s' }} />
                    </div>
                    {item.stock < item.minStock && (
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ Need {item.minStock - item.stock} {item.unit} more</div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── JOB TYPES — now DB-backed ── */}
        {tab === 'Job Types' && (
          <Card>
            <CardHeader>
              <CardTitle>Job Type Master ({jobTypes.length})</CardTitle>
              <Button variant="primary" onClick={() => { setJobForm({ code:'', name:'', rate:'', unit:'sqft', gst:'18%', tat:'1 Day' }); setEditJob(null); setShowJobModal(true) }}>+ Add Job Type</Button>
            </CardHeader>
            {loading ? <Loading /> : jobTypes.length === 0 ? <Empty message="No job types yet. Add your first one!" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Code</th><th>Job Type</th><th>Rate</th><th>Unit</th><th>GST</th><th>TAT</th><th>Actions</th></tr></thead>
                  <tbody>
                    {jobTypes.map((jt, i) => (
                      <tr key={jt.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{jt.code || `JT${String(i+1).padStart(2,'0')}`}</td>
                        <td style={{ fontWeight: 600 }}>{jt.name}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{jt.rate}</td>
                        <td style={{ color: '#8892a4' }}>{jt.unit}</td>
                        <td><Badge color="blue">{jt.gst}</Badge></td>
                        <td style={{ color: '#8892a4' }}>{jt.tat}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={actionBtn('#10b981')} onClick={() => openEditJob(jt)}>✏️ Edit</button>
                            <button style={deleteStyle} onClick={() => setDeleteJob(jt)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── FLEX MEDIA RATES — now DB-backed ── */}
        {tab === 'Flex Media Rates' && (
          <Card>
            <CardHeader>
              <CardTitle>Flex Media Rate Chart ({flexRates.length})</CardTitle>
              <Button variant="primary" onClick={() => { setFlexForm({ name:'', rate:'', unit:'sqft', gst:'18%' }); setEditFlex(null); setShowFlexModal(true) }}>+ Add Media</Button>
            </CardHeader>
            {loading ? <Loading /> : flexRates.length === 0 ? <Empty message="No flex media rates yet. Add your first one!" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Media Type</th><th>Rate Range (₹)</th><th>Unit</th><th>GST</th><th>Notes</th><th>Actions</th></tr></thead>
                  <tbody>
                    {flexRates.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>₹{r.rate}/{r.unit}</td>
                        <td style={{ color: '#8892a4' }}>{r.unit}</td>
                        <td><Badge color="blue">{r.gst}</Badge></td>
                        <td style={{ color: '#8892a4', fontSize: 11 }}>Auto sq.ft calculation</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={actionBtn('#10b981')} onClick={() => openEditFlex(r)}>✏️ Edit</button>
                            <button style={deleteStyle} onClick={() => setDeleteFlex(r)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ════ SUPPLIER MODALS ════ */}
      <Modal open={showSupModal} onClose={() => setShowSupModal(false)} title="Add New Supplier"
        footer={<><Button onClick={() => setShowSupModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAddSupplier} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</Button></>}>
        <SupplierForm />
      </Modal>
      <Modal open={!!editSup} onClose={() => setEditSup(null)} title={`✏️ Edit — ${editSup?.name}`}
        footer={<><Button onClick={() => setEditSup(null)}>Cancel</Button><Button variant="primary" onClick={handleEditSupplier} disabled={saving}>{saving ? 'Saving...' : '💾 Update'}</Button></>}>
        <SupplierForm />
      </Modal>
      <Modal open={!!viewSup} onClose={() => setViewSup(null)} title={`👁 Supplier — ${viewSup?.name}`} footer={<Button onClick={() => setViewSup(null)}>Close</Button>}>
        {viewSup && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Code', viewSup.code],['Name', viewSup.name],['Contact', viewSup.contact],['Email', viewSup.email||'—'],['GST No.', viewSup.gstNo||'—'],['Items', viewSup.items||'—'],['Status', viewSup.active?'Active':'Inactive']].map(([l,v]) => (
              <div key={l} style={{ background: '#1e2535', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a3348' }}>
                <div style={{ fontSize: 9, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <DeleteConfirm open={!!deleteSup} name={deleteSup?.name} onClose={() => setDeleteSup(null)} onConfirm={handleDeleteSupplier} deleting={deleting} />

      {/* ════ STOCK MODALS ════ */}
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title="Add Stock Item"
        footer={<><Button onClick={() => setShowStockModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAddStock} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</Button></>}>
        <StockForm />
      </Modal>
      <Modal open={!!editStock} onClose={() => setEditStock(null)} title={`✏️ Edit — ${editStock?.name}`}
        footer={<><Button onClick={() => setEditStock(null)}>Cancel</Button><Button variant="primary" onClick={handleEditStock} disabled={saving}>{saving ? 'Saving...' : '💾 Update'}</Button></>}>
        <StockForm />
      </Modal>
      <Modal open={!!viewStock} onClose={() => setViewStock(null)} title={`👁 ${viewStock?.name}`} footer={<Button onClick={() => setViewStock(null)}>Close</Button>}>
        {viewStock && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['Name',viewStock.name],['Category',viewStock.category],['Unit',viewStock.unit],['HSN Code',viewStock.hsnCode||'—'],['GST %',`${viewStock.gstPct}%`],['Sale Rate',`₹${viewStock.saleRate}/${viewStock.unit}`],['In Stock',`${viewStock.stock} ${viewStock.unit}`],['Min Stock',`${viewStock.minStock} ${viewStock.unit}`],['Status',viewStock.stock<viewStock.minStock?'⚠️ Low':'✅ OK']].map(([l,v]) => (
              <div key={l} style={{ background: '#1e2535', borderRadius: 8, padding: '10px 12px', border: '1px solid #2a3348' }}>
                <div style={{ fontSize: 9, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: viewStock.stock<viewStock.minStock&&l==='Status'?'#ef4444':'#e2e8f0' }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      <DeleteConfirm open={!!deleteStock} name={deleteStock?.name} onClose={() => setDeleteStock(null)} onConfirm={handleDeleteStock} deleting={deleting} />

      {/* ════ JOB TYPE MODAL ════ */}
      <Modal open={showJobModal} onClose={() => { setShowJobModal(false); setEditJob(null) }}
        title={editJob ? '✏️ Edit Job Type' : '➕ Add Job Type'}
        footer={<><Button onClick={() => { setShowJobModal(false); setEditJob(null) }}>Cancel</Button><Button variant="primary" onClick={handleSaveJobType} disabled={saving}>{saving ? 'Saving...' : `💾 ${editJob ? 'Update' : 'Save'}`}</Button></>}>
        <form onSubmit={handleSaveJobType}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Code"><Input value={jobForm.code} onChange={e => jf('code', e.target.value)} placeholder="e.g. JT06" /></FormGroup>
            <FormGroup label="Job Type Name *"><Input value={jobForm.name} onChange={e => jf('name', e.target.value)} placeholder="e.g. UV Printing" required /></FormGroup>
            <FormGroup label="Rate *"><Input value={jobForm.rate} onChange={e => jf('rate', e.target.value)} placeholder="e.g. 15-25" required /></FormGroup>
            <FormGroup label="Rate Unit">
              <Select value={jobForm.unit} onChange={e => jf('unit', e.target.value)}>
                {['sqft','sheet','pcs','kg'].map(u => <option key={u} value={u}>per {u}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="GST %">
              <Select value={jobForm.gst} onChange={e => jf('gst', e.target.value)}>
                {['5%','12%','18%'].map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="TAT (Turnaround)">
              <Select value={jobForm.tat} onChange={e => jf('tat', e.target.value)}>
                {['Same Day','1 Day','2 Days','3 Days','5 Days','7 Days'].map(t => <option key={t}>{t}</option>)}
              </Select>
            </FormGroup>
          </Grid>
        </form>
      </Modal>
      <DeleteConfirm open={!!deleteJob} name={deleteJob?.name} onClose={() => setDeleteJob(null)} onConfirm={handleDeleteJobType} deleting={deleting} />

      {/* ════ FLEX MEDIA MODAL ════ */}
      <Modal open={showFlexModal} onClose={() => { setShowFlexModal(false); setEditFlex(null) }}
        title={editFlex ? '✏️ Edit Flex Media' : '➕ Add Flex Media'}
        footer={<><Button onClick={() => { setShowFlexModal(false); setEditFlex(null) }}>Cancel</Button><Button variant="primary" onClick={handleSaveFlex} disabled={saving}>{saving ? 'Saving...' : `💾 ${editFlex ? 'Update' : 'Save'}`}</Button></>}>
        <form onSubmit={handleSaveFlex}>
          <FormGroup label="Media Name *">
            <Input value={flexForm.name} onChange={e => ff('name', e.target.value)} placeholder="e.g. Satin Vinyl, Frosted Film" required />
          </FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Rate Range (₹) *">
              <Input value={flexForm.rate} onChange={e => ff('rate', e.target.value)} placeholder="e.g. 40-55" required />
            </FormGroup>
            <FormGroup label="Unit">
              <Select value={flexForm.unit} onChange={e => ff('unit', e.target.value)}>
                {['sqft','sqmtr','roll'].map(u => <option key={u} value={u}>per {u}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="GST %">
              <Select value={flexForm.gst} onChange={e => ff('gst', e.target.value)}>
                {['5%','12%','18%'].map(g => <option key={g} value={g}>{g}</option>)}
              </Select>
            </FormGroup>
          </Grid>
        </form>
      </Modal>
      <DeleteConfirm open={!!deleteFlex} name={deleteFlex?.name} onClose={() => setDeleteFlex(null)} onConfirm={handleDeleteFlex} deleting={deleting} />
    </PageShell>
  )
}