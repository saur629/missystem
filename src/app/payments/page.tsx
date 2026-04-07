'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, Textarea, StatCard, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const MODE_COLOR: Record<string,string> = { CASH:'orange', UPI:'blue', NEFT:'teal', RTGS:'teal', CHEQUE:'purple', CARD:'green' }

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ customerId:'', invoiceId:'', amount:'', mode:'CASH', reference:'', notes:'' })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    Promise.all([fetch('/api/payments').then(r=>r.json()), fetch('/api/customers').then(r=>r.json()), fetch('/api/invoices').then(r=>r.json())])
      .then(([pays,cls,invs]) => { setPayments(Array.isArray(pays)?pays:[]); setCustomers(Array.isArray(cls)?cls:[]); setInvoices(Array.isArray(invs)?invs.filter((i:any)=>i.status!=='PAID'):[]); setLoading(false) })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/payments', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if (!res.ok) throw new Error()
      const pay = await res.json()
      setPayments(p => [pay, ...p])
      setShowModal(false)
      setForm({ customerId:'', invoiceId:'', amount:'', mode:'CASH', reference:'', notes:'' })
      toast.success(`Receipt ${pay.receiptNo} recorded!`)
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const todayTotal = payments.filter(p => new Date(p.date).toDateString()===new Date().toDateString()).reduce((s,p)=>s+p.amount,0)
  const total = payments.reduce((s,p)=>s+p.amount,0)
  const clientInvoices = invoices.filter(i => i.customerId===form.customerId)

  return (
    <PageShell title="Payments" action={{ label:'+ Record Payment', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Received Today" value={formatCurrency(todayTotal)} icon="💰" color="green" />
          <StatCard label="Total Collected" value={formatCurrency(total)} icon="📊" color="blue" />
          <StatCard label="Total Records" value={payments.length} icon="🧾" color="yellow" />
          <StatCard label="UPI / Digital" value={payments.filter(p=>['UPI','NEFT','RTGS'].includes(p.mode)).length} icon="📱" color="blue" />
        </div>

        <Card>
          <CardHeader><CardTitle>Payment Ledger</CardTitle><Button variant="primary" onClick={()=>setShowModal(true)}>+ Record Payment</Button></CardHeader>
          {loading ? <Loading /> : payments.length===0 ? <Empty message="No payments recorded yet" /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr><th>Receipt No.</th><th>Date</th><th>Customer</th><th>Invoice</th><th>Amount</th><th>Mode</th><th>Reference</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:11 }}>{p.receiptNo}</td>
                      <td style={{ color:'#8892a4', fontSize:11 }}>{formatDate(p.date)}</td>
                      <td style={{ fontWeight:500 }}>{p.customer?.name}</td>
                      <td style={{ color:'#8892a4', fontSize:11 }}>{p.invoice?.invNo||'—'}</td>
                      <td style={{ color:'#10b981', fontWeight:700 }}>{formatCurrency(p.amount)}</td>
                      <td><Badge color={MODE_COLOR[p.mode]||'gray'}>{p.mode}</Badge></td>
                      <td style={{ color:'#8892a4', fontSize:11 }}>{p.reference||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="Record Payment"
        footer={<><Button onClick={()=>setShowModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving?'Saving...':'💾 Save Payment'}</Button></>}>
        <form onSubmit={handleCreate}>
          <FormGroup label="Customer *">
            <Select value={form.customerId} onChange={e=>{ f('customerId',e.target.value); f('invoiceId','') }} required>
              <option value="">Select Customer</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </Select>
          </FormGroup>
          {form.customerId && (
            <FormGroup label="Against Invoice (Optional)">
              <Select value={form.invoiceId} onChange={e=>f('invoiceId',e.target.value)}>
                <option value="">General Payment</option>
                {clientInvoices.map(i=><option key={i.id} value={i.id}>{i.invNo} — {formatCurrency(i.totalAmount-i.paidAmount)} due</option>)}
              </Select>
            </FormGroup>
          )}
          <Grid cols={2} gap={12}>
            <FormGroup label="Amount (₹) *"><Input type="number" step="0.01" value={form.amount} onChange={e=>f('amount',e.target.value)} placeholder="0.00" required /></FormGroup>
            <FormGroup label="Payment Mode *">
              <Select value={form.mode} onChange={e=>f('mode',e.target.value)}>
                <option value="CASH">Cash</option><option value="UPI">UPI</option>
                <option value="NEFT">NEFT</option><option value="RTGS">RTGS</option>
                <option value="CHEQUE">Cheque</option><option value="CARD">Card</option>
              </Select>
            </FormGroup>
          </Grid>
          <FormGroup label="Reference / TXN No."><Input value={form.reference} onChange={e=>f('reference',e.target.value)} placeholder="UPI TXN ID, Cheque No..." /></FormGroup>
          <FormGroup label="Notes"><Textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={2} /></FormGroup>
        </form>
      </Modal>
    </PageShell>
  )
}
