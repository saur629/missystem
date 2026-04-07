'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Badge, Button, Modal, FormGroup, Input, Select, Textarea, StatCard, Loading, Empty, Grid } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const PO_COLOR: Record<string,string> = { ORDERED:'yellow', IN_TRANSIT:'blue', RECEIVED:'green', CANCELLED:'red' }

export default function PurchasePage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ supplierId:'', notes:'', items:[{ itemName:'', unit:'KG', qty:'', rate:'' }] })

  useEffect(() => {
    fetch('/api/purchase').then(r=>r.json()).then(d => {
      setPurchases(d.purchases||[]); setSuppliers(d.suppliers||[]); setStock(d.stock||[]); setLoading(false)
    })
  }, [])

  function addItem() { setForm(p=>({...p,items:[...p.items,{itemName:'',unit:'KG',qty:'',rate:''}]})) }
  function removeItem(i: number) { setForm(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)})) }
  function updateItem(i: number, k: string, v: string) { setForm(p=>{const items=[...p.items];items[i]={...items[i],[k]:v};return{...p,items}}) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/purchase', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if (!res.ok) throw new Error()
      const po = await res.json()
      setPurchases(p=>[po,...p])
      setShowModal(false)
      setForm({ supplierId:'', notes:'', items:[{itemName:'',unit:'KG',qty:'',rate:''}] })
      toast.success(`PO ${po.poNo} created!`)
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/purchase/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status }) })
    if (res.ok) { setPurchases(p=>p.map(po=>po.id===id?{...po,status}:po)); toast.success('Status updated') }
  }

  return (
    <PageShell title="Purchase & Inventory" action={{ label:'+ New PO', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Total POs" value={purchases.length} icon="🛒" color="blue" />
          <StatCard label="Total Spend" value={formatCurrency(purchases.reduce((s,p)=>s+(p.totalAmount||0),0))} icon="💸" color="yellow" />
          <StatCard label="Pending Delivery" value={purchases.filter(p=>p.status==='ORDERED').length} icon="🚚" color="green" />
        </div>

        <Grid cols={2} gap={16}>
          <Card>
            <CardHeader><CardTitle>Purchase Orders</CardTitle><Button variant="primary" onClick={()=>setShowModal(true)}>+ New PO</Button></CardHeader>
            {loading ? <Loading /> : purchases.length===0 ? <Empty message="No purchase orders yet" /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>PO No.</th><th>Date</th><th>Supplier</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {purchases.map(po => (
                      <tr key={po.id}>
                        <td style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:11 }}>{po.poNo}</td>
                        <td style={{ color:'#8892a4', fontSize:11 }}>{formatDate(po.date)}</td>
                        <td style={{ fontWeight:500 }}>{po.supplier?.name}</td>
                        <td style={{ color:'#10b981' }}>{formatCurrency(po.totalAmount)}</td>
                        <td><Badge color={PO_COLOR[po.status]}>{po.status}</Badge></td>
                        <td>
                          <Select style={{ width:120, padding:'3px 6px', fontSize:10 }} value={po.status} onChange={e=>updateStatus(po.id,e.target.value)}>
                            <option value="ORDERED">Ordered</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="RECEIVED">Received</option>
                            <option value="CANCELLED">Cancelled</option>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Stock / Inventory</CardTitle></CardHeader>
            <div style={{ padding:14 }}>
              {stock.length===0 ? <Empty message="No stock items" /> : stock.map(item => {
                const pct = Math.min(100, Math.round((item.stock / Math.max(item.minStock*3,1))*100))
                const color = pct<30?'#ef4444':pct<60?'#f59e0b':'#10b981'
                return (
                  <div key={item.id} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                      <span>{item.name}</span>
                      <span style={{ color, fontWeight:600 }}>{item.stock} {item.unit}</span>
                    </div>
                    <div style={{ height:5, background:'#252d40', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3 }} />
                    </div>
                    {item.stock < item.minStock && <div style={{ fontSize:10, color:'#ef4444', marginTop:2 }}>⚠ Low stock — reorder needed</div>}
                  </div>
                )
              })}
            </div>
          </Card>
        </Grid>
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)} title="New Purchase Order"
        footer={<><Button onClick={()=>setShowModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving?'Saving...':'💾 Save PO'}</Button></>}>
        <form onSubmit={handleCreate}>
          <FormGroup label="Supplier *">
            <Select value={form.supplierId} onChange={e=>setForm(p=>({...p,supplierId:e.target.value}))} required>
              <option value="">Select Supplier</option>
              {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormGroup>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <label style={{ fontSize:10, fontWeight:600, color:'#8892a4', textTransform:'uppercase', letterSpacing:'0.5px' }}>Items *</label>
              <Button size="sm" type="button" onClick={addItem}>+ Add Item</Button>
            </div>
            {form.items.map((item,i) => (
              <div key={i} style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:10, marginBottom:8 }}>
                <Input style={{ marginBottom:8 }} value={item.itemName} onChange={e=>updateItem(i,'itemName',e.target.value)} placeholder="Item name" required />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8 }}>
                  <Select value={item.unit} onChange={e=>updateItem(i,'unit',e.target.value)}>
                    {['KG','PCS','ROLL','SQ FT','LITRE','METRE'].map(u=><option key={u}>{u}</option>)}
                  </Select>
                  <Input type="number" step="0.01" value={item.qty} onChange={e=>updateItem(i,'qty',e.target.value)} placeholder="Qty" required />
                  <Input type="number" step="0.01" value={item.rate} onChange={e=>updateItem(i,'rate',e.target.value)} placeholder="Rate ₹" required />
                  {form.items.length>1 && <Button size="sm" type="button" variant="danger" onClick={()=>removeItem(i)}>✕</Button>}
                </div>
              </div>
            ))}
          </div>
          <FormGroup label="Notes"><Textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} /></FormGroup>
        </form>
      </Modal>
    </PageShell>
  )
}
