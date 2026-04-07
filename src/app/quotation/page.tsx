'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, Textarea, StatCard, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_COLOR: Record<string,string> = { PENDING:'yellow', APPROVED:'green', REJECTED:'red', CONVERTED:'blue' }

export default function QuotationPage() {
  const [quotations, setQuotations] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ customerId:'', description:'', qty:'1', rate:'', gstPct:'18', discount:'0', validTill:'', notes:'' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const subTotal = parseFloat(form.rate||'0') * parseInt(form.qty||'1') - parseFloat(form.discount||'0')
  const gstAmt = subTotal * parseFloat(form.gstPct||'18') / 100
  const total = subTotal + gstAmt

  useEffect(() => {
    Promise.all([
      fetch('/api/quotations').then(r=>r.json()),
      fetch('/api/customers').then(r=>r.json()),
    ]).then(([qts,cls]) => { setQuotations(Array.isArray(qts)?qts:[]); setCustomers(Array.isArray(cls)?cls:[]); setLoading(false) })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/quotations', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if (!res.ok) throw new Error()
      const qt = await res.json()
      setQuotations(p => [qt, ...p])
      setShowModal(false)
      setForm({ customerId:'', description:'', qty:'1', rate:'', gstPct:'18', discount:'0', validTill:'', notes:'' })
      toast.success(`Quotation ${qt.qtNo} created!`)
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/quotations/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) })
    if (res.ok) { setQuotations(p => p.map(q => q.id===id ? {...q, status} : q)); toast.success('Status updated') }
  }

  const counts = { total:quotations.length, pending:quotations.filter(q=>q.status==='PENDING').length, approved:quotations.filter(q=>q.status==='APPROVED').length, rejected:quotations.filter(q=>q.status==='REJECTED').length }

  return (
    <PageShell title="Quotations" action={{ label:'+ New Quotation', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Total" value={counts.total} icon="📝" color="blue" />
          <StatCard label="Pending" value={counts.pending} icon="⏳" color="yellow" />
          <StatCard label="Approved" value={counts.approved} icon="✅" color="green" />
          <StatCard label="Rejected" value={counts.rejected} icon="❌" color="red" />
        </div>

        <Card>
          <CardHeader><CardTitle>Quotation List</CardTitle><Button variant="primary" onClick={()=>setShowModal(true)}>+ New Quotation</Button></CardHeader>
          {loading ? <Loading /> : quotations.length===0 ? <Empty message="No quotations yet" /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr><th>QT No.</th><th>Date</th><th>Customer</th><th>Description</th><th>Qty</th><th>Total</th><th>Valid Till</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {quotations.map(qt => (
                    <tr key={qt.id}>
                      <td style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:11 }}>{qt.qtNo}</td>
                      <td style={{ color:'#8892a4', fontSize:11 }}>{formatDate(qt.date)}</td>
                      <td style={{ fontWeight:500 }}>{qt.customer?.name}</td>
                      <td style={{ color:'#8892a4', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{qt.description}</td>
                      <td>{qt.qty?.toLocaleString()}</td>
                      <td style={{ color:'#10b981', fontWeight:600 }}>{formatCurrency(qt.totalAmount)}</td>
                      <td style={{ color:'#8892a4', fontSize:11 }}>{formatDate(qt.validTill)}</td>
                      <td><Badge color={STATUS_COLOR[qt.status]}>{qt.status}</Badge></td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          {qt.status==='PENDING' && <>
                            <Button size="sm" onClick={()=>updateStatus(qt.id,'APPROVED')}>✓ Approve</Button>
                            <Button size="sm" variant="danger" onClick={()=>updateStatus(qt.id,'REJECTED')}>✗</Button>
                          </>}
                          {qt.status==='APPROVED' && <Button size="sm" onClick={()=>updateStatus(qt.id,'CONVERTED')}>→ Convert</Button>}
                          {qt.status==='REJECTED' && <Button size="sm" onClick={()=>updateStatus(qt.id,'PENDING')}>Revise</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="New Quotation"
        footer={<><Button onClick={()=>setShowModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving?'Saving...':'💾 Save Quotation'}</Button></>}>
        <form onSubmit={handleCreate}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Customer *">
              <Select value={form.customerId} onChange={e=>f('customerId',e.target.value)} required>
                <option value="">Select Customer</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Valid Till *"><Input type="date" value={form.validTill} onChange={e=>f('validTill',e.target.value)} required /></FormGroup>
          </Grid>
          <FormGroup label="Description *"><Input value={form.description} onChange={e=>f('description',e.target.value)} placeholder="e.g. Flex Banner 10×4 ft Star Flex" required /></FormGroup>
          <Grid cols={3} gap={12}>
            <FormGroup label="Quantity"><Input type="number" value={form.qty} onChange={e=>f('qty',e.target.value)} /></FormGroup>
            <FormGroup label="Rate (₹) *"><Input type="number" step="0.01" value={form.rate} onChange={e=>f('rate',e.target.value)} required /></FormGroup>
            <FormGroup label="Discount (₹)"><Input type="number" value={form.discount} onChange={e=>f('discount',e.target.value)} /></FormGroup>
          </Grid>
          <FormGroup label="GST %">
            <Select value={form.gstPct} onChange={e=>f('gstPct',e.target.value)}>
              <option value="0">No GST</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option>
            </Select>
          </FormGroup>
          <FormGroup label="Notes"><Textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={2} placeholder="Terms, conditions..." /></FormGroup>
          <div style={{ background:'#1e2535', borderRadius:8, padding:14, border:'1px solid #2a3348' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}><span style={{ color:'#8892a4' }}>Subtotal</span><span>{formatCurrency(subTotal)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}><span style={{ color:'#8892a4' }}>GST {form.gstPct}%</span><span>{formatCurrency(gstAmt)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:700, color:'#10b981', paddingTop:6, borderTop:'1px solid #2a3348' }}><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </form>
      </Modal>
    </PageShell>
  )
}
