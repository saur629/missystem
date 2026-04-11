'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Button, Loading, Empty } from '@/components/ui'
import { formatDate, formatCurrency, ORDER_STATUS } from '@/lib/utils'
import toast from 'react-hot-toast'

function getW(item: any)    { return item.widthFt  ?? item.width  ?? 0 }
function getH(item: any)    { return item.heightFt ?? item.height ?? 0 }
function getUnit(item: any) { return item.unit || 'ft' }
function parseItems(order: any): any[] {
  try { return JSON.parse(order.orderItemsJson || '[]') } catch { return [] }
}
function withParsedItems(order: any) {
  return { ...order, orderItems: parseItems(order) }
}

const CONFIGS: Record<string, any> = {
  designer: {
    title: '🎨 Designer Panel',
    fetchStatuses: ['PENDING', 'DESIGNING', 'DESIGN_DONE'],
    columns: [
      { key: 'PENDING',     label: 'New Orders',    color: '#ef4444', icon: '🔴', action: { label: '🎨 Start Design', nextStatus: 'DESIGNING',   color: '#8b5cf6' } },
      { key: 'DESIGNING',   label: 'In Design',     color: '#8b5cf6', icon: '🎨', action: { label: '✅ Design Done',  nextStatus: 'DESIGN_DONE', color: '#3b82f6' } },
      { key: 'DESIGN_DONE', label: 'Design Done ✓', color: '#3b82f6', icon: '✏️' },
    ],
  },
  printing: {
    title: '🖨️ Printing Room',
    fetchStatuses: ['DESIGN_DONE', 'PRINTING', 'PRINT_DONE'],
    columns: [
      { key: 'DESIGN_DONE', label: 'Ready to Print', color: '#3b82f6', icon: '✏️', action: { label: '🖨️ Start Printing', nextStatus: 'PRINTING',   color: '#f59e0b' } },
      { key: 'PRINTING',    label: 'Printing',        color: '#f59e0b', icon: '🖨️', action: { label: '✅ Print Done',    nextStatus: 'PRINT_DONE', color: '#14b8a6' } },
      { key: 'PRINT_DONE',  label: 'Print Done ✓',    color: '#14b8a6', icon: '📄' },
    ],
  },
  production: {
    title: '📦 Production & Delivery',
    fetchStatuses: ['PRINT_DONE', 'QUALITY_CHECK', 'READY', 'DISPATCHED', 'DELIVERED'],
    columns: [
      { key: 'PRINT_DONE',    label: 'Awaiting QC',  color: '#14b8a6', icon: '📄', action: { label: '🔍 Start QC',         nextStatus: 'QUALITY_CHECK', color: '#f97316' } },
      { key: 'QUALITY_CHECK', label: 'Quality Check', color: '#f97316', icon: '🔍', action: { label: '✅ Pass & Ready',     nextStatus: 'READY',         color: '#10b981' } },
      { key: 'READY',         label: 'Ready',         color: '#10b981', icon: '📦', action: { label: '🚚 Out for Delivery', nextStatus: 'DISPATCHED',    color: '#3b82f6' } },
      { key: 'DISPATCHED',    label: 'Dispatched',    color: '#3b82f6', icon: '🚚', action: { label: '✅ Mark Delivered',   nextStatus: 'DELIVERED',     color: '#10b981' } },
      { key: 'DELIVERED',     label: 'Delivered ✓',   color: '#10b981', icon: '✅' },
    ],
  },
}

// ── DAILY JOB SHEET ────────────────────────────────────────────────────────────
function printDailyJobSheet(orders: any[], date: string, shopName: string) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const now = new Date()
  let rowHtml = '', srNo = 1, totalSqFt = 0, totalAmt = 0

  for (const order of orders) {
    const items = order.orderItems || []
    const rows = items.length > 0 ? items : [null]
    rows.forEach((item: any, idx: number) => {
      const isLegacy = item === null
      const w    = isLegacy ? (order.widthFt ?? order.width ?? '—') : getW(item)
      const h    = isLegacy ? (order.heightFt ?? order.height ?? '—') : getH(item)
      const u    = isLegacy ? 'ft' : getUnit(item)
      const sqft = isLegacy ? (parseFloat(order.sqFt) || 0) : (parseFloat(item?.sqFt) || 0)
      const amt  = isLegacy ? (order.totalAmount || 0) : (item?.amount || 0)
      const desc = isLegacy ? (order.description || '—') : (item?.description || item?.jobName || `Item ${idx+1}`)
      const media = isLegacy ? (order.flexMedia || '—') : (item?.flexMedia || item?.size || '—')
      const rate  = isLegacy ? (order.ratePerSqFt || '—') : (item?.ratePerSqFt || item?.sellingPrice || '—')
      const qty   = isLegacy ? (order.qty || 1) : (item?.qty || 1)
      if (order.orderType === 'FLEX') totalSqFt += sqft
      totalAmt += amt
      rowHtml += `
      <tr style="background:${srNo%2===0?'#f8fafc':'#fff'}">
        <td style="text-align:center;font-weight:700;color:#1a56db;font-size:10px">${srNo++}</td>
        <td style="font-family:monospace;font-size:10px;color:#1a56db;font-weight:700">${order.orderNo}</td>
        <td><div style="font-weight:700;font-size:10px">${order.customer?.name||'—'}</div><div style="font-size:9px;color:#6b7280">${order.customer?.mobile||''}</div></td>
        <td style="text-align:center"><span style="padding:2px 5px;border-radius:3px;font-size:9px;font-weight:700;background:${order.orderType==='FLEX'?'#eff6ff':'#faf5ff'};color:${order.orderType==='FLEX'?'#1a56db':'#7c3aed'}">${order.orderType}</span></td>
        <td style="font-size:10px">${desc}</td>
        <td style="text-align:center;font-size:10px">${media}</td>
        <td style="text-align:center;font-weight:700;font-size:10px">${w} × ${h} <span style="font-size:8px;color:#9ca3af">${u}</span></td>
        <td style="text-align:center;font-weight:700;color:#1a56db;font-size:10px">${sqft>0?sqft.toFixed(2):'—'}</td>
        <td style="text-align:center;font-size:10px">${qty}</td>
        <td style="text-align:center;font-size:10px">₹${rate}</td>
        <td style="text-align:right;font-weight:700;color:#059669;font-size:10px">₹${amt.toLocaleString('en-IN')}</td>
        <td style="text-align:center"><span style="padding:2px 5px;border-radius:3px;font-size:9px;font-weight:700;background:${order.priority==='EXPRESS'?'#fee2e2':order.priority==='URGENT'?'#fef3c7':'#f0fdf4'};color:${order.priority==='EXPRESS'?'#dc2626':order.priority==='URGENT'?'#d97706':'#16a34a'}">${order.priority}</span></td>
        <td style="text-align:center;font-size:9px;color:${order.dueDate&&new Date(order.dueDate)<now?'#dc2626':'#374151'};font-weight:${order.dueDate&&new Date(order.dueDate)<now?'700':'400'}">${order.dueDate?new Date(order.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}</td>
        <td style="font-size:9px;padding:4px 5px"><span style="padding:2px 4px;background:#f3f4f6;border-radius:3px;white-space:nowrap">${ORDER_STATUS[order.status]?.label||order.status}</span></td>
        <td style="text-align:center"><div style="width:14px;height:14px;border:1.5px solid #1a56db;border-radius:2px;margin:0 auto"></div></td>
      </tr>`
    })
  }

  const flexCount = orders.filter(o=>o.orderType==='FLEX').length
  const printCount = orders.filter(o=>o.orderType!=='FLEX').length
  const urgentCount = orders.filter(o=>['URGENT','EXPRESS'].includes(o.priority)).length

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Daily Job Sheet</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:white}
    @page{size:A4 landscape;margin:8mm 10mm}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:10px}
    .shop{font-size:17px;font-weight:800;color:#1a56db}
    .sheet-title{font-size:12px;font-weight:700;color:#374151;margin-top:2px}
    .date-main{font-size:14px;font-weight:800;color:#1a56db;text-align:right}
    .date-sub{font-size:9px;color:#6b7280;text-align:right;margin-top:2px}
    .chips{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
    .chip{padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;display:flex;align-items:center;gap:4px}
    table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed}
    thead tr{background:#1a56db;color:white}
    th{padding:6px 4px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap;overflow:hidden}
    td{padding:5px 4px;border-bottom:1px solid #e5e7eb;vertical-align:middle;overflow:hidden;text-overflow:ellipsis}
    .tfoot-row td{background:#1e3a5f;color:white;font-weight:700;font-size:11px;border:none;padding:6px 4px}
    .notes-section{margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .notes-box{border:1px solid #d1d5db;border-radius:6px;padding:8px 10px}
    .notes-title{font-size:9px;font-weight:700;color:#1a56db;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
    .note-line{border-bottom:1px dashed #d1d5db;height:16px;margin-bottom:5px}
    .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;margin-top:12px}
    .sig-box{text-align:center}
    .sig-line{height:28px;border-bottom:1px solid #374151;margin-bottom:4px}
    .sig-label{font-size:9px;color:#6b7280}
    .footer{margin-top:8px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:6px}
  </style></head><body>
  <div class="header">
    <div><div class="shop">🖨️ ${shopName}</div><div class="sheet-title">DAILY PRINTING JOB SHEET</div></div>
    <div><div class="date-main">📅 ${dateLabel}</div><div class="date-sub">Printed: ${now.toLocaleString('en-IN')}</div></div>
  </div>
  <div class="chips">
    <div class="chip" style="background:#eff6ff;color:#1a56db;border:1px solid #bfdbfe">📋 Total: <strong>${orders.length}</strong></div>
    <div class="chip" style="background:#faf5ff;color:#7c3aed;border:1px solid #e9d5ff">🎨 Flex: <strong>${flexCount}</strong></div>
    <div class="chip" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0">🖨️ Print: <strong>${printCount}</strong></div>
    <div class="chip" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa">⚡ Urgent: <strong>${urgentCount}</strong></div>
    <div class="chip" style="background:#eff6ff;color:#1a56db;border:1px solid #bfdbfe">📐 Sq.Ft: <strong>${totalSqFt.toFixed(2)}</strong></div>
    <div class="chip" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0">💰 Total: <strong>₹${totalAmt.toLocaleString('en-IN')}</strong></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:22px">Sr.</th>
      <th style="width:80px">Order No</th>
      <th style="width:95px">Customer</th>
      <th style="width:44px">Type</th>
      <th>Description / Job</th>
      <th style="width:68px">Media/Size</th>
      <th style="width:76px">Dimensions</th>
      <th style="width:42px">Sq.Ft</th>
      <th style="width:26px">Qty</th>
      <th style="width:48px">Rate</th>
      <th style="width:60px">Amount</th>
      <th style="width:48px">Priority</th>
      <th style="width:38px">Due</th>
      <th style="width:58px">Status</th>
      <th style="width:20px">✓</th>
    </tr></thead>
    <tbody>${rowHtml||`<tr><td colspan="15" style="text-align:center;padding:20px;color:#9ca3af">No jobs found</td></tr>`}</tbody>
    <tfoot><tr class="tfoot-row">
      <td colspan="7" style="text-align:right">TOTALS →</td>
      <td style="text-align:center;color:#6ee7b7">${totalSqFt.toFixed(2)}</td>
      <td></td><td></td>
      <td style="text-align:right;color:#6ee7b7">₹${totalAmt.toLocaleString('en-IN')}</td>
      <td colspan="4"></td>
    </tr></tfoot>
  </table>
  <div class="notes-section">
    <div class="notes-box">
      <div class="notes-title">📝 Supervisor Notes</div>
      <div class="note-line"></div><div class="note-line"></div><div class="note-line"></div><div class="note-line"></div>
    </div>
    <div class="notes-box">
      <div class="notes-title">⚠️ Urgent Orders</div>
      ${orders.filter(o=>['URGENT','EXPRESS'].includes(o.priority)).slice(0,4).map(o=>`<div style="padding:2px 0;border-bottom:1px dashed #e5e7eb;font-size:9px"><strong style="color:#dc2626">${o.priority}</strong> — ${o.orderNo} | ${o.customer?.name||'—'} | Due: ${o.dueDate?new Date(o.dueDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}</div>`).join('')||'<div style="font-size:9px;color:#9ca3af;padding-top:4px">No urgent orders 🎉</div>'}
    </div>
  </div>
  <div class="sig-row">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Prepared By</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Supervisor</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Operator 1</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Operator 2</div></div>
  </div>
  <div class="footer">Daily Job Sheet • ${shopName} • PrintFlow MIS • ${now.toLocaleString('en-IN')}</div>
  </body></html>`

  const win = window.open('', '_blank', 'width=1100,height=700')
  if (!win) { toast.error('Please allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ── INDIVIDUAL JOB CARD A4 ─────────────────────────────────────────────────────
function printJobCard(order: any, shopName: string) {
  const items: any[] = order.orderItems || []
  const now = new Date()
  const isFlex = order.orderType === 'FLEX'

  // Build items rows — FLEX has 8 cols, PRINT has 7 cols
  function buildFlexRow(i: number, sr: number, item: any, w: any, h: any, u: string, sqft: string, qty: any, rate: any, amt: number) {
    return `<tr style="background:${sr%2===0?'#f8fafc':'#fff'}">
      <td style="text-align:center;font-weight:700;color:#1a56db">${sr}</td>
      <td style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${item?.description||`Banner ${i+1}`}</td>
      <td style="overflow:hidden;text-overflow:ellipsis">${item?.flexMedia||order.flexMedia||'—'}</td>
      <td style="text-align:center;font-weight:700">${w}</td>
      <td style="text-align:center;font-weight:700">${h}</td>
      <td style="text-align:center;font-size:9px;color:#6b7280">${u}</td>
      <td style="text-align:center;font-weight:700;color:#1a56db">${sqft}</td>
      <td style="text-align:center">${qty}</td>
      <td style="text-align:center">₹${rate}</td>
      <td style="text-align:right;font-weight:700;color:#059669">₹${amt.toLocaleString('en-IN')}</td>
    </tr>`
  }

  function buildPrintRow(i: number, sr: number, item: any, size: any, qty: any, colors: any, side: any, lam: any, amt: number) {
    return `<tr style="background:${sr%2===0?'#f8fafc':'#fff'}">
      <td style="text-align:center;font-weight:700;color:#1a56db">${sr}</td>
      <td style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${item?.jobName||order.jobName||'—'}</td>
      <td style="text-align:center;overflow:hidden;text-overflow:ellipsis">${size}</td>
      <td style="text-align:center;font-weight:700">${qty}</td>
      <td style="overflow:hidden;text-overflow:ellipsis">${colors}</td>
      <td style="text-align:center">${side}</td>
      <td style="overflow:hidden;text-overflow:ellipsis">${lam||'None'}</td>
      <td style="text-align:right;font-weight:700;color:#059669">₹${amt.toLocaleString('en-IN')}</td>
    </tr>`
  }

  let rowsHtml = ''
  let totalSqFt = 0

  if (items.length > 0) {
    items.forEach((item: any, i: number) => {
      const w = getW(item), h = getH(item), u = getUnit(item)
      const sqft = parseFloat(item.sqFt)||0
      totalSqFt += sqft
      if (isFlex) {
        rowsHtml += buildFlexRow(i, i+1, item, w, h, u, sqft.toFixed(2), item.qty||1, item.ratePerSqFt||'—', item.amount||0)
      } else {
        rowsHtml += buildPrintRow(i, i+1, item, item.size||'—', item.qty||'—', item.colors||'—', item.printSide||'—', item.lamination, item.amount||0)
      }
    })
  } else {
    // Legacy
    const w = order.widthFt??order.width??'—', h = order.heightFt??order.height??'—'
    const sqft = parseFloat(order.sqFt)||0; totalSqFt = sqft
    if (isFlex) {
      rowsHtml = buildFlexRow(0, 1, null, w, h, 'ft', sqft.toFixed(2), 1, order.ratePerSqFt||'—', order.totalAmount||0)
    } else {
      rowsHtml = buildPrintRow(0, 1, null, order.size||'—', order.qty||'—', order.colors||'—', order.printSide||'—', order.lamination, order.totalAmount||0)
    }
  }

  // Checklist items
  const checklist = isFlex ? [
    'File received from customer / designer',
    `Media loaded — ${items[0]?.flexMedia||order.flexMedia||'check media'}`,
    `Size verified — ${items.length>0?items.map((i:any)=>`${getW(i)}×${getH(i)} ${getUnit(i)}`).join(', '):`${order.widthFt??order.width??'?'}×${order.heightFt??order.height??'?'} ft`}`,
    'Print quality checked — colors OK',
    'Cutting / finishing done',
    'Ready for delivery / dispatch',
  ] : [
    'File / design received',
    'Paper loaded — check type & GSM',
    'Size verified',
    'Print test done — colors OK',
    'Cutting / folding done',
    ...(items.some((i:any)=>i.lamination) ? ['Lamination applied'] : []),
    'Quality checked — ready',
  ]

  const wfStatuses = ['PENDING','DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK','READY','DISPATCHED','DELIVERED']
  const wfLabels: Record<string,string> = {PENDING:'Booked',DESIGNING:'Design',DESIGN_DONE:'Design✓',PRINTING:'Printing',PRINT_DONE:'Print✓',QUALITY_CHECK:'QC',READY:'Ready',DISPATCHED:'Dispatch',DELIVERED:'Delivered'}
  const curIdx = wfStatuses.indexOf(order.status)

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Job Card ${order.orderNo}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:white}
    @page{size:A4;margin:8mm 10mm}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:12px}
    .shop{font-size:17px;font-weight:700;color:#1a56db}
    .ctitle{font-size:12px;font-weight:700;color:#1a56db;margin-top:2px}
    .meta{text-align:right;font-size:10px;color:#555}
    .ono{font-size:15px;font-weight:800;color:#1a56db}
    .wf{display:flex;margin-bottom:12px}
    .wf-step{flex:1;text-align:center;font-size:8px;font-weight:700;border-top:3px solid #e5e7eb;padding-top:5px;color:#aaa;overflow:hidden}
    .done{border-color:#10b981!important;color:#059669!important}
    .active{border-color:#1a56db!important;color:#1a56db!important}
    .igrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .ibox{border:1px solid #ddd;border-radius:6px;padding:7px 9px}
    .ilabel{font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
    .ival{font-size:12px;font-weight:600;color:#000}
    .stitle{font-size:10px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:4px 9px;margin-bottom:7px;margin-top:10px;border-radius:0 4px 4px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10px;table-layout:fixed}
    th{background:#1a56db;color:white;padding:5px 4px;text-align:left;font-size:9px;white-space:nowrap;overflow:hidden}
    td{padding:5px 4px;border-bottom:1px solid #e5e7eb;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .totals{display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin-bottom:12px}
    .trow{display:flex;gap:30px;font-size:11px}
    .trow.grand{font-size:14px;font-weight:800;color:#1a56db;border-top:2px solid #1a56db;padding-top:5px;margin-top:3px}
    .tlabel{color:#555;min-width:90px;text-align:right}
    .tval{min-width:70px;text-align:right;font-weight:600}
    .pbox{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700}
    .checklist{border:1px solid #ddd;border-radius:6px;padding:8px 12px;margin-bottom:10px}
    .ci{display:flex;align-items:center;gap:7px;padding:3px 0;border-bottom:1px dashed #eee;font-size:10px}
    .ci:last-child{border-bottom:none}
    .cb{width:12px;height:12px;border:2px solid #1a56db;border-radius:2px;flex-shrink:0}
    .nbox{border:1px solid #ddd;border-radius:6px;padding:8px 10px;min-height:36px;margin-bottom:10px;font-size:10px}
    .sigrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:14px}
    .sigbox{text-align:center}
    .sigline{height:30px;border-bottom:1px solid #000;margin-bottom:4px}
    .siglabel{font-size:9px;color:#555}
    .footer{margin-top:12px;text-align:center;font-size:8px;color:#aaa;border-top:1px solid #eee;padding-top:7px}
    .overdue{color:#dc2626!important;font-weight:700}
  </style></head><body>

  <div class="hdr">
    <div>
      <div class="shop">🖨️ ${shopName}</div>
      <div class="ctitle">PRINTING JOB CARD</div>
    </div>
    <div class="meta">
      <div class="ono">${order.orderNo}</div>
      <div>Date: <strong>${formatDate(order.date)}</strong></div>
      <div>Printed: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
      <div style="margin-top:4px">
        <span class="pbox" style="background:${order.priority==='EXPRESS'?'#fee2e2':order.priority==='URGENT'?'#fef3c7':'#f0fdf4'};color:${order.priority==='EXPRESS'?'#dc2626':order.priority==='URGENT'?'#d97706':'#16a34a'}">
          ${order.priority==='EXPRESS'?'🔴':order.priority==='URGENT'?'🟡':'🟢'} ${order.priority}
        </span>
      </div>
    </div>
  </div>

  <div class="wf">
    ${wfStatuses.map((s,ti)=>{
      const cls = s===order.status?'active':ti<curIdx?'done':''
      return `<div class="wf-step ${cls}">${cls==='done'?'✓ ':cls==='active'?'● ':''}${wfLabels[s]}</div>`
    }).join('')}
  </div>

  <div class="igrid">
    <div class="ibox"><div class="ilabel">Customer</div><div class="ival">${order.customer?.name||'—'}</div></div>
    <div class="ibox"><div class="ilabel">Mobile</div><div class="ival">${order.customer?.mobile||'—'}</div></div>
    <div class="ibox"><div class="ilabel">Order Type</div><div class="ival">${order.orderType}</div></div>
    <div class="ibox"><div class="ilabel">Due Date</div>
      <div class="ival ${order.dueDate&&new Date(order.dueDate)<now?'overdue':''}">
        ${order.dueDate?formatDate(order.dueDate):'—'}${order.dueDate&&new Date(order.dueDate)<now?' ⚠ OVERDUE':''}
      </div>
    </div>
  </div>

  <div class="stitle">📋 Job Items (${items.length>0?items.length:1})</div>
  <table>
    <thead><tr>
      ${isFlex
        ? `<th style="width:24px">Sr.</th>
           <th style="width:21%">Description</th>
           <th style="width:15%">Media</th>
           <th style="width:8%">Width</th>
           <th style="width:8%">Height</th>
           <th style="width:6%">Unit</th>
           <th style="width:8%">Sq.Ft</th>
           <th style="width:5%">Qty</th>
           <th style="width:9%">Rate/sqft</th>
           <th style="width:12%;text-align:right">Amount</th>`
        : `<th style="width:24px">Sr.</th>
           <th style="width:24%">Job Name</th>
           <th style="width:13%">Size</th>
           <th style="width:7%">Qty</th>
           <th style="width:15%">Colors</th>
           <th style="width:10%">Side</th>
           <th style="width:14%">Lamination</th>
           <th style="width:12%;text-align:right">Amount</th>`
      }
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
    ${isFlex?`<tfoot><tr style="background:#eff6ff">
      <td colspan="${isFlex?6:6}" style="text-align:right;font-weight:700;font-size:10px;color:#374151">Total Sq.Ft →</td>
      <td style="text-align:center;font-weight:800;color:#1a56db">${totalSqFt.toFixed(2)}</td>
      <td colspan="2"></td>
      <td style="text-align:right;font-weight:800;color:#059669">₹${(items.length>0?items.reduce((s:number,i:any)=>s+(i.amount||0),0):order.totalAmount||0).toLocaleString('en-IN')}</td>
    </tr></tfoot>`:''}
  </table>

  <div class="totals">
    <div class="trow"><span class="tlabel">Subtotal</span><span class="tval">₹${(order.subTotal||order.totalAmount||0).toLocaleString('en-IN')}</span></div>
    ${order.discount>0?`<div class="trow"><span class="tlabel">Discount</span><span class="tval" style="color:#dc2626">- ₹${order.discount.toLocaleString('en-IN')}</span></div>`:''}
    <div class="trow"><span class="tlabel">GST (${order.gstPct||18}%)</span><span class="tval">₹${(order.gstAmount||0).toLocaleString('en-IN')}</span></div>
    <div class="trow grand"><span class="tlabel">TOTAL</span><span class="tval">₹${(order.totalAmount||0).toLocaleString('en-IN')}</span></div>
    <div class="trow"><span class="tlabel">Advance Paid</span><span class="tval" style="color:#059669">₹${(order.advancePaid||0).toLocaleString('en-IN')}</span></div>
    <div class="trow" style="font-size:13px;font-weight:700;color:${order.balanceDue>0?'#dc2626':'#059669'}"><span class="tlabel">Balance Due</span><span class="tval">₹${(order.balanceDue||0).toLocaleString('en-IN')}</span></div>
  </div>

  ${order.vendorName?`<div class="ibox" style="margin-bottom:12px"><div class="ilabel">Vendor / Outsource</div><div class="ival">${order.vendorName}</div></div>`:''}

  <div class="stitle">📝 Notes / Instructions</div>
  <div class="nbox">${order.notes||'&nbsp;'}</div>

  <div class="stitle">✅ Operator Checklist</div>
  <div class="checklist">
    ${checklist.map(c=>`<div class="ci"><div class="cb"></div> ${c}</div>`).join('')}
  </div>

  <div class="sigrow">
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Operator</div></div>
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Checked By</div></div>
    <div class="sigbox"><div class="sigline"></div><div class="siglabel">Customer Signature</div></div>
  </div>

  <div class="footer">PrintFlow MIS • ${now.toLocaleString('en-IN')} • ${order.orderNo}</div>
  </body></html>`

  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ── ORDER CARD ────────────────────────────────────────────────────────────────
function OrderCard({ order, action, onAction, onPrint }: {
  order: any
  action?: { label: string; nextStatus: string; color: string }
  onAction: (id: string, status: string) => void
  onPrint: (order: any) => void
}) {
  const overdue = order.dueDate && new Date(order.dueDate) < new Date() && !['DELIVERED','CANCELLED'].includes(order.status)
  const items: any[] = order.orderItems || []
  return (
    <div style={{ background: '#1e2535', border: `2px solid ${order.priority==='EXPRESS'?'#ef4444':order.priority==='URGENT'?'#f59e0b':'#2a3348'}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{order.orderNo}</span>
        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700, background: order.priority==='EXPRESS'?'rgba(239,68,68,.15)':order.priority==='URGENT'?'rgba(245,158,11,.15)':'rgba(255,255,255,.05)', color: order.priority==='EXPRESS'?'#ef4444':order.priority==='URGENT'?'#f59e0b':'#8892a4' }}>
          {order.priority}
        </span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{order.customer?.name}</div>
      <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 8 }}>{order.customer?.mobile}</div>
      <div style={{ marginBottom: 8 }}>
        {items.length > 0 ? items.map((item: any, i: number) => {
          const w = getW(item), h = getH(item), u = getUnit(item)
          return (
            <div key={i} style={{ fontSize: 11, padding: '3px 7px', background: 'rgba(59,130,246,.08)', borderRadius: 5, marginBottom: 3, color: '#93c5fd' }}>
              {order.orderType==='FLEX'
                ? `${item.description||`Item ${i+1}`}: ${w}×${h} ${u} = ${item.sqFt?parseFloat(item.sqFt).toFixed(1):0} sqft × qty ${item.qty||1}`
                : `${item.jobName}: ${item.qty} pcs | ${item.size||'—'} | ${item.colors||'—'}`}
            </div>
          )
        }) : (
          <div style={{ fontSize: 11, color: '#8892a4' }}>
            {order.orderType==='FLEX'
              ? `${order.sqFt?.toFixed(1)||0} sqft @ ₹${order.ratePerSqFt||'—'} | ${order.flexMedia||'—'}`
              : `${order.jobName||order.description||'—'} × ${order.qty||1}`}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
        <span style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</span>
        {order.balanceDue > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>Bal: {formatCurrency(order.balanceDue)}</span>}
      </div>
      {order.notes && <div style={{ fontSize: 10, color: '#8892a4', fontStyle: 'italic', padding: '3px 7px', background: '#252d40', borderRadius: 4, marginBottom: 8 }}>{order.notes}</div>}
      {order.dueDate && <div style={{ fontSize: 10, color: overdue?'#ef4444':'#8892a4', fontWeight: overdue?700:400, marginBottom: 8 }}>⏰ {overdue?'OVERDUE! ':''}{formatDate(order.dueDate)}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        {action && (
          <button onClick={() => onAction(order.id, action.nextStatus)}
            style={{ flex: 1, padding: '6px 0', background: `${action.color}18`, border: `1px solid ${action.color}40`, borderRadius: 6, color: action.color, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
            {action.label}
          </button>
        )}
        <button onClick={() => onPrint(order)} title="Print Job Card"
          style={{ padding: '6px 10px', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 6, color: '#3b82f6', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
          🖨️
        </button>
      </div>
    </div>
  )
}

// ── MAIN PANEL ────────────────────────────────────────────────────────────────
export function PanelPage({ panel }: { panel: 'designer' | 'printing' | 'production' }) {
  const config = CONFIGS[panel]
  const [orders, setOrders]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [sheetDate, setSheetDate]     = useState(() => new Date().toISOString().slice(0, 10))
  const [sheetFilter, setSheetFilter] = useState<'all' | 'active'>('active')
  const shopName = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SHOP_NAME || 'PrintFlow') : 'PrintFlow'

  useEffect(() => {
    fetch(`/api/orders?statuses=${config.fetchStatuses.join(',')}`)
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
  }, [panel])

  async function handleAction(id: string, status: string) {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setOrders(p => p.map(o => o.id === id ? { ...o, status } : o))
      toast.success(`${ORDER_STATUS[status]?.icon} ${ORDER_STATUS[status]?.label}`)
    }
  }

  function handlePrint(order: any) { printJobCard(withParsedItems(order), shopName) }

  function handleDailySheet() {
    const filtered = orders.filter(o => {
      const matchDate = sheetDate ? new Date(o.date).toISOString().slice(0,10) === sheetDate : true
      const matchActive = sheetFilter === 'active' ? !['DELIVERED','CANCELLED'].includes(o.status) : true
      return matchDate && matchActive
    }).map(withParsedItems)
    if (filtered.length === 0) { toast.error(`No jobs found for ${sheetDate||'today'}`); return }
    printDailyJobSheet(filtered, sheetDate, shopName)
  }

  const activeCount = orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.status)).length

  return (
    <PageShell title={config.title}>
      <div className="animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 14px', background: '#161b27', border: '1px solid #2a3348', borderRadius: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8892a4', flex: 1 }}>{activeCount} active job{activeCount !== 1 ? 's' : ''}</span>
          {panel === 'printing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: '6px 10px' }}>
              <span style={{ fontSize: 11, color: '#8892a4', fontWeight: 600 }}>📅 Daily Job Sheet:</span>
              <input type="date" value={sheetDate} onChange={e => setSheetDate(e.target.value)}
                style={{ background: '#252d40', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }} />
              <select value={sheetFilter} onChange={e => setSheetFilter(e.target.value as any)}
                style={{ background: '#252d40', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}>
                <option value="active">Active only</option>
                <option value="all">All orders</option>
              </select>
              <button onClick={handleDailySheet}
                style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.4)', borderRadius: 6, color: '#3b82f6', fontSize: 11, fontWeight: 700, padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🖨️ Print Job Sheet
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${config.columns.length}, 1fr)`, gap: 14 }}>
          {config.columns.map((col: any) => {
            const colOrders = orders.filter(o => o.status === col.key)
            return (
              <div key={col.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 10 }}>
                  <span style={{ fontSize: 15 }}>{col.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.label}</span>
                  <span style={{ marginLeft: 'auto', background: `${col.color}18`, color: col.color, padding: '1px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{colOrders.length}</span>
                </div>
                <div style={{ background: '#161b27', border: '1px solid #2a3348', borderRadius: 12, padding: 10, minHeight: 220 }}>
                  {loading ? <Loading /> : colOrders.length === 0 ? <Empty message="No jobs here" /> :
                    colOrders.map(o => <OrderCard key={o.id} order={o} action={col.action} onAction={handleAction} onPrint={handlePrint} />)
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}