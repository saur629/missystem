'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const TABS = ['Suppliers', 'Stock Items', 'Job Types', 'Flex Media Rates']

const DEFAULT_JOB_TYPES = [
  { code: 'JT01', name: 'Flex Banner',     rate: '₹80-120/sqft', gst: '18%', tat: '1 Day',  unit: 'sqft' },
  { code: 'JT02', name: 'Offset Printing', rate: '₹6-15/sheet',  gst: '18%', tat: '3 Days', unit: 'sheet' },
  { code: 'JT03', name: 'Digital Printing',rate: '₹10-20/sheet', gst: '18%', tat: '1 Day',  unit: 'sheet' },
  { code: 'JT04', name: 'Screen Printing', rate: '₹5-10/sheet',  gst: '18%', tat: '2 Days', unit: 'sheet' },
  { code: 'JT05', name: 'Packaging',       rate: 'Quotation',    gst: '12%', tat: '5 Days', unit: 'pcs' },
]

const DEFAULT_FLEX = [
  { name: 'Star Flex',       rate: '30-35', unit: 'sqft', gst: '18%' },
  { name: 'Black Back',      rate: '28-32', unit: 'sqft', gst: '18%' },
  { name: 'One Way Vision',  rate: '50-60', unit: 'sqft', gst: '18%' },
  { name: 'Canvas',          rate: '80-100',unit: 'sqft', gst: '18%' },
  { name: 'Backlit',         rate: '40-50', unit: 'sqft', gst: '18%' },
  { name: 'Eco Solvent',     rate: '45-55', unit: 'sqft', gst: '18%' },
  { name: 'UV Print Vinyl',  rate: '60-80', unit: 'sqft', gst: '18%' },
  { name: 'Normal Vinyl',    rate: '22-28', unit: 'sqft', gst: '18%' },
]

export default function MastersPage() {
  const [tab, setTab] = useState('Suppliers')
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [jobTypes, setJobTypes] = useState(DEFAULT_JOB_TYPES)
  const [flexRates, setFlexRates] = useState(DEFAULT_FLEX)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showSupModal, setShowSupModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showJobModal, setShowJobModal] = useState(false)
  const [showFlexModal, setShowFlexModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Forms
  const [supForm, setSupForm] = useState({ name: '', contact: '', email: '', gstNo: '', items: '' })
  const [stockForm, setStockForm] = useState({ name: '', category: 'Flex Media', unit: 'SQ FT', hsnCode: '', gstPct: '18', saleRate: '', stock: '0', minStock: '10' })
  const [jobForm, setJobForm] = useState({ code: '', name: '', rate: '', unit: 'sqft', gst: '18%', tat: '1 Day' })
  const [flexForm, setFlexForm] = useState({ name: '', rate: '', unit: 'sqft', gst: '18%' })

  const sf = (k: string, v: string) => setSupForm(p => ({ ...p, [k]: v }))
  const stf = (k: string, v: string) => setStockForm(p => ({ ...p, [k]: v }))
  const jf = (k: string, v: string) => setJobForm(p => ({ ...p, [k]: v }))
  const ff = (k: string, v: string) => setFlexForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/purchase').then(r => r.json()).then(d => {
      setSuppliers(d.suppliers || [])
      setStock(d.stock || [])
      setLoading(false)
    })
  }, [])

  // Add Supplier
  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/masters/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supForm),
      })
      if (!res.ok) throw new Error()
      const s = await res.json()
      setSuppliers(p => [...p, s])
      setShowSupModal(false)
      setSupForm({ name: '', contact: '', email: '', gstNo: '', items: '' })
      toast.success(`Supplier ${s.name} added!`)
    } catch { toast.error('Failed to add supplier') }
    setSaving(false)
  }

  // Add Stock Item
  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/masters/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockForm),
      })
      if (!res.ok) throw new Error()
      const item = await res.json()
      setStock(p => [...p, item])
      setShowStockModal(false)
      setStockForm({ name: '', category: 'Flex Media', unit: 'SQ FT', hsnCode: '', gstPct: '18', saleRate: '', stock: '0', minStock: '10' })
      toast.success(`${item.name} added to stock!`)
    } catch { toast.error('Failed to add stock item') }
    setSaving(false)
  }

  // Add Job Type (local only — stored in state)
  function handleAddJobType(e: React.FormEvent) {
    e.preventDefault()
    const next = { ...jobForm, rate: `₹${jobForm.rate}/unit` }
    setJobTypes(p => [...p, next])
    setShowJobModal(false)
    setJobForm({ code: '', name: '', rate: '', unit: 'sqft', gst: '18%', tat: '1 Day' })
    toast.success('Job type added!')
  }

  // Add Flex Rate (local only)
  function handleAddFlex(e: React.FormEvent) {
    e.preventDefault()
    setFlexRates(p => [...p, flexForm])
    setShowFlexModal(false)
    setFlexForm({ name: '', rate: '', unit: 'sqft', gst: '18%' })
    toast.success('Flex media rate added!')
  }

  // Stock low color
  function stockColor(item: any) {
    if (item.stock < item.minStock) return '#ef4444'
    if (item.stock < item.minStock * 2) return '#f59e0b'
    return '#10b981'
  }

  return (
    <PageShell title="Masters & Settings">
      <div className="animate-in">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: 3, background: '#1e2535', borderRadius: 8, marginBottom: 20, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '5px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, background: tab === t ? '#161b27' : 'transparent', color: tab === t ? '#e2e8f0' : '#8892a4' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── SUPPLIERS ── */}
        {tab === 'Suppliers' && (
          <Card>
            <CardHeader>
              <CardTitle>Suppliers ({suppliers.length})</CardTitle>
              <Button variant="primary" onClick={() => setShowSupModal(true)}>+ Add Supplier</Button>
            </CardHeader>
            {loading ? <Loading /> : suppliers.length === 0 ? <Empty message="No suppliers yet" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Code</th><th>Name</th><th>Contact</th><th>Email</th><th>GST No.</th><th>Items Supplied</th><th>Status</th></tr>
                  </thead>
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
              <Button variant="primary" onClick={() => setShowStockModal(true)}>+ Add Item</Button>
            </CardHeader>
            {loading ? <Loading /> : stock.length === 0 ? <Empty message="No stock items yet" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Category</th><th>Unit</th><th>HSN Code</th><th>GST %</th><th>Sale Rate</th><th>Stock</th><th>Min Stock</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {stock.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ color: '#8892a4' }}>{item.category}</td>
                        <td style={{ color: '#8892a4' }}>{item.unit}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#8892a4' }}>{item.hsnCode || '—'}</td>
                        <td><Badge color="blue">{item.gstPct}%</Badge></td>
                        <td style={{ color: '#10b981' }}>{formatCurrency(item.saleRate)}/{item.unit}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: stockColor(item) }}>
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td style={{ color: '#8892a4' }}>{item.minStock} {item.unit}</td>
                        <td>
                          {item.stock < item.minStock
                            ? <Badge color="red">⚠ Low Stock</Badge>
                            : <Badge color="green">OK</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Stock progress bars */}
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
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>⚠ Below minimum — reorder {item.minStock - item.stock} {item.unit} needed</div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── JOB TYPES ── */}
        {tab === 'Job Types' && (
          <Card>
            <CardHeader>
              <CardTitle>Job Type Master ({jobTypes.length})</CardTitle>
              <Button variant="primary" onClick={() => setShowJobModal(true)}>+ Add Job Type</Button>
            </CardHeader>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Code</th><th>Job Type</th><th>Rate</th><th>Unit</th><th>GST</th><th>TAT</th></tr>
                </thead>
                <tbody>
                  {jobTypes.map((jt, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#3b82f6' }}>{jt.code || `JT0${i + 1}`}</td>
                      <td style={{ fontWeight: 600 }}>{jt.name}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{jt.rate}</td>
                      <td style={{ color: '#8892a4' }}>{jt.unit}</td>
                      <td><Badge color="blue">{jt.gst}</Badge></td>
                      <td style={{ color: '#8892a4' }}>{jt.tat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── FLEX MEDIA RATES ── */}
        {tab === 'Flex Media Rates' && (
          <Card>
            <CardHeader>
              <CardTitle>Flex Media Rate Chart ({flexRates.length})</CardTitle>
              <Button variant="primary" onClick={() => setShowFlexModal(true)}>+ Add Media</Button>
            </CardHeader>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Media Type</th><th>Rate Range (₹)</th><th>Unit</th><th>GST</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {flexRates.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>₹{r.rate}/{r.unit}</td>
                      <td style={{ color: '#8892a4' }}>{r.unit}</td>
                      <td><Badge color="blue">{r.gst}</Badge></td>
                      <td style={{ color: '#8892a4', fontSize: 11 }}>Auto sq.ft calculation</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ── ADD SUPPLIER MODAL ── */}
      <Modal open={showSupModal} onClose={() => setShowSupModal(false)} title="Add New Supplier"
        footer={<>
          <Button onClick={() => setShowSupModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddSupplier} disabled={saving}>{saving ? 'Saving...' : '💾 Save Supplier'}</Button>
        </>}>
        <form onSubmit={handleAddSupplier}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Supplier Name *"><Input value={supForm.name} onChange={e => sf('name', e.target.value)} placeholder="Star Papers Pvt Ltd" required /></FormGroup>
            <FormGroup label="Contact No. *"><Input value={supForm.contact} onChange={e => sf('contact', e.target.value)} placeholder="9876500000" required /></FormGroup>
            <FormGroup label="Email"><Input type="email" value={supForm.email} onChange={e => sf('email', e.target.value)} placeholder="supplier@email.com" /></FormGroup>
            <FormGroup label="GST No."><Input value={supForm.gstNo} onChange={e => sf('gstNo', e.target.value)} placeholder="09XXXXX1234Z1ZX" /></FormGroup>
          </Grid>
          <FormGroup label="Items Supplied">
            <Input value={supForm.items} onChange={e => sf('items', e.target.value)} placeholder="e.g. Flex, Star Flex, Black Back, Ink" />
          </FormGroup>
        </form>
      </Modal>

      {/* ── ADD STOCK ITEM MODAL ── */}
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title="Add Stock / Inventory Item"
        footer={<>
          <Button onClick={() => setShowStockModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddStock} disabled={saving}>{saving ? 'Saving...' : '💾 Save Item'}</Button>
        </>}>
        <form onSubmit={handleAddStock}>
          <FormGroup label="Item Name *">
            <Input value={stockForm.name} onChange={e => stf('name', e.target.value)} placeholder="e.g. Star Flex, Maplitho Paper A4 70 GSM" required />
          </FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Category *">
              <Select value={stockForm.category} onChange={e => stf('category', e.target.value)}>
                <option>Flex Media</option>
                <option>Paper</option>
                <option>Ink</option>
                <option>Lamination</option>
                <option>Board</option>
                <option>Chemical</option>
                <option>Other</option>
              </Select>
            </FormGroup>
            <FormGroup label="Unit *">
              <Select value={stockForm.unit} onChange={e => stf('unit', e.target.value)}>
                <option>SQ FT</option>
                <option>KG</option>
                <option>ROLL</option>
                <option>PCS</option>
                <option>LITRE</option>
                <option>METRE</option>
                <option>SHEET</option>
              </Select>
            </FormGroup>
            <FormGroup label="HSN Code">
              <Input value={stockForm.hsnCode} onChange={e => stf('hsnCode', e.target.value)} placeholder="e.g. 48025590" />
            </FormGroup>
            <FormGroup label="GST %">
              <Select value={stockForm.gstPct} onChange={e => stf('gstPct', e.target.value)}>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </Select>
            </FormGroup>
            <FormGroup label="Sale Rate (₹) *">
              <Input type="number" step="0.01" value={stockForm.saleRate} onChange={e => stf('saleRate', e.target.value)} placeholder="0.00" required />
            </FormGroup>
            <FormGroup label="Opening Stock">
              <Input type="number" step="0.01" value={stockForm.stock} onChange={e => stf('stock', e.target.value)} placeholder="0" />
            </FormGroup>
            <FormGroup label="Min. Stock Level">
              <Input type="number" step="0.01" value={stockForm.minStock} onChange={e => stf('minStock', e.target.value)} placeholder="10" />
            </FormGroup>
          </Grid>
          <div style={{ background: '#1e2535', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#8892a4', border: '1px solid #2a3348' }}>
            💡 <b style={{ color: '#e2e8f0' }}>Tip:</b> Min. Stock Level triggers a low-stock warning when stock falls below this number.
          </div>
        </form>
      </Modal>

      {/* ── ADD JOB TYPE MODAL ── */}
      <Modal open={showJobModal} onClose={() => setShowJobModal(false)} title="Add Job Type"
        footer={<>
          <Button onClick={() => setShowJobModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddJobType}>{saving ? 'Saving...' : '💾 Save Job Type'}</Button>
        </>}>
        <form onSubmit={handleAddJobType}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Code"><Input value={jobForm.code} onChange={e => jf('code', e.target.value)} placeholder="e.g. JT06" /></FormGroup>
            <FormGroup label="Job Type Name *"><Input value={jobForm.name} onChange={e => jf('name', e.target.value)} placeholder="e.g. UV Printing" required /></FormGroup>
            <FormGroup label="Rate *"><Input value={jobForm.rate} onChange={e => jf('rate', e.target.value)} placeholder="e.g. 15-25" required /></FormGroup>
            <FormGroup label="Rate Unit">
              <Select value={jobForm.unit} onChange={e => jf('unit', e.target.value)}>
                <option value="sqft">per sqft</option>
                <option value="sheet">per sheet</option>
                <option value="pcs">per piece</option>
                <option value="kg">per kg</option>
              </Select>
            </FormGroup>
            <FormGroup label="GST %">
              <Select value={jobForm.gst} onChange={e => jf('gst', e.target.value)}>
                <option value="5%">5%</option>
                <option value="12%">12%</option>
                <option value="18%">18%</option>
              </Select>
            </FormGroup>
            <FormGroup label="TAT (Turnaround)">
              <Select value={jobForm.tat} onChange={e => jf('tat', e.target.value)}>
                <option>Same Day</option>
                <option>1 Day</option>
                <option>2 Days</option>
                <option>3 Days</option>
                <option>5 Days</option>
                <option>7 Days</option>
              </Select>
            </FormGroup>
          </Grid>
        </form>
      </Modal>

      {/* ── ADD FLEX MEDIA MODAL ── */}
      <Modal open={showFlexModal} onClose={() => setShowFlexModal(false)} title="Add Flex Media / Rate"
        footer={<>
          <Button onClick={() => setShowFlexModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddFlex}>💾 Save Media Rate</Button>
        </>}>
        <form onSubmit={handleAddFlex}>
          <FormGroup label="Media Name *">
            <Input value={flexForm.name} onChange={e => ff('name', e.target.value)} placeholder="e.g. Satin Vinyl, Frosted Glass Film" required />
          </FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Rate Range (₹) *">
              <Input value={flexForm.rate} onChange={e => ff('rate', e.target.value)} placeholder="e.g. 40-55" required />
            </FormGroup>
            <FormGroup label="Unit">
              <Select value={flexForm.unit} onChange={e => ff('unit', e.target.value)}>
                <option value="sqft">per sqft</option>
                <option value="sqmtr">per sq.mtr</option>
                <option value="roll">per roll</option>
              </Select>
            </FormGroup>
            <FormGroup label="GST %">
              <Select value={flexForm.gst} onChange={e => ff('gst', e.target.value)}>
                <option value="5%">5%</option>
                <option value="12%">12%</option>
                <option value="18%">18%</option>
              </Select>
            </FormGroup>
          </Grid>
          <div style={{ background: '#1e2535', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#8892a4', border: '1px solid #2a3348', marginTop: 4 }}>
            💡 This rate will appear in the Order booking dropdown for Flex media selection.
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
