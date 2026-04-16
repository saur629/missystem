'use client'
import { useState, useEffect, useCallback, memo } from 'react'
import { useSession } from 'next-auth/react'
import { PageShell } from '@/components/layout/PageShell'
import { StatCard, Badge, Button, Modal, FormGroup, Input, Select, Textarea, Card, CardHeader, CardTitle, Loading, Empty, Grid, InfoBox } from '@/components/ui'
import { formatCurrency, formatDate, ORDER_STATUS, PRIORITY_COLOR } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── WHATSAPP SENDER ────────────────────────────────────────────
function sendWhatsApp(order: any, items: any[], shopName: string) {
  const mobile = order.customer?.mobile || "";
  if (!mobile) { toast.error("No mobile number for this customer"); return; }
  const clean = mobile.replace(/[\s\-()]/g, "");
  const phone = clean.startsWith("+") ? clean.replace("+", "") : clean.startsWith("0") ? "91" + clean.slice(1) : "91" + clean;
 
  // Build items table text for A4-style message
  const itemLines = items.length > 0
    ? items.map((item: any, i: number) => {
        if (order.orderType === "FLEX") {
          const w = item.widthFt ?? item.width ?? "?";
          const h = item.heightFt ?? item.height ?? "?";
          const u = item.unit || "ft";
          const sqft = item.sqFt ? parseFloat(item.sqFt).toFixed(2) : "?";
          return `${i + 1}. ${item.description || "Banner"}\n   Size: ${w} x ${h} ${u} | ${sqft} sqft\n   Qty: ${item.qty || 1} | Media: ${item.flexMedia || "—"}\n   Amount: Rs.${(item.amount || 0).toLocaleString("en-IN")}`;
        } else {
          return `${i + 1}. ${item.jobName || "Job"}\n   Size: ${item.size || "—"} | Qty: ${item.qty || 1}\n   Colors: ${item.colors || "—"} | Side: ${item.printSide || "—"}\n   Amount: Rs.${(item.amount || 0).toLocaleString("en-IN")}`;
        }
      }).join("\n\n")
    : order.orderType === "FLEX"
      ? `1. Banner\n   ${(order.sqFt || 0).toFixed?.(2) || "?"} sqft @ Rs.${order.ratePerSqFt || "?"}/sqft`
      : `1. ${order.jobName || "Job"} x ${order.qty || 1}`;
 
  const dueStr = order.dueDate
    ? new Date(order.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "";
 
  const divider = "━━━━━━━━━━━━━━━━━━━━";
 
  const msg =
`🖨️ *${shopName}*
${divider}
✅ *ORDER CONFIRMATION*
${divider}
 
📋 *Order No:* ${order.orderNo}
👤 *Customer:* ${order.customer?.name}
📱 *Mobile:* ${order.customer?.mobile}
📅 *Order Date:* ${new Date(order.date || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
🔖 *Order Type:* ${order.orderType}
⚡ *Priority:* ${order.priority === "EXPRESS" ? "🔴 EXPRESS" : order.priority === "URGENT" ? "🟡 URGENT" : "🟢 NORMAL"}${dueStr ? `\n⏰ *Due Date:* ${dueStr}` : ""}
${divider}
 
📦 *JOB DETAILS*
${divider}
${itemLines}
${divider}
 
💰 *PAYMENT SUMMARY*
${divider}
Subtotal:    Rs.${(order.subTotal || order.totalAmount || 0).toLocaleString("en-IN")}
GST (${order.gstPct || 18}%):  Rs.${(order.gstAmount || 0).toLocaleString("en-IN")}
*TOTAL:      Rs.${(order.totalAmount || 0).toLocaleString("en-IN")}*
Advance:     Rs.${(order.advancePaid || 0).toLocaleString("en-IN")}
*Balance Due: Rs.${(order.balanceDue || 0).toLocaleString("en-IN")}*
Payment Mode: ${order.paymentMethod || "—"}
${divider}${order.notes ? `\n📝 *Note:* ${order.notes}\n${divider}` : ""}
 
Thank you for your order! 🙏
_${shopName}_`;
 
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

// ── PRINT ORDER SUMMARY (A4) ───────────────────────────────────
function printOrderSummary(order: any, itemsList: any[], shopName: string) {
  const now   = new Date()
  const items = itemsList || []
  const qrData = encodeURIComponent(`ORDER:${order.orderNo}|CUSTOMER:${order.customer?.name}|MOBILE:${order.customer?.mobile}|TOTAL:${order.totalAmount}|BAL:${order.balanceDue}|STATUS:${order.status}`)
  const qrUrl  = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`
  const stColors: Record<string,string> = { PENDING:'#6b7280', DESIGNING:'#8b5cf6', DESIGN_DONE:'#3b82f6', PRINTING:'#f59e0b', PRINT_DONE:'#14b8a6', QUALITY_CHECK:'#f97316', READY:'#10b981', DISPATCHED:'#3b82f6', DELIVERED:'#16a34a', CANCELLED:'#ef4444' }
  const stColor = stColors[order.status] || '#6b7280'
  const stLabel = ORDER_STATUS[order.status]?.label || order.status
  const overdue = order.dueDate && new Date(order.dueDate) < now && !['DELIVERED','CANCELLED'].includes(order.status)
  const wfStatuses = ['PENDING','DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK','READY','DISPATCHED','DELIVERED']
  const wfLabels: Record<string,string> = {PENDING:'Booked',DESIGNING:'Design',DESIGN_DONE:'Design✓',PRINTING:'Printing',PRINT_DONE:'Print✓',QUALITY_CHECK:'QC',READY:'Ready',DISPATCHED:'Dispatch',DELIVERED:'Delivered'}
  const curIdx = wfStatuses.indexOf(order.status)

  const buildRows = () => {
    if (items.length === 0) {
      const w = order.widthFt ?? order.width ?? '—'
      const h = order.heightFt ?? order.height ?? '—'
      return order.orderType === 'FLEX'
        ? `<tr><td style="text-align:center;color:#1a56db;font-weight:700">1</td><td>${order.description||'—'}</td><td>${order.flexMedia||'—'}</td><td style="text-align:center">${w}</td><td style="text-align:center">${h}</td><td style="text-align:center;font-size:9px;color:#6b7280">ft</td><td style="text-align:center;color:#1a56db;font-weight:700">${order.sqFt?parseFloat(order.sqFt).toFixed(2):'—'}</td><td style="text-align:center">1</td><td style="text-align:center">₹${order.ratePerSqFt||'—'}</td><td style="text-align:right;color:#059669;font-weight:700">₹${(order.totalAmount||0).toLocaleString('en-IN')}</td></tr>`
        : `<tr><td style="text-align:center;color:#1a56db;font-weight:700">1</td><td>${order.jobName||'—'}</td><td>${order.size||'—'}</td><td style="text-align:center">${order.qty||'—'}</td><td>${order.colors||'—'}</td><td>${order.printSide||'—'}</td><td>${order.lamination||'None'}</td><td style="text-align:right;color:#059669;font-weight:700">₹${(order.totalAmount||0).toLocaleString('en-IN')}</td></tr>`
    }
    return items.map((item: any, i: number) => {
      const w = item.widthFt ?? item.width ?? '—'
      const h = item.heightFt ?? item.height ?? '—'
      const u = item.unit || 'ft'
      const bg = i % 2 === 0 ? '#fff' : '#f8fafc'
      return order.orderType === 'FLEX'
        ? `<tr style="background:${bg}"><td style="text-align:center;color:#1a56db;font-weight:700">${i+1}</td><td style="font-weight:600">${item.description||`Banner ${i+1}`}</td><td>${item.flexMedia||'—'}</td><td style="text-align:center;font-weight:700">${w}</td><td style="text-align:center;font-weight:700">${h}</td><td style="text-align:center;font-size:9px;color:#6b7280">${u}</td><td style="text-align:center;color:#1a56db;font-weight:700">${item.sqFt?parseFloat(item.sqFt).toFixed(2):'—'}</td><td style="text-align:center">${item.qty||1}</td><td style="text-align:center">₹${item.ratePerSqFt||'—'}</td><td style="text-align:right;color:#059669;font-weight:700">₹${(item.amount||0).toLocaleString('en-IN')}</td></tr>`
        : `<tr style="background:${bg}"><td style="text-align:center;color:#1a56db;font-weight:700">${i+1}</td><td style="font-weight:600">${item.jobName||'—'}</td><td>${item.size||'—'}</td><td style="text-align:center;font-weight:700">${item.qty||'—'}</td><td>${item.colors||'—'}</td><td>${item.printSide||'—'}</td><td>${item.lamination||'None'}</td><td style="text-align:right;color:#059669;font-weight:700">₹${(item.amount||0).toLocaleString('en-IN')}</td></tr>`
    }).join('')
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order ${order.orderNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff}
    @page{size:A4;margin:10mm}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:10px;border-bottom:3px solid #1a56db}
    .shop{font-size:18px;font-weight:800;color:#1a56db}.sub{font-size:11px;color:#6b7280;margin-top:2px}
    .ono{font-size:17px;font-weight:800;color:#1a56db;font-family:monospace;text-align:right}
    .meta{font-size:10px;color:#6b7280;text-align:right;margin-top:2px}
    .sbar{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:6px;margin-bottom:10px;border:1px solid #e5e7eb;background:#f9fafb}
    .spill{padding:3px 12px;border-radius:20px;font-size:10px;font-weight:800;color:#fff}
    .ppill{padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700}
    .wf{display:flex;margin-bottom:10px}
    .wf-step{flex:1;text-align:center;font-size:7.5px;font-weight:700;border-top:3px solid #e5e7eb;padding-top:4px;color:#9ca3af;overflow:hidden}
    .done{border-color:#10b981!important;color:#059669!important}.active{border-color:#1a56db!important;color:#1a56db!important}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
    .three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px}
    .ibox{border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px}
    .ilabel{font-size:8px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
    .ival{font-size:12px;font-weight:700;color:#111}
    .sec{font-size:9px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:4px 8px;margin:10px 0 6px;border-radius:0 4px 4px 0;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px;table-layout:fixed}
    th{background:#1a56db;color:#fff;padding:5px 4px;text-align:left;font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden}
    td{padding:5px 4px;border-bottom:1px solid #f3f4f6;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bottom{display:grid;grid-template-columns:1fr 200px;gap:12px;margin-bottom:10px;align-items:start}
    .qrs{display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb}
    .totbox{border:1px solid #e5e7eb;border-radius:6px;overflow:hidden}
    .trow{display:flex;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}
    .trow:last-child{border-bottom:none}.grand{background:#1a56db;color:#fff;font-size:13px;font-weight:800}
    .tlabel{color:#6b7280}.tval{font-weight:600}
    .sigrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:16px}
    .sigbox{text-align:center}.sigline{height:28px;border-bottom:1px solid #374151;margin-bottom:4px}
    .siglabel{font-size:9px;color:#6b7280}
    .footer{margin-top:10px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:6px}
    .overdue{color:#dc2626;font-weight:700}
    .nbox{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;min-height:28px;font-size:10px;color:#374151;margin-bottom:10px;background:#fafafa}
  </style></head><body>
  <div class="hdr">
    <div><div class="shop">🖨️ ${shopName}</div><div class="sub">Order Summary / Receipt</div></div>
    <div><div class="ono">${order.orderNo}</div><div class="meta">Date: <strong>${new Date(order.date||Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</strong></div><div class="meta">Printed: ${now.toLocaleString('en-IN')}</div></div>
  </div>
  <div class="sbar">
    <span class="spill" style="background:${stColor}">${stLabel}</span>
    <span class="ppill" style="background:${order.priority==='EXPRESS'?'#fee2e2':order.priority==='URGENT'?'#fef3c7':'#f0fdf4'};color:${order.priority==='EXPRESS'?'#dc2626':order.priority==='URGENT'?'#d97706':'#16a34a'}">${order.priority==='EXPRESS'?'🔴':order.priority==='URGENT'?'🟡':'🟢'} ${order.priority}</span>
    ${overdue?'<span class="overdue">⚠️ OVERDUE</span>':''}
    <span style="margin-left:auto;font-size:10px;color:#6b7280">${order.orderType} ORDER</span>
  </div>
  <div class="wf">${wfStatuses.map((s,ti)=>{const cls=s===order.status?'active':ti<curIdx?'done':'';return `<div class="wf-step ${cls}">${cls==='done'?'✓ ':cls==='active'?'● ':''}${wfLabels[s]}</div>`}).join('')}</div>
  <div class="two">
    <div class="ibox"><div class="ilabel">Customer Name</div><div class="ival">${order.customer?.name||'—'}</div></div>
    <div class="ibox"><div class="ilabel">Mobile Number</div><div class="ival" style="color:#1a56db">${order.customer?.mobile||'—'}</div></div>
  </div>
  <div class="three">
    <div class="ibox"><div class="ilabel">Order Type</div><div class="ival">${order.orderType}</div></div>
    <div class="ibox"><div class="ilabel">Payment Method</div><div class="ival">${order.paymentMethod||'—'}</div></div>
    <div class="ibox"><div class="ilabel">Due Date</div><div class="ival ${overdue?'overdue':''}">${order.dueDate?new Date(order.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}${overdue?' ⚠️':''}</div></div>
  </div>
  <div class="sec">📋 Job Items (${items.length||1})</div>
  <table><thead><tr>
    ${order.orderType==='FLEX'
      ? `<th style="width:24px">Sr.</th><th style="width:20%">Description</th><th style="width:14%">Media</th><th style="width:8%">W</th><th style="width:8%">H</th><th style="width:6%">Unit</th><th style="width:8%">Sq.Ft</th><th style="width:5%">Qty</th><th style="width:9%">Rate</th><th style="width:12%;text-align:right">Amount</th>`
      : `<th style="width:24px">Sr.</th><th style="width:24%">Job Name</th><th style="width:12%">Size</th><th style="width:7%">Qty</th><th style="width:14%">Colors</th><th style="width:10%">Side</th><th style="width:13%">Lamination</th><th style="width:12%;text-align:right">Amount</th>`
    }
  </tr></thead><tbody>${buildRows()}</tbody></table>
  <div class="bottom">
    <div class="qrs">
      <img src="${qrUrl}" style="width:80px;height:80px;flex-shrink:0;border:2px solid #e5e7eb;border-radius:4px" alt="QR"/>
      <div style="flex:1">
        <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px">📱 Scan to verify</div>
        <div style="font-size:9px;color:#374151;margin-bottom:2px"><strong>Order:</strong> ${order.orderNo}</div>
        <div style="font-size:9px;color:#374151;margin-bottom:2px"><strong>Customer:</strong> ${order.customer?.name||'—'}</div>
        <div style="font-size:9px;color:#374151;margin-bottom:2px"><strong>Mobile:</strong> ${order.customer?.mobile||'—'}</div>
        <div style="font-size:9px;color:#374151"><strong>Status:</strong> ${stLabel}</div>
      </div>
    </div>
    <div class="totbox">
      <div class="trow"><span class="tlabel">Subtotal</span><span class="tval">₹${(order.subTotal||order.totalAmount||0).toLocaleString('en-IN')}</span></div>
      ${(order.discount||0)>0?`<div class="trow"><span class="tlabel">Discount</span><span class="tval" style="color:#dc2626">- ₹${(order.discount||0).toLocaleString('en-IN')}</span></div>`:''}
      <div class="trow"><span class="tlabel">GST (${order.gstPct||18}%)</span><span class="tval">₹${(order.gstAmount||0).toLocaleString('en-IN')}</span></div>
      <div class="trow grand"><span>TOTAL</span><span>₹${(order.totalAmount||0).toLocaleString('en-IN')}</span></div>
      <div class="trow"><span class="tlabel" style="color:#059669">Advance Paid</span><span class="tval" style="color:#059669">₹${(order.advancePaid||0).toLocaleString('en-IN')}</span></div>
      <div class="trow" style="font-weight:700;font-size:12px;color:${(order.balanceDue||0)>0?'#dc2626':'#059669'}"><span>Balance Due</span><span>₹${(order.balanceDue||0).toLocaleString('en-IN')}</span></div>
    </div>
  </div>
  ${order.notes?`<div class="sec">📝 Notes</div><div class="nbox">${order.notes}</div>`:''}
  <div class="sigrow">
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Prepared By</div></div>
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Authorized Signatory</div></div>
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Customer Signature</div></div>
  </div>
  <div class="footer">${shopName} • Order Summary • ${order.orderNo} • Generated ${now.toLocaleString('en-IN')}</div>
  </body></html>`

  const win = window.open('', '_blank', 'width=860,height=660')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ── CONSTANTS ──────────────────────────────────────────────────
const FLEX_MEDIA = ['Star Flex','Black Back','One Way Vision','Canvas','Backlit','Normal Vinyl','Eco Solvent','UV Print','Gloss Laminated']
const ORDER_TYPES = ['FLEX','OFFSET','DIGITAL','SCREEN','OTHER']
const PAYMENT_METHODS = ['Cash','UPI','NEFT/RTGS','Cheque','Card','Credit (pay later)']
const TASK_STATUSES = ['PENDING','IN_PROGRESS','DONE'] as const
const STATUS_COLOR: Record<string,string> = { PENDING:'#8892a4', IN_PROGRESS:'#f59e0b', DONE:'#10b981' }
const INCH_TO_FT = 1/12

const defaultFlexItem = (): any => ({
  id: Date.now() + Math.random(),
  description:'', widthFt:'', heightFt:'', unit:'ft',
  sqFt:0, ratePerSqFt:'', flexMedia:'Star Flex', qty:'1', amount:0, designCharge:'0',
  designStatus:'PENDING', printStatus:'PENDING',
})
const defaultPrintItem = (): any => ({
  id: Date.now() + Math.random(),
  jobName:'', qty:'', sellingPrice:'', size:'',
  colors:'4-color (CMYK)', printSide:'SINGLE', lamination:'', description:'', amount:0,
  designCharge:'0', designStatus:'PENDING', printStatus:'PENDING',
})
const defaultForm = {
  customerId:'', orderType:'FLEX', priority:'NORMAL',
  dueDate:'', notes:'', vendorName:'', costPrice:'',
  discount:'0', gstPct:'18', advancePaid:'0', paymentMethod:'Cash',
}

function calcFlexItem(item: any, changed: Record<string,string>) {
  const merged = { ...item, ...changed }
  let wFt = 0, hFt = 0
  if (merged.unit === 'ft') {
    wFt = parseFloat(merged.widthFt) || 0
    hFt = parseFloat(merged.heightFt) || 0
  } else {
    wFt = (parseFloat(merged.widthFt) || 0) * INCH_TO_FT
    hFt = (parseFloat(merged.heightFt) || 0) * INCH_TO_FT
  }
  const r  = parseFloat(merged.ratePerSqFt) || 0
  const q  = parseInt(merged.qty || '1') || 1
  const dc = parseFloat(merged.designCharge || '0') || 0
  const sqFt   = parseFloat((wFt * hFt).toFixed(4))
  const amount = parseFloat((sqFt * r * q + dc).toFixed(2))
  return { ...merged, sqFt, amount }
}

// ── FLEX ITEM ROW ──────────────────────────────────────────────
const FlexItemRow = memo(function FlexItemRow({ item, idx, total, onChange, onRemove }: any) {
  const isFt = item.unit !== 'inches'
  return (
    <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:12, marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#3b82f6' }}>Item {idx+1}</span>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <div style={{ display:'flex', background:'#252d40', borderRadius:6, overflow:'hidden', border:'1px solid #2a3348' }}>
            {(['ft','inches'] as const).map(u => (
              <button key={u} type="button" onClick={() => onChange(item.id,'unit',u)}
                style={{ padding:'3px 10px', fontSize:10, cursor:'pointer', fontWeight:item.unit===u?700:400, background:item.unit===u?'#3b82f6':'transparent', color:item.unit===u?'#fff':'#8892a4', border:'none' }}>{u}</button>
            ))}
          </div>
          {total > 1 && (
            <button type="button" onClick={() => onRemove(item.id)}
              style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, color:'#ef4444', fontSize:11, cursor:'pointer', padding:'2px 8px' }}>
              ✕ Remove
            </button>
          )}
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
        {[
          [`Width (${isFt?'ft':'in'})`, 'widthFt', '0'],
          [`Height (${isFt?'ft':'in'})`, 'heightFt', '0'],
        ].map(([label, field, ph]) => (
          <div key={field as string}>
            <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>{label as string}</div>
            <Input type="number" step="0.01" value={item[field as string]} onChange={e => onChange(item.id, field as string, e.target.value)} placeholder={ph as string} />
          </div>
        ))}
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Sq.Ft (Auto)</div>
          <div style={{ padding:'8px 10px', background:'#252d40', borderRadius:8, fontSize:13, fontWeight:700, color:'#10b981', textAlign:'center' }}>{item.sqFt?.toFixed(2)||'0.00'}</div>
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Rate/sqft ₹</div>
          <Input type="number" step="0.01" value={item.ratePerSqFt} onChange={e => onChange(item.id,'ratePerSqFt',e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Qty</div>
          <Input type="number" min="1" value={item.qty} onChange={e => onChange(item.id,'qty',e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Amount</div>
          <div style={{ padding:'8px 10px', background:'#252d40', borderRadius:8, fontSize:13, fontWeight:700, color:'#f59e0b', textAlign:'center' }}>₹{(item.amount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Flex Media</div>
          <Select value={item.flexMedia} onChange={e => onChange(item.id,'flexMedia',e.target.value)}>
            {FLEX_MEDIA.map(m => <option key={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Description / Label</div>
          <Input value={item.description} onChange={e => onChange(item.id,'description',e.target.value)} placeholder="e.g. Shop Banner" />
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Design Charge ₹</div>
          <Input type="number" step="0.01" min="0" value={item.designCharge||'0'} onChange={e => onChange(item.id,'designCharge',e.target.value)}
            style={{ border:'1px solid rgba(139,92,246,.4)', background:'rgba(139,92,246,.07)' }} />
        </div>
      </div>
      {parseFloat(item.designCharge||'0') > 0 && (
        <div style={{ marginTop:6, fontSize:10, color:'#8b5cf6', display:'flex', justifyContent:'flex-end' }}>
          <span style={{ background:'rgba(139,92,246,.12)', padding:'2px 8px', borderRadius:6, border:'1px solid rgba(139,92,246,.2)' }}>
            🎨 Design: ₹{parseFloat(item.designCharge).toLocaleString('en-IN')} included
          </span>
        </div>
      )}
    </div>
  )
})

// ── PRINT ITEM ROW ─────────────────────────────────────────────
const PrintItemRow = memo(function PrintItemRow({ item, idx, total, onChange, onRemove }: any) {
  return (
    <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:12, marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'#8b5cf6' }}>Item {idx+1}</span>
        {total > 1 && (
          <button type="button" onClick={() => onRemove(item.id)}
            style={{ background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.2)', borderRadius:6, color:'#ef4444', fontSize:11, cursor:'pointer', padding:'2px 8px' }}>
            ✕ Remove
          </button>
        )}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Job Name *</div>
          <Input value={item.jobName} onChange={e => onChange(item.id,'jobName',e.target.value)} placeholder="e.g. Visiting Card" />
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Qty *</div>
          <Input type="number" value={item.qty} onChange={e => onChange(item.id,'qty',e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Rate/piece ₹</div>
          <Input type="number" step="0.01" value={item.sellingPrice} onChange={e => onChange(item.id,'sellingPrice',e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Amount</div>
          <div style={{ padding:'8px 10px', background:'#252d40', borderRadius:8, fontSize:13, fontWeight:700, color:'#f59e0b', textAlign:'center' }}>₹{(item.amount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:8 }}>
        {[
          { label:'Size', field:'size', type:'input', ph:'A4, 12x18...' },
        ].map(f => (
          <div key={f.field}>
            <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>{f.label}</div>
            <Input value={item[f.field]} onChange={e => onChange(item.id, f.field, e.target.value)} placeholder={f.ph} />
          </div>
        ))}
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Colors</div>
          <Select value={item.colors} onChange={e => onChange(item.id,'colors',e.target.value)}>
            {['1-color','2-color','4-color (CMYK)','Spot Color'].map(c => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Print Side</div>
          <Select value={item.printSide} onChange={e => onChange(item.id,'printSide',e.target.value)}>
            <option value="SINGLE">Single</option><option value="DOUBLE">Double</option>
          </Select>
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Lamination</div>
          <Select value={item.lamination} onChange={e => onChange(item.id,'lamination',e.target.value)}>
            <option value="">None</option>
            {['Matt Lam','Glossy Lam','Soft Touch','UV Coating'].map(l => <option key={l}>{l}</option>)}
          </Select>
        </div>
        <div>
          <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'.5px' }}>Design Charge ₹</div>
          <Input type="number" step="0.01" min="0" value={item.designCharge||'0'} onChange={e => onChange(item.id,'designCharge',e.target.value)}
            style={{ border:'1px solid rgba(139,92,246,.4)', background:'rgba(139,92,246,.07)' }} />
        </div>
      </div>
    </div>
  )
})

// ── ORDER FORM BODY ────────────────────────────────────────────
const OrderFormBody = memo(function OrderFormBody({ form, items, customers, subTotalItems, afterDisc, gstAmt, total, balance, profit, onFormChange, onAddItem, onUpdateItem, onRemoveItem, onNewCustomer }: any) {
  return (
    <>
      <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:0 }}>
        <div style={{ flex:1 }}>
          <FormGroup label="Customer *">
            <Select value={form.customerId} onChange={e => onFormChange('customerId', e.target.value)} required>
              <option value="">Select Customer</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </Select>
          </FormGroup>
        </div>
        <Button type="button" onClick={onNewCustomer} style={{ marginBottom:14 }}>+ New</Button>
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
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0' }}>
            {form.orderType === 'FLEX' ? '📏 Banner / Flex Items' : '🖨️ Print Items'}
            <span style={{ marginLeft:8, fontSize:10, color:'#8892a4', fontWeight:400 }}>{items.length} item{items.length>1?'s':''}</span>
          </div>
        </div>
        {form.orderType === 'FLEX'
          ? items.map((item: any, idx: number) => <FlexItemRow key={item.id} item={item} idx={idx} total={items.length} onChange={onUpdateItem} onRemove={onRemoveItem} />)
          : items.map((item: any, idx: number) => <PrintItemRow key={item.id} item={item} idx={idx} total={items.length} onChange={onUpdateItem} onRemove={onRemoveItem} />)
        }
        <button type="button" onClick={onAddItem}
          style={{ width:'100%', padding:'8px', marginBottom:8, background:'rgba(59,130,246,.08)', border:'1px dashed rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:12, cursor:'pointer', fontWeight:600 }}>
          ＋ Add Another Item
        </button>
        <div style={{ background:'#252d40', borderRadius:8, padding:'8px 12px', display:'flex', justifyContent:'space-between', fontSize:12 }}>
          <span style={{ color:'#8892a4' }}>{items.length} item(s) subtotal</span>
          <span style={{ fontWeight:700, color:'#e2e8f0' }}>{formatCurrency(subTotalItems)}</span>
        </div>
      </div>

      <Grid cols={3} gap={12}>
        <FormGroup label="Vendor (if outsourced)">
          <Input value={form.vendorName} onChange={e => onFormChange('vendorName', e.target.value)} placeholder="Vendor name" />
        </FormGroup>
        <FormGroup label="Cost Price ₹">
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
            <option value="0">No GST</option>
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18">18%</option>
          </Select>
        </FormGroup>
        <FormGroup label="Advance Paid ₹">
          <Input type="number" value={form.advancePaid} onChange={e => onFormChange('advancePaid', e.target.value)} />
        </FormGroup>
      </Grid>

      <div style={{ background:'#1e2535', borderRadius:10, padding:14, border:'1px solid #2a3348' }}>
        <div style={{ display:'grid', gridTemplateColumns: profit !== null ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap:12 }}>
          {[
            { label:'Subtotal',    val:formatCurrency(afterDisc),  color:'#e2e8f0' },
            { label:`GST ${form.gstPct}%`, val:formatCurrency(gstAmt), color:'#e2e8f0' },
            { label:'Total',       val:formatCurrency(total),      color:'#10b981', big:true },
            { label:'Balance Due', val:formatCurrency(balance),    color:balance>0?'#ef4444':'#10b981', big:true },
            ...(profit !== null ? [{ label:'Profit', val:formatCurrency(profit), color:profit>=0?'#10b981':'#ef4444' }] : []),
          ].map((s: any) => (
            <div key={s.label}>
              <div style={{ fontSize:10, color:'#8892a4', marginBottom:3 }}>{s.label}</div>
              <div style={{ fontSize:s.big?17:13, fontWeight:s.big?800:600, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
})

// ── MAIN PAGE ──────────────────────────────────────────────────
export default function OrdersPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role || 'USER'
  const shopName = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SHOP_NAME || 'PrintFlow') : 'PrintFlow'

  const [orders, setOrders]           = useState<any[]>([])
  const [customers, setCustomers]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [showCustModal, setShowCustModal] = useState(false)
  const [viewOrder, setViewOrder]     = useState<any>(null)
  const [editOrder, setEditOrder]     = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]   = useState('')
  const [search, setSearch]           = useState('')
  const [form, setForm]               = useState(defaultForm)
  const [items, setItems]             = useState<any[]>([defaultFlexItem()])
  const [createdOrder, setCreatedOrder] = useState<any>(null) // WhatsApp/print popup
  const [custForm, setCustForm]       = useState({ name:'', mobile:'', email:'', city:'', gstNo:'' })

  const handleFormChange = useCallback((k: string, v: string) => setForm(p => ({ ...p, [k]: v })), [])

  const handleUpdateItem = useCallback((id: any, key: string, val: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      if (['widthFt','heightFt','ratePerSqFt','qty','unit','flexMedia','description','designCharge'].includes(key)) {
        return calcFlexItem(item, { [key]: val })
      }
      const updated = { ...item, [key]: val }
      if (key === 'sellingPrice' || key === 'qty' || key === 'designCharge') {
        const sp = parseFloat(key==='sellingPrice'?val:updated.sellingPrice) || 0
        const q  = parseInt(key==='qty'?val:updated.qty) || 0
        const dc = parseFloat(key==='designCharge'?val:(updated.designCharge||'0')) || 0
        updated.amount = sp * q + dc
      }
      return updated
    }))
  }, [])

  const handleAddItem = useCallback(() => {
    setItems(prev => {
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

  const subTotalItems = items.reduce((s, i) => s + (i.amount || 0), 0)
  const disc          = parseFloat(form.discount || '0')
  const afterDisc     = subTotalItems - disc
  const gstAmt        = afterDisc * parseFloat(form.gstPct || '18') / 100
  const total         = afterDisc + gstAmt
  const balance       = total - parseFloat(form.advancePaid || '0')
  const costTotal     = form.costPrice ? parseFloat(form.costPrice) : null
  const profit        = costTotal !== null ? afterDisc - costTotal : null

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
      advancePaid: parseFloat(form.advancePaid || '0'), balanceDue: balance,
      itemCount: items.length, orderItemsJson: JSON.stringify(normItems),
    }
  }

  // ── CREATE ─────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) { toast.error('Select a customer'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/orders', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error()
      const order = await res.json()
      // Attach full customer + items for WhatsApp/print
      const customer = customers.find(c => c.id === form.customerId) || order.customer
      const orderFull = { ...order, orderItems: [...items], customer }
      setOrders(p => [order, ...p])
      setShowModal(false)
      resetForm()
      setCreatedOrder(orderFull) // ← opens WhatsApp/print popup
      toast.success(`✅ Order ${order.orderNo} created!`)
    } catch { toast.error('Failed to create order') }
    setSaving(false)
  }

  // ── EDIT ───────────────────────────────────────────────────
  function openEdit(o: any) {
    const parsed = (() => { try { return JSON.parse(o.orderItemsJson||'[]') } catch { return [] } })()
    setEditOrder(o)
    setForm({
      customerId: o.customerId, orderType: o.orderType, priority: o.priority,
      dueDate: o.dueDate ? o.dueDate.slice(0,10) : '',
      notes: o.notes||'', vendorName: o.vendorName||'', costPrice: o.costPrice!=null?String(o.costPrice):'',
      discount: String(o.discount??0), gstPct: String(o.gstPct??18),
      advancePaid: String(o.advancePaid??0), paymentMethod: o.paymentMethod||'Cash',
    })
    setItems(parsed.length ? parsed : [o.orderType==='FLEX' ? defaultFlexItem() : defaultPrintItem()])
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editOrder) return
    setSaving(true)
    try {
      const res = await fetch(`/api/orders/${editOrder.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setOrders(p => p.map(o => o.id === updated.id ? { ...updated, orderItems: items } : o))
      setEditOrder(null); resetForm()
      toast.success('✅ Order updated!')
    } catch { toast.error('Failed to update order') }
    setSaving(false)
  }

  // ── DELETE ─────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/orders/${deleteTarget.id}`, { method:'DELETE' })
      if (!res.ok) throw new Error()
      setOrders(p => p.filter(o => o.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('🗑️ Order deleted')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/orders/${id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders(p => p.map(o => o.id === id ? { ...o, status } : o))
      if (viewOrder?.id === id) setViewOrder((v: any) => ({ ...v, status }))
      toast.success(`→ ${ORDER_STATUS[status]?.label}`)
    }
  }

  async function saveItemStatuses(orderId: string, updatedItems: any[]) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ orderItemsJson: JSON.stringify(updatedItems) }),
    })
    if (res.ok) {
      setOrders(p => p.map(o => o.id===orderId ? {...o, orderItemsJson: JSON.stringify(updatedItems)} : o))
      toast.success('Task statuses saved ✅')
    }
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/customers', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(custForm),
    })
    if (res.ok) {
      const c = await res.json()
      setCustomers(p => [...p, c])
      setForm(p => ({ ...p, customerId: c.id }))
      setShowCustModal(false)
      setCustForm({ name:'', mobile:'', email:'', city:'', gstNo:'' })
      toast.success('Customer added!')
    }
  }

  const canBook   = ['SUPER_ADMIN','ADMIN','RECEPTION'].includes(role)
  const canDelete = ['SUPER_ADMIN','ADMIN'].includes(role)
  const counts = {
    total:      orders.length,
    pending:    orders.filter(o => o.status === 'PENDING').length,
    inProgress: orders.filter(o => ['DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK'].includes(o.status)).length,
    ready:      orders.filter(o => o.status === 'READY').length,
  }

  const formProps = {
    form, items, customers, subTotalItems, afterDisc, gstAmt, total, balance, profit,
    onFormChange: handleFormChange, onAddItem: handleAddItem,
    onUpdateItem: handleUpdateItem, onRemoveItem: handleRemoveItem,
    onNewCustomer: () => setShowCustModal(true),
  }

  return (
    <PageShell title="Orders" action={canBook ? { label:'+ New Order', onClick:()=>setShowModal(true) } : undefined}>
      <div className="animate-in">

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Total"       value={counts.total}      icon="📋" color="blue" />
          <StatCard label="Pending"     value={counts.pending}    icon="🔴" color="red" />
          <StatCard label="In Progress" value={counts.inProgress} icon="⚙️" color="yellow" />
          <StatCard label="Ready"       value={counts.ready}      icon="📦" color="green" />
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <Input placeholder="🔍 Search name, mobile, order no..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && fetchOrders()}
            style={{ flex:1, minWidth:200 }} />
          <Select style={{ width:140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(ORDER_STATUS).map(([k,v]) => <option key={k} value={k}>{(v as any).icon} {(v as any).label}</option>)}
          </Select>
          <Select style={{ width:120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Button onClick={fetchOrders}>Search</Button>
          {canBook && <Button variant="primary" onClick={() => setShowModal(true)}>+ New Order</Button>}
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader><CardTitle>All Orders ({orders.length})</CardTitle></CardHeader>
          {loading ? <Loading /> : orders.length === 0 ? <Empty message="No orders yet." /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order No</th><th>Date</th><th>Customer</th><th>Mobile</th>
                    <th>Type</th><th>Items</th><th>Payment</th><th>Total</th>
                    <th>Advance</th><th>Balance</th><th>Due Date</th><th>Priority</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const st = ORDER_STATUS[o.status]
                    const overdue = o.dueDate && new Date(o.dueDate) < new Date() && !['DELIVERED','CANCELLED'].includes(o.status)
                    const pItems: any[] = (() => { try { return JSON.parse(o.orderItemsJson||'[]') } catch { return [] } })()
                    const allDesign = pItems.length > 0 && pItems.every((i:any) => i.designStatus==='DONE')
                    const allPrint  = pItems.length > 0 && pItems.every((i:any) => i.printStatus==='DONE')
                    return (
                      <tr key={o.id}>
                        <td style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:11, fontWeight:600 }}>{o.orderNo}</td>
                        <td style={{ color:'#8892a4', fontSize:11, whiteSpace:'nowrap' }}>{formatDate(o.date)}</td>
                        <td style={{ fontWeight:600 }}>{o.customer?.name}</td>
                        <td style={{ fontSize:11, color:'#8892a4' }}>{o.customer?.mobile}</td>
                        <td><Badge color="blue">{o.orderType}</Badge></td>
                        <td>
                          <div style={{ fontSize:11 }}>
                            {o.itemCount > 1
                              ? <span style={{ color:'#f59e0b', fontWeight:600 }}>📦 {o.itemCount} items</span>
                              : <span style={{ color:'#8892a4' }}>{o.orderType==='FLEX'?`${o.sqFt?.toFixed(1)} sqft`:`${o.jobName||'—'} ×${o.qty}`}</span>
                            }
                          </div>
                          <div style={{ display:'flex', gap:4, marginTop:3 }}>
                            <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:allDesign?'rgba(16,185,129,.15)':'rgba(245,158,11,.1)', color:allDesign?'#10b981':'#f59e0b' }}>🎨 {allDesign?'Done':'Design'}</span>
                            <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background:allPrint?'rgba(16,185,129,.15)':'rgba(139,92,246,.1)', color:allPrint?'#10b981':'#8b5cf6' }}>🖨️ {allPrint?'Done':'Print'}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:11, color:'#8892a4' }}>{o.paymentMethod||'—'}</td>
                        <td style={{ color:'#10b981', fontWeight:600 }}>{formatCurrency(o.totalAmount)}</td>
                        <td style={{ color:'#3b82f6' }}>{formatCurrency(o.advancePaid)}</td>
                        <td style={{ color:o.balanceDue>0?'#ef4444':'#10b981', fontWeight:600 }}>{formatCurrency(o.balanceDue)}</td>
                        <td style={{ fontSize:11, color:overdue?'#ef4444':'#8892a4', whiteSpace:'nowrap' }}>{o.dueDate?formatDate(o.dueDate):'—'}{overdue?' ⚠️':''}</td>
                        <td><Badge color={PRIORITY_COLOR[o.priority]}>{o.priority}</Badge></td>
                        <td><Badge color={(st as any)?.color}>{(st as any)?.icon} {(st as any)?.label}</Badge></td>
                        <td>
                          <div style={{ display:'flex', gap:3, flexWrap:'nowrap' }}>
                            <Button size="sm" onClick={() => setViewOrder({ ...o, orderItems: (() => { try { return JSON.parse(o.orderItemsJson||'[]') } catch { return [] } })() })}>👁</Button>
                            {/* WhatsApp quick button */}
                            <button onClick={() => sendWhatsApp(o, (() => { try { return JSON.parse(o.orderItemsJson||'[]') } catch { return [] } })(), shopName)}
                              title="Send WhatsApp"
                              style={{ padding:'4px 7px', background:'rgba(37,211,102,.12)', border:'1px solid rgba(37,211,102,.3)', borderRadius:6, color:'#25d366', fontSize:13, cursor:'pointer', fontWeight:700 }}>
                              💬
                            </button>
                            {/* Print A4 quick button */}
                            <button onClick={() => printOrderSummary(o, (() => { try { return JSON.parse(o.orderItemsJson||'[]') } catch { return [] } })(), shopName)}
                              title="Print A4"
                              style={{ padding:'4px 7px', background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.25)', borderRadius:6, color:'#3b82f6', fontSize:13, cursor:'pointer', fontWeight:700 }}>
                              🖨️
                            </button>
                            {canBook && <Button size="sm" variant="primary" onClick={() => openEdit(o)}>✏️</Button>}
                            {canDelete && (
                              <button onClick={() => setDeleteTarget(o)}
                                style={{ padding:'4px 7px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#ef4444', fontSize:11, cursor:'pointer' }}>🗑️</button>
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

      {/* ── CREATE MODAL ── */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }}
        title="📋 New Order Booking" width={700}
        footer={<>
          <Button onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button>
          <Button variant="primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Saving...' : `💾 Save Order (${items.length} item${items.length>1?'s':''})`}
          </Button>
        </>}>
        <form onSubmit={handleCreate}><OrderFormBody {...formProps} /></form>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={!!editOrder} onClose={() => { setEditOrder(null); resetForm() }}
        title={`✏️ Edit — ${editOrder?.orderNo}`} width={700}
        footer={<>
          <Button onClick={() => { setEditOrder(null); resetForm() }}>Cancel</Button>
          <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : '💾 Update Order'}</Button>
        </>}>
        <form onSubmit={handleEdit}><OrderFormBody {...formProps} /></form>
      </Modal>

      {/* ── VIEW MODAL ── */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)}
        title={`${viewOrder?.orderNo} — ${viewOrder?.customer?.name}`} width={680}
        footer={
          <div style={{ display:'flex', justifyContent:'space-between', width:'100%', gap:8 }}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => printOrderSummary(viewOrder, viewOrder.orderItems||[], shopName)}
                style={{ padding:'7px 14px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                🖨️ Print A4
              </button>
              <button onClick={() => sendWhatsApp(viewOrder, viewOrder.orderItems||[], shopName)}
                style={{ padding:'7px 14px', background:'rgba(37,211,102,.15)', border:'1px solid rgba(37,211,102,.4)', borderRadius:8, color:'#25d366', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                💬 Send WhatsApp
              </button>
            </div>
            <Button onClick={() => setViewOrder(null)}>Close</Button>
          </div>
        }>
        {viewOrder && (() => {
          const vItems: any[] = viewOrder.orderItems || []
          const setVItems = (updated: any[]) => setViewOrder((v: any) => ({ ...v, orderItems: updated }))
          return (
            <div>
              <Grid cols={3} gap={14} style={{ marginBottom:16 }}>
                <InfoBox label="Order Type" value={viewOrder.orderType} />
                <InfoBox label="Priority"   value={viewOrder.priority} />
                <InfoBox label="Payment"    value={viewOrder.paymentMethod||'—'} />
                <InfoBox label="Total"      value={formatCurrency(viewOrder.totalAmount)} color="#10b981" />
                <InfoBox label="Advance"    value={formatCurrency(viewOrder.advancePaid)} color="#3b82f6" />
                <InfoBox label="Balance"    value={formatCurrency(viewOrder.balanceDue)}  color={viewOrder.balanceDue>0?'#ef4444':'#10b981'} />
                <InfoBox label="Due Date"   value={viewOrder.dueDate?formatDate(viewOrder.dueDate):'—'} />
                <InfoBox label="GST"        value={`${viewOrder.gstPct}% = ${formatCurrency(viewOrder.gstAmount)}`} />
                <InfoBox label="Discount"   value={formatCurrency(viewOrder.discount)} />
              </Grid>

              {viewOrder.notes && (
                <div style={{ background:'#1e2535', borderRadius:8, padding:10, marginBottom:14, fontSize:12, color:'#8892a4' }}>📝 {viewOrder.notes}</div>
              )}

              {/* Task Tracker */}
              {vItems.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:10 }}>🎨 Design & 🖨️ Print Task Tracker</div>
                  {vItems.map((item: any, idx: number) => (
                    <div key={item.id||idx} style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:12, marginBottom:8 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#e2e8f0', marginBottom:8 }}>
                        Item {idx+1}: {item.description||item.jobName||`${item.widthFt??item.width}×${item.heightFt??item.height} ${item.unit||'ft'}`}
                        <span style={{ marginLeft:8, fontSize:10, color:'#8892a4', fontWeight:400 }}>{item.sqFt?.toFixed(2)} sqft — {formatCurrency(item.amount)}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        {(['design','print'] as const).map(dept => {
                          const field = dept === 'design' ? 'designStatus' : 'printStatus'
                          return (
                            <div key={dept}>
                              <div style={{ fontSize:9, color:'#8892a4', marginBottom:4, textTransform:'uppercase', letterSpacing:'.5px' }}>
                                {dept==='design'?'🎨':'🖨️'} {dept} Status
                              </div>
                              <div style={{ display:'flex', gap:4 }}>
                                {TASK_STATUSES.map(s => (
                                  <button key={s} type="button"
                                    onClick={() => setVItems(vItems.map((it:any,i:number) => i===idx ? {...it,[field]:s} : it))}
                                    style={{ flex:1, padding:'5px 0', borderRadius:6, fontSize:10, cursor:'pointer', fontWeight:item[field]===s?700:400, border:`1px solid ${item[field]===s?STATUS_COLOR[s]:'#2a3348'}`, background:item[field]===s?`${STATUS_COLOR[s]}22`:'#252d40', color:item[field]===s?STATUS_COLOR[s]:'#8892a4' }}>
                                    {s==='PENDING'?'⏳':s==='IN_PROGRESS'?'🔄':'✅'} {s.replace('_',' ')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                    <Button variant="primary" size="sm" onClick={() => saveItemStatuses(viewOrder.id, vItems)}>💾 Save Task Statuses</Button>
                  </div>
                </div>
              )}

              {/* Status update */}
              <div style={{ marginBottom:8, fontSize:10, color:'#8892a4', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Update Order Status</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(ORDER_STATUS).map(([key, val]) => (
                  <button key={key} onClick={() => updateStatus(viewOrder.id, key)}
                    style={{ padding:'6px 12px', borderRadius:8, fontSize:12, cursor:'pointer', border:`1px solid ${viewOrder.status===key?'#3b82f6':'#2a3348'}`, background:viewOrder.status===key?'rgba(59,130,246,.15)':'#1e2535', color:viewOrder.status===key?'#3b82f6':'#8892a4', fontWeight:viewOrder.status===key?700:400 }}>
                    {(val as any).icon} {(val as any).label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── ORDER CREATED — WHATSAPP/PRINT POPUP ── */}
      <Modal open={!!createdOrder} onClose={() => setCreatedOrder(null)}
        title={'✅ Order ' + (createdOrder?.orderNo||'') + ' Created!'} width={460}
        footer={<Button onClick={() => setCreatedOrder(null)}>Done</Button>}>
        {createdOrder && (
          <div>
            {/* Summary card */}
            <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:'14px 16px', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,#10b981,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, fontWeight:800, color:'#fff' }}>
                  {createdOrder.customer?.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{createdOrder.customer?.name}</div>
                  <div style={{ fontSize:12, color:'#8892a4' }}>{createdOrder.customer?.mobile} • {createdOrder.orderNo}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'#8892a4' }}>Order Total</div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#10b981' }}>₹{(createdOrder.totalAmount||0).toLocaleString('en-IN')}</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                {[
                  ['Type',    createdOrder.orderType,                                              '#3b82f6'],
                  ['Advance', '₹' + (createdOrder.advancePaid||0).toLocaleString('en-IN'),         '#10b981'],
                  ['Balance', '₹' + (createdOrder.balanceDue||0).toLocaleString('en-IN'),          (createdOrder.balanceDue||0)>0?'#ef4444':'#10b981'],
                ].map(([l,v,c]) => (
                  <div key={String(l)} style={{ background:'#252d40', borderRadius:7, padding:'8px 6px' }}>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:String(c) }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {/* WhatsApp — main CTA */}
              <button onClick={() => { sendWhatsApp(createdOrder, createdOrder.orderItems||[], shopName); setCreatedOrder(null) }}
                style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#25d366,#128c7e)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>💬</span>
                Send to WhatsApp
                <span style={{ fontSize:12, fontWeight:400, opacity:.9, marginLeft:4 }}>({createdOrder.customer?.mobile})</span>
              </button>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button onClick={() => { printOrderSummary(createdOrder, createdOrder.orderItems||[], shopName); setCreatedOrder(null) }}
                  style={{ padding:'11px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  🖨️ Print A4
                </button>
                <button onClick={() => {
                  sendWhatsApp(createdOrder, createdOrder.orderItems||[], shopName)
                  setTimeout(() => printOrderSummary(createdOrder, createdOrder.orderItems||[], shopName), 600)
                  setCreatedOrder(null)
                }}
                  style={{ padding:'11px', background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.4)', borderRadius:8, color:'#8b5cf6', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                  ⚡ Both
                </button>
              </div>

              <button onClick={() => setCreatedOrder(null)}
                style={{ width:'100%', padding:'8px', background:'transparent', border:'1px solid #2a3348', borderRadius:8, color:'#8892a4', fontSize:12, cursor:'pointer' }}>
                Skip for now
              </button>
            </div>

            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(37,211,102,.06)', border:'1px solid rgba(37,211,102,.15)', borderRadius:8, fontSize:11, color:'#8892a4', textAlign:'center' }}>
              💡 Opens WhatsApp on your device — just tap Send to deliver the order summary!
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE MODAL ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="🗑️ Delete Order"
        footer={<>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding:'8px 18px', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, color:'#ef4444', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {deleting ? 'Deleting...' : '🗑️ Yes, Delete'}
          </button>
        </>}>
        {deleteTarget && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#e2e8f0', marginBottom:6 }}>Delete {deleteTarget.orderNo}?</div>
            <div style={{ fontSize:13, color:'#8892a4' }}>
              Customer: <strong style={{ color:'#e2e8f0' }}>{deleteTarget.customer?.name}</strong><br/>
              Amount: <strong style={{ color:'#ef4444' }}>{formatCurrency(deleteTarget.totalAmount)}</strong>
            </div>
            <div style={{ marginTop:12, fontSize:12, color:'#ef4444', background:'rgba(239,68,68,.08)', borderRadius:8, padding:'8px 14px' }}>
              This cannot be undone.
            </div>
          </div>
        )}
      </Modal>

      {/* ── ADD CUSTOMER MODAL ── */}
      <Modal open={showCustModal} onClose={() => setShowCustModal(false)} title="Add New Customer"
        footer={<><Button onClick={() => setShowCustModal(false)}>Cancel</Button><Button variant="primary" onClick={handleAddCustomer}>💾 Save</Button></>}>
        <form onSubmit={handleAddCustomer}>
          <FormGroup label="Name *"><Input value={custForm.name} onChange={e => setCustForm(p=>({...p,name:e.target.value}))} required /></FormGroup>
          <FormGroup label="Mobile *"><Input value={custForm.mobile} onChange={e => setCustForm(p=>({...p,mobile:e.target.value}))} required /></FormGroup>
          <Grid cols={2} gap={12}>
            <FormGroup label="Email"><Input value={custForm.email} onChange={e => setCustForm(p=>({...p,email:e.target.value}))} /></FormGroup>
            <FormGroup label="City"><Input value={custForm.city} onChange={e => setCustForm(p=>({...p,city:e.target.value}))} /></FormGroup>
          </Grid>
          <FormGroup label="GST No."><Input value={custForm.gstNo} onChange={e => setCustForm(p=>({...p,gstNo:e.target.value}))} placeholder="09XXXXX1234Z1ZX" /></FormGroup>
        </form>
      </Modal>

    </PageShell>
  )
}