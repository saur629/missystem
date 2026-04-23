'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardHeader, CardTitle, Button, Modal, FormGroup, Input, Select, Loading, Empty, Grid, StatCard } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const CATEGORIES = ['FLEX','INK','BOARD','PAPER','VINYL','LAMINATION','CHEMICAL','OTHER']
const UNITS      = ['ROLL','LITRE','ML','SHEET','REAM','PCS','KG','METRE','SQ FT','BOX']
const CAT_COLOR: Record<string,string> = { FLEX:'#3b82f6',INK:'#8b5cf6',BOARD:'#f59e0b',PAPER:'#10b981',VINYL:'#14b8a6',LAMINATION:'#f97316',CHEMICAL:'#ef4444',OTHER:'#6b7280' }
const CAT_ICON:  Record<string,string> = { FLEX:'🎞️',INK:'🖊️',BOARD:'📋',PAPER:'📄',VINYL:'🎨',LAMINATION:'✨',CHEMICAL:'🧪',OTHER:'📦' }
const TABS = ['Dashboard','Item Master','Add Stock','Use Stock','Stock Ledger','Vendors','Purchases']
const defaultItem = { name:'',category:'FLEX',unit:'ROLL',isDecimal:true,hsnCode:'',gstPct:'18',saleRate:'',currentQty:'0',minQty:'5' }

function stockStatus(item: any) {
  if (item.currentQty <= 0)             return { label:'Empty',    color:'#ef4444', bg:'rgba(239,68,68,.12)' }
  if (item.currentQty <= item.minQty)   return { label:'Low',      color:'#f59e0b', bg:'rgba(245,158,11,.12)' }
  if (item.currentQty <= item.minQty*2) return { label:'Moderate', color:'#3b82f6', bg:'rgba(59,130,246,.12)' }
  return { label:'Good', color:'#10b981', bg:'rgba(16,185,129,.12)' }
}

export default function InventoryPage() {
  const [tab, setTab]         = useState('Dashboard')
  const [items, setItems]     = useState<any[]>([])
  const [txns, setTxns]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  // Item master state
  const [showItemModal, setShowItemModal] = useState(false)
  const [editItem, setEditItem]           = useState<any>(null)
  const [deleteTarget, setDeleteTarget]   = useState<any>(null)
  const [deleting, setDeleting]           = useState(false)
  const [itemForm, setItemForm]           = useState({ ...defaultItem })
  const if_ = (k: string, v: any) => setItemForm(p => ({ ...p, [k]: v }))

  // Transaction state
  const [txnForm, setTxnForm] = useState({ itemId:'', qty:'', note:'', ref:'' })
  const tf = (k: string, v: string) => setTxnForm(p => ({ ...p, [k]: v }))

  // Ledger filters
  const [ledgerItem, setLedgerItem] = useState('')
  const [ledgerType, setLedgerType] = useState('')

  // Detail modal
  const [viewItem, setViewItem]     = useState<any>(null)
  const [itemTxns, setItemTxns]     = useState<any[]>([])
  const [txnLoading, setTxnLoading] = useState(false)

  // Category filter on dashboard
  const [catFilter, setCatFilter] = useState('ALL')

  // Vendor state
  const [vendors, setVendors]           = useState<any[]>([])
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [editVendor, setEditVendor]     = useState<any>(null)
  const [deleteVendor, setDeleteVendor] = useState<any>(null)
  const [deletingVendor, setDeletingVendor] = useState(false)
  const [vendorForm, setVendorForm]     = useState({ name:'', mobile:'', email:'', address:'', gstNo:'', notes:'' })
  const vf = (k: string, v: string) => setVendorForm(p => ({ ...p, [k]: v }))

  // Purchase state
  const [purchases, setPurchases]       = useState<any[]>([])
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseLines, setPurchaseLines] = useState<any[]>([{ itemId:'', qty:'', rate:'', amount:0 }])
  const [purchaseForm, setPurchaseForm] = useState({ vendorId:'', billNo:'', billDate: new Date().toISOString().slice(0,10), paidAmount:'', notes:'' })
  const pf = (k: string, v: string) => setPurchaseForm(p => ({ ...p, [k]: v }))
  const [savingPurchase, setSavingPurchase] = useState(false)
  const [viewPurchase, setViewPurchase] = useState<any>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/inventory').then(r => r.json())
      setItems(Array.isArray(data) ? data : [])
    } catch { setItems([]) }
    setLoading(false)
  }, [])

  const fetchTxns = useCallback(async () => {
    const params = new URLSearchParams()
    if (ledgerItem) params.set('itemId', ledgerItem)
    if (ledgerType) params.set('type', ledgerType)
    params.set('limit', '200')
    try {
      const data = await fetch(`/api/inventory/transactions?${params}`).then(r => r.json())
      setTxns(Array.isArray(data) ? data : [])
    } catch { setTxns([]) }
  }, [ledgerItem, ledgerType])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { if (tab === 'Stock Ledger') fetchTxns() }, [tab, fetchTxns])
  useEffect(() => {
    if (tab === 'Vendors' || tab === 'Purchases') {
      fetch('/api/inventory/vendors').then(r=>r.json()).then(d=>setVendors(Array.isArray(d)?d:[]))
    }
    if (tab === 'Purchases') {
      fetch('/api/inventory/purchases').then(r=>r.json()).then(d=>setPurchases(Array.isArray(d)?d:[]))
    }
  }, [tab])

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemForm.name) { toast.error('Item name required'); return }
    setSaving(true)
    try {
      const payload = {
        ...itemForm,
        isDecimal:  Boolean(itemForm.isDecimal),
        gstPct:     parseFloat(itemForm.gstPct  || '18'),
        saleRate:   parseFloat(itemForm.saleRate || '0'),
        currentQty: parseFloat(itemForm.currentQty || '0'),
        minQty:     parseFloat(itemForm.minQty  || '5'),
      }
      if (editItem) {
        const res = await fetch(`/api/inventory/${editItem.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setItems(p => p.map(i => i.id === updated.id ? updated : i))
        setEditItem(null); setShowItemModal(false)
        toast.success('✅ Item updated!')
      } else {
        const res = await fetch('/api/inventory', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setItems(p => [...p, created])
        setShowItemModal(false); setItemForm({ ...defaultItem })
        toast.success(`✅ ${created.name} added!`)
      }
    } catch { toast.error('Failed to save item') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, { method:'DELETE' })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      setItems(p => p.filter(i => i.id !== deleteTarget.id))
      setDeleteTarget(null); toast.success('Deleted')
    } catch (err: any) { toast.error(err.message||'Cannot delete') }
    setDeleting(false)
  }

  async function handleTransaction(type: 'ADD'|'USE'|'ADJUST') {
    if (!txnForm.itemId) { toast.error('Select an item'); return }
    if (!txnForm.qty || parseFloat(txnForm.qty) <= 0) { toast.error('Enter a valid quantity'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/transactions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...txnForm, qty: parseFloat(txnForm.qty), type }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const txn = await res.json()
      setItems(p => p.map(i => i.id === txnForm.itemId ? { ...i, currentQty: txn.balAfter } : i))
      const item = items.find(i => i.id === txnForm.itemId)
      setTxnForm({ itemId:'', qty:'', note:'', ref:'' })
      const word = type==='ADD'?'Added':type==='USE'?'Used':'Adjusted'
      toast.success(`✅ ${word} — Balance: ${txn.balAfter} ${item?.unit||''}`, { duration:5000 })
      if (txn.item && txn.item.currentQty <= txn.item.minQty)
        setTimeout(() => toast.error(`⚠️ LOW STOCK: ${txn.item.name} — only ${txn.item.currentQty} ${txn.item.unit} left!`, { duration:8000 }), 800)
    } catch (err: any) { toast.error(err.message||'Failed') }
    setSaving(false)
  }

  // ── VENDOR HANDLERS ──────────────────────────────────────────
  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault()
    if (!vendorForm.name) { toast.error('Vendor name required'); return }
    setSaving(true)
    try {
      if (editVendor) {
        const res = await fetch(`/api/inventory/vendors/${editVendor.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(vendorForm) })
        if (!res.ok) throw new Error()
        const updated = await res.json()
        setVendors(p => p.map(v => v.id===updated.id ? {...v,...updated} : v))
        setEditVendor(null)
        toast.success('✅ Vendor updated!')
      } else {
        const res = await fetch('/api/inventory/vendors', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(vendorForm) })
        if (!res.ok) throw new Error()
        const created = await res.json()
        setVendors(p => [...p, created])
        setShowVendorModal(false)
        setVendorForm({ name:'', mobile:'', email:'', address:'', gstNo:'', notes:'' })
        toast.success(`✅ ${created.name} added!`)
      }
    } catch { toast.error('Failed to save vendor') }
    setSaving(false)
  }

  async function handleDeleteVendor() {
    if (!deleteVendor) return
    setDeletingVendor(true)
    try {
      await fetch(`/api/inventory/vendors/${deleteVendor.id}`, { method:'DELETE' })
      setVendors(p => p.filter(v => v.id !== deleteVendor.id))
      setDeleteVendor(null)
      toast.success('Vendor removed')
    } catch { toast.error('Failed') }
    setDeletingVendor(false)
  }

  // ── PURCHASE HANDLERS ─────────────────────────────────────────
  function updateLine(idx: number, key: string, val: string) {
    setPurchaseLines(prev => prev.map((line, i) => {
      if (i !== idx) return line
      const updated = { ...line, [key]: val }
      const qty  = parseFloat(key==='qty'  ? val : updated.qty  || '0') || 0
      const rate = parseFloat(key==='rate' ? val : updated.rate || '0') || 0
      updated.amount = qty * rate
      return updated
    }))
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault()
    if (!purchaseForm.vendorId) { toast.error('Select a vendor'); return }
    const validLines = purchaseLines.filter(l => l.itemId && parseFloat(l.qty)>0 && parseFloat(l.rate)>0)
    if (!validLines.length) { toast.error('Add at least one valid item'); return }
    setSavingPurchase(true)
    try {
      const res = await fetch('/api/inventory/purchases', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...purchaseForm, paidAmount: parseFloat(purchaseForm.paidAmount||'0'), items: validLines.map(l=>({ itemId:l.itemId, qty:parseFloat(l.qty), rate:parseFloat(l.rate) })) }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const purchase = await res.json()
      setPurchases(p => [purchase, ...p])
      // Refresh items to show updated stock
      fetchItems()
      setShowPurchaseModal(false)
      setPurchaseLines([{ itemId:'', qty:'', rate:'', amount:0 }])
      setPurchaseForm({ vendorId:'', billNo:'', billDate: new Date().toISOString().slice(0,10), paidAmount:'', notes:'' })
      toast.success(`✅ Purchase recorded! Stock updated for ${purchase.items.length} item(s)`, { duration:6000 })
    } catch (err: any) { toast.error(err.message||'Failed to save purchase') }
    setSavingPurchase(false)
  }

  const purchaseTotal = purchaseLines.reduce((s,l) => s + (l.amount||0), 0)

  async function handleAdjust() {
    if (!txnForm.itemId || txnForm.qty === '') { toast.error('Select item and enter actual count'); return }
    if (!txnForm.note)  { toast.error('Please enter a reason for adjustment'); return }
    const actual   = parseFloat(txnForm.qty)
    const current  = items.find(i => i.id === txnForm.itemId)?.currentQty || 0
    const diff     = actual - current
    if (diff === 0) { toast.error('No difference to adjust'); return }
    const absDiff  = Math.abs(diff)
    const adjType  = diff > 0 ? 'ADD' : 'USE'
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/transactions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ itemId:txnForm.itemId, qty:absDiff, type:adjType, note:`[ADJUST] ${txnForm.note}`, ref:'ADJUSTMENT' }),
      })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const txn = await res.json()
      setItems(p => p.map(i => i.id === txnForm.itemId ? { ...i, currentQty: txn.balAfter } : i))
      setTxnForm({ itemId:'', qty:'', note:'', ref:'' })
      const item = items.find(i => i.id === txnForm.itemId)
      toast.success(`✅ Stock adjusted to ${txn.balAfter} ${item?.unit||''}`, { duration:5000 })
    } catch (err: any) { toast.error(err.message||'Adjustment failed') }
    setSaving(false)
  }

  async function openItemDetail(item: any) {
    setViewItem(item); setTxnLoading(true)
    try {
      const data = await fetch(`/api/inventory/transactions?itemId=${item.id}&limit=50`).then(r => r.json())
      setItemTxns(Array.isArray(data) ? data : [])
    } catch { setItemTxns([]) }
    setTxnLoading(false)
  }

  function openEdit(item: any) {
    setItemForm({ name:item.name, category:item.category, unit:item.unit, isDecimal:item.isDecimal, hsnCode:item.hsnCode||'', gstPct:String(item.gstPct), saleRate:String(item.saleRate), currentQty:String(item.currentQty), minQty:String(item.minQty) })
    setEditItem(item); setShowItemModal(true)
  }

  const filteredItems  = catFilter==='ALL' ? items : items.filter(i => i.category===catFilter)
  const lowStockItems  = items.filter(i => i.currentQty <= i.minQty && i.currentQty > 0)
  const emptyItems     = items.filter(i => i.currentQty <= 0)
  const selectedItem   = items.find(i => i.id === txnForm.itemId)

  const tabStyle = (t: string) => ({
    padding:'6px 16px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12,
    fontWeight:tab===t?700:400, background:tab===t?'#3b82f6':'transparent',
    color:tab===t?'#fff':'#8892a4', transition:'all .15s',
  })

  return (
    <PageShell title="📦 Inventory Management">
      <div className="animate-in">

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, padding:4, background:'#1e2535', borderRadius:10, marginBottom:20, width:'fit-content', flexWrap:'wrap' }}>
          {TABS.map(t => <button key={t} onClick={()=>setTab(t)} style={tabStyle(t)}>{t}</button>)}
        </div>

        {/* Alerts */}
        {(lowStockItems.length > 0 || emptyItems.length > 0) && (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
            {emptyItems.length > 0 && (
              <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#ef4444' }}>🚨 Empty Stock ({emptyItems.length})</span>
                {emptyItems.map(i => <span key={i.id} style={{ fontSize:11, background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', borderRadius:6, padding:'2px 10px', color:'#ef4444' }}>{CAT_ICON[i.category]||'📦'} {i.name}</span>)}
              </div>
            )}
            {lowStockItems.length > 0 && (
              <div style={{ background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.25)', borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>⚠️ Low Stock ({lowStockItems.length})</span>
                {lowStockItems.map(i => <span key={i.id} style={{ fontSize:11, background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.3)', borderRadius:6, padding:'2px 10px', color:'#f59e0b' }}>{CAT_ICON[i.category]||'📦'} {i.name}: <strong>{i.currentQty}</strong> {i.unit}</span>)}
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab==='Dashboard' && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              <StatCard label="Total Items"  value={items.length}         icon="📦" color="blue" />
              <StatCard label="Low Stock"    value={lowStockItems.length} icon="⚠️" color="yellow" />
              <StatCard label="Empty"        value={emptyItems.length}    icon="🚨" color="red" />
              <StatCard label="Categories"   value={CATEGORIES.length}    icon="🗂️" color="green" />
            </div>

            {/* Category filter */}
            <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
              {['ALL',...CATEGORIES].map(c => (
                <button key={c} onClick={()=>setCatFilter(c)}
                  style={{ padding:'4px 14px', borderRadius:20, border:`1px solid ${catFilter===c?(CAT_COLOR[c]||'#3b82f6'):'#2a3348'}`, background:catFilter===c?`${CAT_COLOR[c]||'#3b82f6'}20`:'#1e2535', color:catFilter===c?(CAT_COLOR[c]||'#3b82f6'):'#8892a4', fontSize:11, cursor:'pointer', fontWeight:catFilter===c?700:400 }}>
                  {c==='ALL'?'All':`${CAT_ICON[c]||''} ${c}`}
                </button>
              ))}
            </div>

            {loading ? <Loading /> : filteredItems.length===0 ? <Empty message="No items yet. Go to Item Master to add." /> : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
                {filteredItems.map(item => {
                  const st  = stockStatus(item)
                  const pct = Math.min(100, item.minQty > 0 ? Math.round((item.currentQty/(item.minQty*4))*100) : 100)
                  return (
                    <div key={item.id} onClick={()=>openItemDetail(item)}
                      style={{ background:'#1e2535', border:`1px solid ${st.color}30`, borderRadius:12, padding:16, cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.borderColor=`${st.color}70`)}
                      onMouseLeave={e=>(e.currentTarget.style.borderColor=`${st.color}30`)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div>
                          <div style={{ fontSize:10, color:'#8892a4', marginBottom:2 }}>{CAT_ICON[item.category]||'📦'} {item.category}</div>
                          <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>{item.name}</div>
                        </div>
                        <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:st.bg, color:st.color }}>{st.label}</span>
                      </div>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:10, color:'#8892a4' }}>Stock</span>
                          <span style={{ fontSize:14, fontWeight:800, color:st.color }}>{item.currentQty} <span style={{ fontSize:10, fontWeight:400 }}>{item.unit}</span></span>
                        </div>
                        <div style={{ height:6, background:'#252d40', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:st.color, borderRadius:3 }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                          <span style={{ fontSize:9, color:'#8892a4' }}>Min: {item.minQty} {item.unit}</span>
                          {item.currentQty <= item.minQty && <span style={{ fontSize:9, color:'#ef4444', fontWeight:700 }}>Need {Math.max(0,item.minQty-item.currentQty).toFixed(item.isDecimal?2:0)} more</span>}
                        </div>
                      </div>
                      <div style={{ fontSize:10, color:'#8892a4' }}>{formatCurrency(item.saleRate)}/{item.unit} · {item.isDecimal?'Decimal':'Whole'}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ITEM MASTER ── */}
        {tab==='Item Master' && (
          <Card>
            <CardHeader>
              <CardTitle>Item Master ({items.length})</CardTitle>
              <Button variant="primary" onClick={()=>{ setItemForm({...defaultItem}); setEditItem(null); setShowItemModal(true) }}>+ Add Item</Button>
            </CardHeader>
            {loading ? <Loading /> : items.length===0 ? <Empty message="No items yet." /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr>
                    <th>Category</th><th>Item Name</th><th>Unit</th><th>Type</th>
                    <th>GST%</th><th>Sale Rate</th><th>Stock</th><th>Min</th><th>Status</th><th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {items.map(item => {
                      const st = stockStatus(item)
                      return (
                        <tr key={item.id}>
                          <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${CAT_COLOR[item.category]||'#6b7280'}18`, color:CAT_COLOR[item.category]||'#6b7280', fontWeight:700 }}>{CAT_ICON[item.category]||'📦'} {item.category}</span></td>
                          <td style={{ fontWeight:600 }}>{item.name}</td>
                          <td style={{ color:'#8892a4' }}>{item.unit}</td>
                          <td><span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:item.isDecimal?'rgba(139,92,246,.1)':'rgba(16,185,129,.1)', color:item.isDecimal?'#8b5cf6':'#10b981', fontWeight:600 }}>{item.isDecimal?'Decimal':'Whole'}</span></td>
                          <td style={{ color:'#8892a4' }}>{item.gstPct}%</td>
                          <td style={{ color:'#10b981', fontWeight:600 }}>{formatCurrency(item.saleRate)}</td>
                          <td style={{ fontWeight:800, color:st.color }}>{item.currentQty} {item.unit}</td>
                          <td style={{ color:'#8892a4' }}>{item.minQty} {item.unit}</td>
                          <td><span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span></td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={()=>openItemDetail(item)} style={{ padding:'3px 8px', background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:6, color:'#3b82f6', fontSize:10, cursor:'pointer', fontWeight:600 }}>👁</button>
                              <button onClick={()=>openEdit(item)} style={{ padding:'3px 8px', background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', borderRadius:6, color:'#10b981', fontSize:10, cursor:'pointer', fontWeight:600 }}>✏️</button>
                              <button onClick={()=>setDeleteTarget(item)} style={{ padding:'3px 8px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#ef4444', fontSize:10, cursor:'pointer', fontWeight:600 }}>🗑️</button>
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
        )}

        {/* ── ADD STOCK ── */}
        {tab==='Add Stock' && (
          <div style={{ maxWidth:560 }}>
            <Card>
              <CardHeader><CardTitle>🟢 Add Stock (Inward)</CardTitle></CardHeader>
              <div style={{ padding:20 }}>
                <div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:12, color:'#10b981' }}>
                  Use when stock arrives — rolls received, ink purchased, sheets delivered, etc.
                </div>
                <FormGroup label="Item *">
                  <Select value={txnForm.itemId} onChange={e=>tf('itemId',e.target.value)}>
                    <option value="">Select Item...</option>
                    {CATEGORIES.map(cat => {
                      const catItems = items.filter(i=>i.category===cat)
                      if (!catItems.length) return null
                      return (
                        <optgroup key={cat} label={`${CAT_ICON[cat]||'📦'} ${cat}`}>
                          {catItems.map(i=><option key={i.id} value={i.id}>{i.name} — {i.currentQty} {i.unit}</option>)}
                        </optgroup>
                      )
                    })}
                  </Select>
                </FormGroup>
                {selectedItem && (
                  <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:12, marginBottom:14 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                      {[['Category',selectedItem.category,CAT_COLOR[selectedItem.category]||'#8892a4'],
                        ['Current',`${selectedItem.currentQty} ${selectedItem.unit}`,stockStatus(selectedItem).color],
                        ['Min Level',`${selectedItem.minQty} ${selectedItem.unit}`,'#8892a4']
                      ].map(([l,v,c])=>(
                        <div key={l} style={{ background:'#252d40', borderRadius:7, padding:'8px' }}>
                          <div style={{ fontSize:9, color:'#8892a4', marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:String(c) }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Grid cols={2} gap={12}>
                  <FormGroup label={`Qty (${selectedItem?.unit||'units'}) *`}>
                    <Input type="number" step={selectedItem?.isDecimal?'0.01':'1'} min="0.01" value={txnForm.qty} onChange={e=>tf('qty',e.target.value)} placeholder={selectedItem?.isDecimal?'e.g. 2.5':'e.g. 5'} style={{ fontSize:18, fontWeight:800, color:'#10b981' }} />
                  </FormGroup>
                  <FormGroup label="Reference (PO/Bill)">
                    <Input value={txnForm.ref} onChange={e=>tf('ref',e.target.value)} placeholder="e.g. PO-001" />
                  </FormGroup>
                </Grid>
                <FormGroup label="Note (optional)">
                  <Input value={txnForm.note} onChange={e=>tf('note',e.target.value)} placeholder="e.g. Purchased from XYZ" />
                </FormGroup>
                {txnForm.itemId && txnForm.qty && parseFloat(txnForm.qty)>0 && (
                  <div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.3)', borderRadius:8, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#8892a4' }}>Balance after adding</span>
                    <span style={{ fontSize:18, fontWeight:800, color:'#10b981' }}>{((selectedItem?.currentQty||0)+parseFloat(txnForm.qty||'0')).toFixed(selectedItem?.isDecimal?2:0)} {selectedItem?.unit}</span>
                  </div>
                )}
                <button onClick={()=>handleTransaction('ADD')} disabled={saving||!txnForm.itemId||!txnForm.qty}
                  style={{ width:'100%', padding:'14px', background:saving||!txnForm.itemId||!txnForm.qty?'#252d40':'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:10, color:saving||!txnForm.itemId||!txnForm.qty?'#4a5568':'#fff', fontSize:15, fontWeight:800, cursor:saving||!txnForm.itemId||!txnForm.qty?'not-allowed':'pointer' }}>
                  {saving?'⏳ Adding...':'✅ Add Stock'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ── USE STOCK ── */}
        {tab==='Use Stock' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:900 }}>
            <Card>
              <CardHeader><CardTitle>🔴 Use Stock</CardTitle></CardHeader>
              <div style={{ padding:20 }}>
                <FormGroup label="Item *">
                  <Select value={txnForm.itemId} onChange={e=>tf('itemId',e.target.value)}>
                    <option value="">Select Item...</option>
                    {items.filter(i=>i.currentQty>0).map(i=>(
                      <option key={i.id} value={i.id}>{CAT_ICON[i.category]||'📦'} {i.name} — {i.currentQty} {i.unit}</option>
                    ))}
                  </Select>
                </FormGroup>
                {selectedItem && (
                  <div style={{ background:'#1e2535', border:`1px solid ${stockStatus(selectedItem).color}30`, borderRadius:8, padding:10, marginBottom:12, textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'#8892a4', marginBottom:2 }}>Available</div>
                    <div style={{ fontSize:22, fontWeight:900, color:stockStatus(selectedItem).color }}>{selectedItem.currentQty} <span style={{ fontSize:13, fontWeight:400 }}>{selectedItem.unit}</span></div>
                  </div>
                )}
                <FormGroup label={`Qty to Use (${selectedItem?.unit||'units'}) *`}>
                  <Input type="number" step={selectedItem?.isDecimal?'0.01':'1'} min="0.01" max={selectedItem?.currentQty||999} value={txnForm.qty} onChange={e=>tf('qty',e.target.value)} style={{ fontSize:18, fontWeight:800, color:'#ef4444' }} />
                </FormGroup>
                <FormGroup label="Note"><Input value={txnForm.note} onChange={e=>tf('note',e.target.value)} placeholder="e.g. Used for ORD-2026-0012" /></FormGroup>
                {txnForm.itemId && txnForm.qty && parseFloat(txnForm.qty)>0 && (
                  <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'#8892a4' }}>Balance after use</span>
                    <span style={{ fontSize:16, fontWeight:800, color:((selectedItem?.currentQty||0)-parseFloat(txnForm.qty||'0'))<0?'#ef4444':'#f59e0b' }}>
                      {Math.max(0,(selectedItem?.currentQty||0)-parseFloat(txnForm.qty||'0')).toFixed(selectedItem?.isDecimal?2:0)} {selectedItem?.unit}
                    </span>
                  </div>
                )}
                <button onClick={()=>handleTransaction('USE')} disabled={saving||!txnForm.itemId||!txnForm.qty}
                  style={{ width:'100%', padding:'14px', background:saving||!txnForm.itemId||!txnForm.qty?'#252d40':'linear-gradient(135deg,#ef4444,#dc2626)', border:'none', borderRadius:10, color:saving||!txnForm.itemId||!txnForm.qty?'#4a5568':'#fff', fontSize:15, fontWeight:800, cursor:saving||!txnForm.itemId||!txnForm.qty?'not-allowed':'pointer' }}>
                  {saving?'⏳ Processing...':'🔴 Use Stock'}
                </button>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>🟡 Adjust Stock</CardTitle></CardHeader>
              <div style={{ padding:20 }}>
                <div style={{ background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#f59e0b' }}>
                  Manual correction after physical count or damage write-off.
                </div>
                <FormGroup label="Item *">
                  <Select value={txnForm.itemId} onChange={e=>tf('itemId',e.target.value)}>
                    <option value="">Select Item...</option>
                    {items.map(i=><option key={i.id} value={i.id}>{CAT_ICON[i.category]||'📦'} {i.name} — {i.currentQty} {i.unit}</option>)}
                  </Select>
                </FormGroup>
                {selectedItem && (
                  <div style={{ background:'#1e2535', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, padding:10, marginBottom:12, textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'#8892a4', marginBottom:2 }}>System Stock</div>
                    <div style={{ fontSize:22, fontWeight:900, color:'#f59e0b' }}>{selectedItem.currentQty} <span style={{ fontSize:13, fontWeight:400 }}>{selectedItem.unit}</span></div>
                  </div>
                )}
                <FormGroup label="Actual Physical Count *">
                  <Input type="number" step={selectedItem?.isDecimal?'0.01':'1'} min="0" value={txnForm.qty} onChange={e=>tf('qty',e.target.value)} style={{ fontSize:16, fontWeight:700, color:'#f59e0b' }} />
                </FormGroup>
                {txnForm.itemId && txnForm.qty!=='' && (
                  <div style={{ background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, color:'#8892a4' }}>Difference</span>
                      <span style={{ fontSize:14, fontWeight:800, color:parseFloat(txnForm.qty||'0')-(selectedItem?.currentQty||0)>=0?'#10b981':'#ef4444' }}>
                        {parseFloat(txnForm.qty||'0')-(selectedItem?.currentQty||0)>=0?'+':''}{(parseFloat(txnForm.qty||'0')-(selectedItem?.currentQty||0)).toFixed(selectedItem?.isDecimal?2:0)} {selectedItem?.unit}
                      </span>
                    </div>
                  </div>
                )}
                <FormGroup label="Reason *"><Input value={txnForm.note} onChange={e=>tf('note',e.target.value)} placeholder="e.g. Physical count mismatch, damage" required /></FormGroup>
                <button onClick={handleAdjust} disabled={saving||!txnForm.itemId||txnForm.qty===''}
                  style={{ width:'100%', padding:'14px', background:saving||!txnForm.itemId||txnForm.qty===''?'#252d40':'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', borderRadius:10, color:saving||!txnForm.itemId||txnForm.qty===''?'#4a5568':'#fff', fontSize:15, fontWeight:800, cursor:saving||!txnForm.itemId||txnForm.qty===''?'not-allowed':'pointer' }}>
                  {saving?'⏳ Adjusting...':'🟡 Set Correct Stock'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ── VENDORS ── */}
        {tab==='Vendors' && (
          <Card>
            <CardHeader>
              <CardTitle>Vendors / Dealers ({vendors.length})</CardTitle>
              <Button variant="primary" onClick={()=>{setVendorForm({name:'',mobile:'',email:'',address:'',gstNo:'',notes:''});setEditVendor(null);setShowVendorModal(true)}}>+ Add Vendor</Button>
            </CardHeader>
            {vendors.length===0 ? <Empty message="No vendors yet. Add your first vendor." /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr><th>Vendor Name</th><th>Mobile</th><th>Email</th><th>GST No.</th><th>Total Purchases</th><th>Address</th><th>Actions</th></tr></thead>
                  <tbody>
                    {vendors.map(v => {
                      const total = (v.purchases||[]).reduce((s:number,p:any)=>s+(p.totalAmount||0),0)
                      const paid  = (v.purchases||[]).reduce((s:number,p:any)=>s+(p.paidAmount||0),0)
                      return (
                        <tr key={v.id}>
                          <td style={{ fontWeight:700 }}>{v.name}</td>
                          <td style={{ color:'#3b82f6' }}>{v.mobile||'—'}</td>
                          <td style={{ color:'#8892a4', fontSize:11 }}>{v.email||'—'}</td>
                          <td style={{ fontFamily:'monospace', fontSize:11, color:'#8892a4' }}>{v.gstNo||'—'}</td>
                          <td>
                            <div style={{ fontSize:12 }}>
                              <span style={{ color:'#10b981', fontWeight:700 }}>{formatCurrency(total)}</span>
                              {paid < total && <span style={{ color:'#f59e0b', fontSize:10, marginLeft:6 }}>Due: {formatCurrency(total-paid)}</span>}
                            </div>
                            <div style={{ fontSize:10, color:'#8892a4' }}>{(v.purchases||[]).length} purchase{(v.purchases||[]).length!==1?'s':''}</div>
                          </td>
                          <td style={{ fontSize:11, color:'#8892a4' }}>{v.address||'—'}</td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button onClick={()=>{setVendorForm({name:v.name,mobile:v.mobile||'',email:v.email||'',address:v.address||'',gstNo:v.gstNo||'',notes:v.notes||''});setEditVendor(v);setShowVendorModal(true)}}
                                style={{ padding:'3px 8px', background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', borderRadius:6, color:'#10b981', fontSize:10, cursor:'pointer', fontWeight:600 }}>✏️ Edit</button>
                              <button onClick={()=>setDeleteVendor(v)}
                                style={{ padding:'3px 8px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#ef4444', fontSize:10, cursor:'pointer', fontWeight:600 }}>🗑️</button>
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
        )}

        {/* ── PURCHASES ── */}
        {tab==='Purchases' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0' }}>Purchase Records ({purchases.length})</div>
              <Button variant="primary" onClick={()=>{setPurchaseLines([{itemId:'',qty:'',rate:'',amount:0}]);setPurchaseForm({vendorId:'',billNo:'',billDate:new Date().toISOString().slice(0,10),paidAmount:'',notes:''});setShowPurchaseModal(true)}}>+ Record Purchase</Button>
            </div>
            {purchases.length===0 ? <Empty message="No purchases yet. Record your first purchase." /> : (
              <Card>
                <div style={{ overflowX:'auto' }}>
                  <table>
                    <thead><tr><th>Date</th><th>Vendor</th><th>Bill No.</th><th>Items</th><th>Total</th><th>Paid</th><th>Due</th><th>Actions</th></tr></thead>
                    <tbody>
                      {purchases.map(p => {
                        const due = (p.totalAmount||0) - (p.paidAmount||0)
                        return (
                          <tr key={p.id}>
                            <td style={{ color:'#8892a4', fontSize:11, whiteSpace:'nowrap' }}>
                              {new Date(p.billDate||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                            </td>
                            <td style={{ fontWeight:700 }}>{p.vendor?.name}</td>
                            <td style={{ fontFamily:'monospace', fontSize:11, color:'#3b82f6' }}>{p.billNo||'—'}</td>
                            <td>
                              <div style={{ fontSize:11 }}>
                                {(p.items||[]).slice(0,2).map((it:any) => (
                                  <div key={it.id} style={{ color:'#8892a4' }}>{it.item?.name} × {it.qty} {it.item?.unit}</div>
                                ))}
                                {(p.items||[]).length > 2 && <div style={{ color:'#3b82f6', fontSize:10 }}>+{(p.items||[]).length-2} more</div>}
                              </div>
                            </td>
                            <td style={{ color:'#e2e8f0', fontWeight:700 }}>{formatCurrency(p.totalAmount)}</td>
                            <td style={{ color:'#10b981', fontWeight:600 }}>{formatCurrency(p.paidAmount)}</td>
                            <td style={{ color:due>0?'#ef4444':'#10b981', fontWeight:due>0?700:400 }}>{due>0?formatCurrency(due):'✅ Paid'}</td>
                            <td>
                              <button onClick={()=>setViewPurchase(p)}
                                style={{ padding:'3px 8px', background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:6, color:'#3b82f6', fontSize:10, cursor:'pointer', fontWeight:600 }}>👁 View</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── STOCK LEDGER ── */}
        {tab==='Stock Ledger' && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Transaction Ledger</CardTitle>
              <div style={{ display:'flex', gap:8 }}>
                <Select style={{ width:200 }} value={ledgerItem} onChange={e=>setLedgerItem(e.target.value)}>
                  <option value="">All Items</option>
                  {items.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
                <Select style={{ width:120 }} value={ledgerType} onChange={e=>setLedgerType(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="ADD">▲ ADD (In)</option>
                  <option value="USE">▼ USE (Out)</option>
                </Select>
                <Button onClick={fetchTxns}>Filter</Button>
              </div>
            </CardHeader>
            {txns.length===0 ? <Empty message="No transactions yet. Add or use stock to see history." /> : (
              <div style={{ overflowX:'auto' }}>
                <table>
                  <thead><tr>
                    <th>Date & Time</th><th>Item</th><th>Category</th>
                    <th>Type</th><th>Qty Change</th><th>Balance After</th><th>Reference</th><th>Note</th>
                  </tr></thead>
                  <tbody>
                    {txns.map(t => {
                      const catColor = CAT_COLOR[items.find(i=>i.id===t.itemId)?.category||'OTHER']||'#6b7280'
                      return (
                        <tr key={t.id}>
                          <td style={{ color:'#8892a4', fontSize:11, whiteSpace:'nowrap' }}>
                            {new Date(t.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} {new Date(t.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                          </td>
                          <td style={{ fontWeight:600 }}>{t.item?.name}</td>
                          <td><span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:`${catColor}18`, color:catColor, fontWeight:700 }}>{items.find(i=>i.id===t.itemId)?.category||'—'}</span></td>
                          <td>
                            <span style={{ fontSize:11, padding:'2px 10px', borderRadius:20, fontWeight:700, background:t.type==='ADD'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)', color:t.type==='ADD'?'#10b981':'#ef4444' }}>
                              {t.type==='ADD'?'▲ IN':'▼ OUT'}
                            </span>
                          </td>
                          <td style={{ fontWeight:800, color:t.qty>=0?'#10b981':'#ef4444' }}>{t.qty>=0?'+':''}{t.qty} {t.item?.unit}</td>
                          <td style={{ fontWeight:700, color:'#3b82f6' }}>{t.balAfter} {t.item?.unit}</td>
                          <td style={{ fontSize:11, color:'#8892a4', fontFamily:'monospace' }}>{t.ref||'—'}</td>
                          <td style={{ fontSize:11, color:'#8892a4', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note||'—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── ADD/EDIT ITEM MODAL ── */}
      <Modal open={showItemModal} onClose={()=>{setShowItemModal(false);setEditItem(null);setItemForm({...defaultItem})}}
        title={editItem?`✏️ Edit — ${editItem.name}`:'➕ Add Inventory Item'} width={560}
        footer={<><Button onClick={()=>{setShowItemModal(false);setEditItem(null);setItemForm({...defaultItem})}}>Cancel</Button><Button variant="primary" onClick={handleSaveItem} disabled={saving}>{saving?'Saving...':editItem?'💾 Update':'💾 Add Item'}</Button></>}>
        <form onSubmit={handleSaveItem}>
          <FormGroup label="Item Name *">
            <Input value={itemForm.name} onChange={e=>if_('name',e.target.value)} placeholder="e.g. DigiRED 10ft Flex, Cyan Ink, Sunboard 3mm" required />
          </FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Category *">
              <Select value={itemForm.category} onChange={e=>if_('category',e.target.value)}>
                {CATEGORIES.map(c=><option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Unit *">
              <Select value={itemForm.unit} onChange={e=>if_('unit',e.target.value)}>
                {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
              </Select>
            </FormGroup>
          </Grid>
          <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', marginBottom:3 }}>Allow Decimal Quantities?</div>
                <div style={{ fontSize:11, color:'#8892a4' }}>{itemForm.isDecimal?'✅ Yes (Flex=2.5 Roll, Ink=0.75 Litre)':'❌ No — whole numbers only (Sheets, Pieces)'}</div>
              </div>
              <div style={{ display:'flex', background:'#252d40', borderRadius:8, overflow:'hidden', border:'1px solid #2a3348' }}>
                <button type="button" onClick={()=>if_('isDecimal',true)} style={{ padding:'7px 16px', fontSize:12, cursor:'pointer', fontWeight:itemForm.isDecimal?700:400, background:itemForm.isDecimal?'#8b5cf6':'transparent', color:itemForm.isDecimal?'#fff':'#8892a4', border:'none' }}>Decimal</button>
                <button type="button" onClick={()=>if_('isDecimal',false)} style={{ padding:'7px 16px', fontSize:12, cursor:'pointer', fontWeight:!itemForm.isDecimal?700:400, background:!itemForm.isDecimal?'#10b981':'transparent', color:!itemForm.isDecimal?'#fff':'#8892a4', border:'none' }}>Whole</button>
              </div>
            </div>
          </div>
          <Grid cols={3} gap={12}>
            <FormGroup label="HSN Code"><Input value={itemForm.hsnCode} onChange={e=>if_('hsnCode',e.target.value)} placeholder="Optional" /></FormGroup>
            <FormGroup label="GST %">
              <Select value={itemForm.gstPct} onChange={e=>if_('gstPct',e.target.value)}>
                {['0','5','12','18','28'].map(g=><option key={g} value={g}>{g}%</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Sale Rate (₹)"><Input type="number" step="0.01" value={itemForm.saleRate} onChange={e=>if_('saleRate',e.target.value)} placeholder="0.00" /></FormGroup>
          </Grid>
          <Grid cols={2} gap={12}>
            <FormGroup label={`Opening Stock (${itemForm.unit})`}>
              <Input type="number" step={itemForm.isDecimal?'0.01':'1'} min="0" value={itemForm.currentQty} onChange={e=>if_('currentQty',e.target.value)} />
            </FormGroup>
            <FormGroup label={`Min Stock Level (${itemForm.unit})`}>
              <Input type="number" step={itemForm.isDecimal?'0.01':'1'} min="0" value={itemForm.minQty} onChange={e=>if_('minQty',e.target.value)} />
            </FormGroup>
          </Grid>
        </form>
      </Modal>

      {/* ── ITEM DETAIL MODAL ── */}
      <Modal open={!!viewItem} onClose={()=>{setViewItem(null);setItemTxns([])}}
        title={`📦 ${viewItem?.name}`} width={660}
        footer={
          <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{setViewItem(null);setItemTxns([]);setTxnForm(p=>({...p,itemId:viewItem.id}));setTab('Add Stock')}} style={{ padding:'6px 14px', background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.4)', borderRadius:8, color:'#10b981', fontSize:12, fontWeight:700, cursor:'pointer' }}>✅ Add Stock</button>
              <button onClick={()=>{setViewItem(null);setItemTxns([]);setTxnForm(p=>({...p,itemId:viewItem.id}));setTab('Use Stock')}} style={{ padding:'6px 14px', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.4)', borderRadius:8, color:'#ef4444', fontSize:12, fontWeight:700, cursor:'pointer' }}>🔴 Use Stock</button>
            </div>
            <Button onClick={()=>{setViewItem(null);setItemTxns([])}}>Close</Button>
          </div>
        }>
        {viewItem && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              {[['Category',`${CAT_ICON[viewItem.category]||'📦'} ${viewItem.category}`,CAT_COLOR[viewItem.category]||'#6b7280'],
                ['Stock',`${viewItem.currentQty} ${viewItem.unit}`,stockStatus(viewItem).color],
                ['Min Level',`${viewItem.minQty} ${viewItem.unit}`,'#8892a4'],
                ['Status',stockStatus(viewItem).label,stockStatus(viewItem).color],
              ].map(([l,v,c])=>(
                <div key={l} style={{ background:'#1e2535', border:`1px solid ${String(c)}30`, borderRadius:10, padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#8892a4', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:String(c) }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>Transaction History</div>
            {txnLoading ? <Loading /> : itemTxns.length===0 ? <Empty message="No transactions yet." /> : (
              <div style={{ maxHeight:280, overflowY:'auto', border:'1px solid #2a3348', borderRadius:8 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead><tr style={{ background:'#252d40' }}>
                    {['Date','Type','Qty','Balance','Note'].map(h=>(
                      <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'#8892a4', fontWeight:600 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {itemTxns.map((t,idx)=>(
                      <tr key={t.id} style={{ borderBottom:'1px solid #2a3348', background:idx%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                        <td style={{ padding:'6px 10px', color:'#8892a4', whiteSpace:'nowrap' }}>{new Date(t.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})} {new Date(t.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</td>
                        <td style={{ padding:'6px 10px' }}><span style={{ fontSize:10, padding:'1px 8px', borderRadius:10, fontWeight:700, background:t.type==='ADD'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)', color:t.type==='ADD'?'#10b981':'#ef4444' }}>{t.type==='ADD'?'▲ IN':'▼ OUT'}</span></td>
                        <td style={{ padding:'6px 10px', fontWeight:700, color:t.qty>=0?'#10b981':'#ef4444' }}>{t.qty>=0?'+':''}{t.qty} {viewItem.unit}</td>
                        <td style={{ padding:'6px 10px', fontWeight:700, color:'#3b82f6' }}>{t.balAfter} {viewItem.unit}</td>
                        <td style={{ padding:'6px 10px', color:'#8892a4', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.note||'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── DELETE ── */}
      <Modal open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} title="🗑️ Delete Item"
        footer={<><Button onClick={()=>setDeleteTarget(null)}>Cancel</Button>
          <button onClick={handleDelete} disabled={deleting} style={{ padding:'8px 18px', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, color:'#ef4444', fontSize:13, fontWeight:700, cursor:'pointer' }}>{deleting?'Deleting...':'🗑️ Yes, Delete'}</button></>}>
        {deleteTarget && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:8 }}>Delete "{deleteTarget.name}"?</div>
            <div style={{ fontSize:11, color:'#ef4444', background:'rgba(239,68,68,.08)', borderRadius:8, padding:'8px 14px' }}>All transaction history will also be deleted.</div>
          </div>
        )}
      </Modal>
      {/* ── VENDOR MODAL ── */}
      <Modal open={showVendorModal||!!editVendor} onClose={()=>{setShowVendorModal(false);setEditVendor(null);setVendorForm({name:'',mobile:'',email:'',address:'',gstNo:'',notes:''})}}
        title={editVendor?`✏️ Edit — ${editVendor.name}`:'➕ Add Vendor'} width={520}
        footer={<><Button onClick={()=>{setShowVendorModal(false);setEditVendor(null)}}>Cancel</Button><Button variant="primary" onClick={handleSaveVendor} disabled={saving}>{saving?'Saving...':editVendor?'💾 Update':'💾 Add Vendor'}</Button></>}>
        <form onSubmit={handleSaveVendor}>
          <FormGroup label="Vendor / Dealer Name *"><Input value={vendorForm.name} onChange={e=>vf('name',e.target.value)} placeholder="e.g. Raj Flex Suppliers" required /></FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Mobile"><Input value={vendorForm.mobile} onChange={e=>vf('mobile',e.target.value)} placeholder="98XXXXXXXX" /></FormGroup>
            <FormGroup label="Email"><Input type="email" value={vendorForm.email} onChange={e=>vf('email',e.target.value)} placeholder="Optional" /></FormGroup>
            <FormGroup label="GST No."><Input value={vendorForm.gstNo} onChange={e=>vf('gstNo',e.target.value)} placeholder="09XXXXX1234Z1ZX" /></FormGroup>
            <FormGroup label="Address"><Input value={vendorForm.address} onChange={e=>vf('address',e.target.value)} placeholder="City, State" /></FormGroup>
          </Grid>
          <FormGroup label="Notes"><Input value={vendorForm.notes} onChange={e=>vf('notes',e.target.value)} placeholder="e.g. Supplies Star Flex and Black Back" /></FormGroup>
        </form>
      </Modal>

      {/* ── DELETE VENDOR ── */}
      <Modal open={!!deleteVendor} onClose={()=>setDeleteVendor(null)} title="Remove Vendor"
        footer={<><Button onClick={()=>setDeleteVendor(null)}>Cancel</Button><button onClick={handleDeleteVendor} disabled={deletingVendor} style={{ padding:'8px 18px', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, color:'#ef4444', fontSize:13, fontWeight:700, cursor:'pointer' }}>{deletingVendor?'Removing...':'🗑️ Remove'}</button></>}>
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0' }}>Remove "{deleteVendor?.name}"?</div>
          <div style={{ fontSize:12, color:'#8892a4', marginTop:8 }}>Purchase history will be preserved.</div>
        </div>
      </Modal>

      {/* ── RECORD PURCHASE MODAL ── */}
      <Modal open={showPurchaseModal} onClose={()=>setShowPurchaseModal(false)} title="📦 Record Purchase" width={700}
        footer={<><Button onClick={()=>setShowPurchaseModal(false)}>Cancel</Button><Button variant="primary" onClick={handleSavePurchase} disabled={savingPurchase}>{savingPurchase?'Saving...':'💾 Save & Update Stock'}</Button></>}>
        <form onSubmit={handleSavePurchase}>
          <Grid cols={2} gap={12}>
            <FormGroup label="Vendor / Dealer *">
              <Select value={purchaseForm.vendorId} onChange={e=>pf('vendorId',e.target.value)} required>
                <option value="">Select Vendor...</option>
                {vendors.map(v=><option key={v.id} value={v.id}>{v.name}{v.mobile?` — ${v.mobile}`:''}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Bill / Invoice No.">
              <Input value={purchaseForm.billNo} onChange={e=>pf('billNo',e.target.value)} placeholder="e.g. INV-2026-001" />
            </FormGroup>
            <FormGroup label="Bill Date *">
              <Input type="date" value={purchaseForm.billDate} onChange={e=>pf('billDate',e.target.value)} required />
            </FormGroup>
            <FormGroup label="Amount Paid ₹">
              <Input type="number" step="0.01" value={purchaseForm.paidAmount} onChange={e=>pf('paidAmount',e.target.value)} placeholder="0.00" />
            </FormGroup>
          </Grid>

          {/* Line items */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:10 }}>Items Purchased</div>
            {purchaseLines.map((line, idx) => (
              <div key={idx} style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:12, marginBottom:8 }}>
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr auto', gap:8, alignItems:'end' }}>
                  <div>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase' }}>Item *</div>
                    <Select value={line.itemId} onChange={e=>updateLine(idx,'itemId',e.target.value)}>
                      <option value="">Select Item...</option>
                      {CATEGORIES.map(cat=>{
                        const catItems=items.filter(i=>i.category===cat)
                        if(!catItems.length)return null
                        return(<optgroup key={cat} label={`${CAT_ICON[cat]||'📦'} ${cat}`}>{catItems.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>)
                      })}
                    </Select>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase' }}>Qty {line.itemId?`(${items.find(i=>i.id===line.itemId)?.unit||''})`:''}</div>
                    <Input type="number" step="0.01" min="0.01" value={line.qty} onChange={e=>updateLine(idx,'qty',e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase' }}>Rate ₹</div>
                    <Input type="number" step="0.01" min="0.01" value={line.rate} onChange={e=>updateLine(idx,'rate',e.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase' }}>Amount</div>
                    <div style={{ padding:'8px 10px', background:'#252d40', borderRadius:8, fontSize:13, fontWeight:700, color:'#f59e0b' }}>{formatCurrency(line.amount||0)}</div>
                  </div>
                  <button type="button" onClick={()=>setPurchaseLines(p=>p.length>1?p.filter((_,i)=>i!==idx):p)}
                    style={{ padding:'8px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#ef4444', cursor:'pointer', fontSize:12, marginBottom:2 }}>✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={()=>setPurchaseLines(p=>[...p,{itemId:'',qty:'',rate:'',amount:0}])}
              style={{ width:'100%', padding:'8px', background:'rgba(59,130,246,.08)', border:'1px dashed rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:12, cursor:'pointer', fontWeight:600 }}>
              ＋ Add Another Item
            </button>
          </div>

          <FormGroup label="Notes (optional)"><Input value={purchaseForm.notes} onChange={e=>pf('notes',e.target.value)} placeholder="e.g. Good quality flex" /></FormGroup>

          {purchaseTotal > 0 && (
            <div style={{ background:'#1e2535', borderRadius:8, padding:'12px 16px', border:'1px solid #2a3348', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              {[['Total Amount', formatCurrency(purchaseTotal), '#e2e8f0'],
                ['Paid',         formatCurrency(parseFloat(purchaseForm.paidAmount||'0')), '#10b981'],
                ['Due',          formatCurrency(Math.max(0,purchaseTotal-parseFloat(purchaseForm.paidAmount||'0'))), purchaseTotal-parseFloat(purchaseForm.paidAmount||'0')>0?'#ef4444':'#10b981']
              ].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, color:'#8892a4', marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:String(c) }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.15)', borderRadius:8, fontSize:11, color:'#10b981' }}>
            💡 Stock will be automatically updated for all items when you save this purchase.
          </div>
        </form>
      </Modal>

      {/* ── VIEW PURCHASE MODAL ── */}
      <Modal open={!!viewPurchase} onClose={()=>setViewPurchase(null)} title={`📦 Purchase — ${viewPurchase?.vendor?.name}`} width={580}
        footer={<Button onClick={()=>setViewPurchase(null)}>Close</Button>}>
        {viewPurchase && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              {[['Vendor', viewPurchase.vendor?.name, '#3b82f6'],
                ['Bill No', viewPurchase.billNo||'—', '#8892a4'],
                ['Date', new Date(viewPurchase.billDate||viewPurchase.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}), '#8892a4'],
                ['Total', formatCurrency(viewPurchase.totalAmount), '#10b981'],
              ].map(([l,v,c])=>(
                <div key={l} style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#8892a4', textTransform:'uppercase', marginBottom:3 }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:String(c) }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>Items Purchased</div>
            <div style={{ border:'1px solid #2a3348', borderRadius:8, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr style={{ background:'#252d40' }}>
                  {['Item','Category','Qty','Rate','Amount'].map(h=><th key={h} style={{ padding:'8px 10px', textAlign:'left', color:'#8892a4', fontWeight:600 }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(viewPurchase.items||[]).map((it:any,idx:number)=>(
                    <tr key={it.id} style={{ borderBottom:'1px solid #2a3348', background:idx%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                      <td style={{ padding:'8px 10px', fontWeight:600 }}>{it.item?.name}</td>
                      <td style={{ padding:'8px 10px' }}><span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:`${CAT_COLOR[it.item?.category]||'#6b7280'}18`, color:CAT_COLOR[it.item?.category]||'#6b7280', fontWeight:700 }}>{it.item?.category}</span></td>
                      <td style={{ padding:'8px 10px', color:'#3b82f6', fontWeight:700 }}>{it.qty} {it.item?.unit}</td>
                      <td style={{ padding:'8px 10px', color:'#8892a4' }}>{formatCurrency(it.rate)}/{it.item?.unit}</td>
                      <td style={{ padding:'8px 10px', color:'#10b981', fontWeight:700 }}>{formatCurrency(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:'#252d40' }}>
                    <td colSpan={4} style={{ padding:'8px 10px', textAlign:'right', color:'#8892a4', fontWeight:600 }}>Total:</td>
                    <td style={{ padding:'8px 10px', color:'#10b981', fontWeight:800, fontSize:14 }}>{formatCurrency(viewPurchase.totalAmount)}</td>
                  </tr>
                  <tr style={{ background:'#252d40' }}>
                    <td colSpan={4} style={{ padding:'4px 10px', textAlign:'right', color:'#8892a4', fontWeight:600 }}>Paid:</td>
                    <td style={{ padding:'4px 10px', color:'#10b981', fontWeight:700 }}>{formatCurrency(viewPurchase.paidAmount)}</td>
                  </tr>
                  {viewPurchase.totalAmount-viewPurchase.paidAmount>0 && (
                    <tr style={{ background:'rgba(239,68,68,.08)' }}>
                      <td colSpan={4} style={{ padding:'4px 10px', textAlign:'right', color:'#ef4444', fontWeight:600 }}>Due:</td>
                      <td style={{ padding:'4px 10px', color:'#ef4444', fontWeight:800 }}>{formatCurrency(viewPurchase.totalAmount-viewPurchase.paidAmount)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
            {viewPurchase.notes && <div style={{ marginTop:12, padding:'8px 12px', background:'#1e2535', borderRadius:8, fontSize:12, color:'#8892a4' }}>📝 {viewPurchase.notes}</div>}
          </div>
        )}
      </Modal>

    </PageShell>
  )
}