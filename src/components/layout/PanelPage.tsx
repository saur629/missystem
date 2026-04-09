'use client'
import { useState, useEffect } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Button, Loading, Empty } from '@/components/ui'
import { formatDate, formatCurrency, ORDER_STATUS } from '@/lib/utils'
import toast from 'react-hot-toast'

// ── HELPERS ────────────────────────────────────────────────────────────────────
function getW(item: any)    { return item.widthFt  ?? item.width  ?? 0 }
function getH(item: any)    { return item.heightFt ?? item.height ?? 0 }
function getUnit(item: any) { return item.unit || 'ft' }
function parseItems(order: any): any[] {
  try { return JSON.parse(order.orderItemsJson || '[]') } catch { return [] }
}
function withParsedItems(order: any) {
  return { ...order, orderItems: parseItems(order) }
}

// ── PANEL CONFIGS ──────────────────────────────────────────────────────────────
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
      { key: 'PRINT_DONE',    label: 'Awaiting QC',  color: '#14b8a6', icon: '📄', action: { label: '🔍 Start QC',          nextStatus: 'QUALITY_CHECK', color: '#f97316' } },
      { key: 'QUALITY_CHECK', label: 'Quality Check', color: '#f97316', icon: '🔍', action: { label: '✅ Pass & Ready',      nextStatus: 'READY',         color: '#10b981' } },
      { key: 'READY',         label: 'Ready',         color: '#10b981', icon: '📦', action: { label: '🚚 Out for Delivery',  nextStatus: 'DISPATCHED',    color: '#3b82f6' } },
      { key: 'DISPATCHED',    label: 'Dispatched',    color: '#3b82f6', icon: '🚚', action: { label: '✅ Mark Delivered',    nextStatus: 'DELIVERED',     color: '#10b981' } },
      { key: 'DELIVERED',     label: 'Delivered ✓',   color: '#10b981', icon: '✅' },
    ],
  },
}

// ── DAILY JOB SHEET GENERATOR ──────────────────────────────────────────────────
function printDailyJobSheet(orders: any[], date: string, shopName: string) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const now = new Date()

  // Flatten all items across all orders for the summary
  let rowHtml = ''
  let srNo = 1
  let totalSqFt = 0
  let totalAmt  = 0

  for (const order of orders) {
    const items = order.orderItems || []

    if (items.length > 0) {
      items.forEach((item: any, idx: number) => {
        const w    = getW(item)
        const h    = getH(item)
        const u    = getUnit(item)
        const sqft = parseFloat(item.sqFt) || 0
        const amt  = item.amount || 0
        if (order.orderType === 'FLEX') totalSqFt += sqft
        totalAmt += amt

        rowHtml += `
        <tr class="${srNo % 2 === 0 ? 'even' : ''}">
          <td class="center bold blue">${srNo++}</td>
          <td class="mono">${order.orderNo}</td>
          <td>
            <div class="cust-name">${order.customer?.name || '—'}</div>
            <div class="cust-mob">${order.customer?.mobile || ''}</div>
          </td>
          <td class="center"><span class="type-badge type-${order.orderType.toLowerCase()}">${order.orderType}</span></td>
          ${order.orderType === 'FLEX' ? `
            <td>${item.description || `Banner ${idx + 1}`}</td>
            <td class="center">${item.flexMedia || '—'}</td>
            <td class="center bold">${w} × ${h} <span class="unit">${u}</span></td>
            <td class="center green bold">${sqft.toFixed(2)}</td>
            <td class="center">${item.qty || 1}</td>
            <td class="center">₹${item.ratePerSqFt || '—'}</td>
          ` : `
            <td>${item.jobName || '—'}</td>
            <td class="center">${item.size || '—'}</td>
            <td class="center">${item.colors || '—'} / ${item.printSide || '—'}</td>
            <td class="center">—</td>
            <td class="center bold">${item.qty || '—'}</td>
            <td class="center">${item.lamination || 'None'}</td>
          `}
          <td class="right green bold">₹${amt.toLocaleString('en-IN')}</td>
          <td class="center"><span class="priority-chip priority-${order.priority.toLowerCase()}">${order.priority}</span></td>
          <td class="center due ${order.dueDate && new Date(order.dueDate) < now ? 'overdue' : ''}">
            ${order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
          </td>
          <td><div class="status-chip">${ORDER_STATUS[order.status]?.label || order.status}</div></td>
          <td class="check-col"><div class="checkbox-print"></div></td>
        </tr>`
      })
    } else {
      // Legacy single-item order
      const sqft = parseFloat(order.sqFt) || 0
      const amt  = order.totalAmount || 0
      const w    = order.widthFt ?? order.width ?? '—'
      const h    = order.heightFt ?? order.height ?? '—'
      if (order.orderType === 'FLEX') totalSqFt += sqft
      totalAmt += amt

      rowHtml += `
      <tr class="${srNo % 2 === 0 ? 'even' : ''}">
        <td class="center bold blue">${srNo++}</td>
        <td class="mono">${order.orderNo}</td>
        <td>
          <div class="cust-name">${order.customer?.name || '—'}</div>
          <div class="cust-mob">${order.customer?.mobile || ''}</div>
        </td>
        <td class="center"><span class="type-badge type-${order.orderType.toLowerCase()}">${order.orderType}</span></td>
        ${order.orderType === 'FLEX' ? `
          <td>${order.description || '—'}</td>
          <td class="center">${order.flexMedia || '—'}</td>
          <td class="center bold">${w} × ${h} <span class="unit">ft</span></td>
          <td class="center green bold">${sqft.toFixed(2)}</td>
          <td class="center">1</td>
          <td class="center">₹${order.ratePerSqFt || '—'}</td>
        ` : `
          <td>${order.jobName || order.description || '—'}</td>
          <td class="center">${order.size || '—'}</td>
          <td class="center">${order.colors || '—'} / ${order.printSide || '—'}</td>
          <td class="center">—</td>
          <td class="center bold">${order.qty || '—'}</td>
          <td class="center">${order.lamination || 'None'}</td>
        `}
        <td class="right green bold">₹${amt.toLocaleString('en-IN')}</td>
        <td class="center"><span class="priority-chip priority-${order.priority.toLowerCase()}">${order.priority}</span></td>
        <td class="center due ${order.dueDate && new Date(order.dueDate) < now ? 'overdue' : ''}">
          ${order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
        </td>
        <td><div class="status-chip">${ORDER_STATUS[order.status]?.label || order.status}</div></td>
        <td class="check-col"><div class="checkbox-print"></div></td>
      </tr>`
    }
  }

  // Summary counts
  const flexCount   = orders.filter(o => o.orderType === 'FLEX').length
  const printCount  = orders.filter(o => o.orderType !== 'FLEX').length
  const urgentCount = orders.filter(o => ['URGENT','EXPRESS'].includes(o.priority)).length

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Job Sheet — ${dateLabel}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: white; }
    @page { size: A4 landscape; margin: 8mm 10mm; }

    /* ── HEADER ── */
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a56db; padding-bottom:10px; margin-bottom:12px; }
    .shop { font-size:18px; font-weight:800; color:#1a56db; }
    .sheet-title { font-size:13px; font-weight:700; color:#374151; margin-top:2px; }
    .date-box { text-align:right; }
    .date-main { font-size:15px; font-weight:800; color:#1a56db; }
    .date-sub { font-size:10px; color:#6b7280; margin-top:2px; }

    /* ── SUMMARY CHIPS ── */
    .summary { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
    .chip { padding:5px 14px; border-radius:20px; font-size:10px; font-weight:700; display:flex; align-items:center; gap:5px; }
    .chip-blue   { background:#eff6ff; color:#1a56db; border:1px solid #bfdbfe; }
    .chip-green  { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
    .chip-orange { background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; }
    .chip-purple { background:#faf5ff; color:#7c3aed; border:1px solid #e9d5ff; }
    .chip-gray   { background:#f9fafb; color:#374151; border:1px solid #e5e7eb; }

    /* ── TABLE ── */
    table { width:100%; border-collapse:collapse; font-size:10px; }
    thead tr { background:#1a56db; color:white; }
    th { padding:6px 5px; text-align:left; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.3px; white-space:nowrap; }
    td { padding:5px 5px; border-bottom:1px solid #e5e7eb; vertical-align:middle; }
    tr.even td { background:#f8fafc; }
    tr:hover td { background:#eff6ff; }

    .center  { text-align:center; }
    .right   { text-align:right; }
    .bold    { font-weight:700; }
    .blue    { color:#1a56db; }
    .green   { color:#059669; }
    .mono    { font-family:monospace; font-size:10px; color:#1a56db; font-weight:700; }
    .unit    { font-size:8px; color:#9ca3af; }

    .cust-name { font-weight:700; font-size:10px; }
    .cust-mob  { font-size:9px; color:#6b7280; }

    .type-badge { padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; }
    .type-flex    { background:#eff6ff; color:#1a56db; }
    .type-offset  { background:#faf5ff; color:#7c3aed; }
    .type-digital { background:#f0fdf4; color:#16a34a; }
    .type-screen  { background:#fff7ed; color:#c2410c; }
    .type-other   { background:#f9fafb; color:#374151; }

    .priority-chip { padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; }
    .priority-express { background:#fee2e2; color:#dc2626; }
    .priority-urgent  { background:#fef3c7; color:#d97706; }
    .priority-normal  { background:#f0fdf4; color:#16a34a; }

    .due { font-size:9px; }
    .overdue { color:#dc2626; font-weight:700; }

    .status-chip { font-size:8px; padding:2px 5px; background:#f3f4f6; border-radius:3px; color:#374151; white-space:nowrap; }

    .check-col { width:22px; }
    .checkbox-print { width:14px; height:14px; border:1.5px solid #1a56db; border-radius:2px; margin:0 auto; }

    /* ── TOTALS ROW ── */
    .totals-row td { background:#1e3a5f; color:white; font-weight:700; font-size:11px; border:none; padding:7px 5px; }
    .totals-row .green { color:#6ee7b7; }

    /* ── NOTES SECTION ── */
    .notes-section { margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .notes-box { border:1px solid #d1d5db; border-radius:6px; padding:8px 10px; }
    .notes-title { font-size:9px; font-weight:700; color:#1a56db; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; border-bottom:1px solid #e5e7eb; padding-bottom:4px; }
    .notes-lines { display:flex; flex-direction:column; gap:5px; }
    .note-line { border-bottom:1px dashed #d1d5db; height:16px; }

    /* ── SIG ROW ── */
    .sig-row { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:16px; margin-top:14px; }
    .sig-box { text-align:center; }
    .sig-line { height:30px; border-bottom:1px solid #374151; margin-bottom:4px; }
    .sig-label { font-size:9px; color:#6b7280; }

    /* ── FOOTER ── */
    .footer { margin-top:10px; text-align:center; font-size:8px; color:#9ca3af; border-top:1px solid #e5e7eb; padding-top:6px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="shop">🖨️ ${shopName}</div>
      <div class="sheet-title">DAILY PRINTING JOB SHEET</div>
    </div>
    <div class="date-box">
      <div class="date-main">📅 ${dateLabel}</div>
      <div class="date-sub">Printed: ${now.toLocaleString('en-IN')}</div>
    </div>
  </div>

  <!-- SUMMARY CHIPS -->
  <div class="summary">
    <div class="chip chip-blue">📋 Total Orders: <strong>${orders.length}</strong></div>
    <div class="chip chip-purple">🎨 Flex / Banner: <strong>${flexCount}</strong></div>
    <div class="chip chip-green">🖨️ Print Jobs: <strong>${printCount}</strong></div>
    <div class="chip chip-orange">⚡ Urgent / Express: <strong>${urgentCount}</strong></div>
    <div class="chip chip-blue">📐 Total Sq.Ft: <strong>${totalSqFt.toFixed(2)}</strong></div>
    <div class="chip chip-green">💰 Total Amount: <strong>₹${totalAmt.toLocaleString('en-IN')}</strong></div>
  </div>

  <!-- MAIN TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width:24px">Sr.</th>
        <th style="width:88px">Order No</th>
        <th style="width:100px">Customer</th>
        <th style="width:46px">Type</th>
        <th>Description / Job</th>
        <th style="width:72px">Media / Size Info</th>
        <th style="width:80px">Dimensions</th>
        <th style="width:44px">Sq.Ft</th>
        <th style="width:28px">Qty</th>
        <th style="width:52px">Rate</th>
        <th style="width:64px">Amount</th>
        <th style="width:50px">Priority</th>
        <th style="width:40px">Due</th>
        <th style="width:60px">Status</th>
        <th style="width:22px">✓</th>
      </tr>
    </thead>
    <tbody>
      ${rowHtml || `<tr><td colspan="15" style="text-align:center;padding:20px;color:#9ca3af;">No jobs found for this date</td></tr>`}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="7" style="text-align:right">TOTALS →</td>
        <td class="center green">${totalSqFt.toFixed(2)}</td>
        <td></td>
        <td></td>
        <td class="right green">₹${totalAmt.toLocaleString('en-IN')}</td>
        <td colspan="4"></td>
      </tr>
    </tfoot>
  </table>

  <!-- NOTES & INSTRUCTIONS -->
  <div class="notes-section">
    <div class="notes-box">
      <div class="notes-title">📝 Supervisor Notes / Instructions</div>
      <div class="notes-lines">
        ${Array(4).fill('<div class="note-line"></div>').join('')}
      </div>
    </div>
    <div class="notes-box">
      <div class="notes-title">⚠️ Special Attention Orders</div>
      <div class="notes-lines">
        ${orders.filter(o => ['URGENT','EXPRESS'].includes(o.priority))
          .slice(0, 4)
          .map(o => `<div style="padding:2px 0;border-bottom:1px dashed #e5e7eb;font-size:9px;"><strong style="color:#dc2626">${o.priority}</strong> — ${o.orderNo} | ${o.customer?.name || '—'} | Due: ${o.dueDate ? new Date(o.dueDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : '—'}</div>`)
          .join('') || '<div style="font-size:9px;color:#9ca3af;padding-top:4px">No urgent orders today 🎉</div>'
        }
      </div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="sig-row">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Prepared By</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Supervisor / Incharge</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Operator 1</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Operator 2</div></div>
  </div>

  <div class="footer">
    Daily Job Sheet • ${shopName} • Generated by PrintFlow MIS • ${now.toLocaleString('en-IN')}
  </div>

</body>
</html>`

  const win = window.open('', '_blank', 'width=1100,height=700')
  if (!win) { toast.error('Please allow popups to print'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ── INDIVIDUAL JOB CARD (A4) ───────────────────────────────────────────────────
function printJobCard(order: any, shopName: string) {
  const items: any[] = order.orderItems || []
  const now = new Date()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Job Card ${order.orderNo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: white; }
    @page { size: A4; margin: 12mm; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a56db; padding-bottom:12px; margin-bottom:14px; }
    .shop-name { font-size:20px; font-weight:700; color:#1a56db; }
    .card-title { font-size:15px; font-weight:700; color:#1a56db; margin-top:2px; }
    .card-meta { text-align:right; font-size:11px; color:#555; }
    .order-no { font-size:18px; font-weight:800; color:#1a56db; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
    .info-box { border:1px solid #ddd; border-radius:6px; padding:8px 10px; }
    .info-label { font-size:9px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
    .info-value { font-size:13px; font-weight:600; color:#000; }
    .section-title { font-size:11px; font-weight:700; color:#1a56db; background:#eff6ff; border-left:4px solid #1a56db; padding:5px 10px; margin-bottom:8px; margin-top:12px; border-radius:0 4px 4px 0; }
    table { width:100%; border-collapse:collapse; margin-bottom:12px; font-size:11px; }
    th { background:#1a56db; color:white; padding:7px 8px; text-align:left; font-size:10px; }
    td { padding:7px 8px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
    tr:nth-child(even) td { background:#f8fafc; }
    .amount-cell { font-weight:700; color:#059669; text-align:right; }
    .totals { display:flex; flex-direction:column; align-items:flex-end; gap:3px; margin-bottom:14px; }
    .total-row { display:flex; gap:40px; font-size:12px; }
    .total-row.grand { font-size:15px; font-weight:800; color:#1a56db; border-top:2px solid #1a56db; padding-top:6px; margin-top:3px; }
    .total-label { color:#555; min-width:100px; text-align:right; }
    .total-val { min-width:80px; text-align:right; font-weight:600; }
    .priority-box { display:inline-block; padding:3px 10px; border-radius:4px; font-size:11px; font-weight:700; }
    .workflow { display:flex; margin-bottom:14px; }
    .wf-step { flex:1; text-align:center; font-size:9px; font-weight:700; border-top:3px solid #e5e7eb; padding-top:6px; color:#aaa; }
    .wf-step.done { border-color:#10b981; color:#059669; }
    .wf-step.active { border-color:#1a56db; color:#1a56db; }
    .checklist { border:1px solid #ddd; border-radius:6px; padding:10px 14px; margin-bottom:12px; }
    .check-item { display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px dashed #eee; font-size:11px; }
    .check-item:last-child { border-bottom:none; }
    .checkbox { width:14px; height:14px; border:2px solid #1a56db; border-radius:2px; flex-shrink:0; }
    .notes-box { border:1px solid #ddd; border-radius:6px; padding:10px; min-height:50px; margin-bottom:12px; font-size:11px; }
    .sig-row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:16px; }
    .sig-box { text-align:center; }
    .sig-line { height:35px; border-bottom:1px solid #000; margin-bottom:5px; }
    .sig-label { font-size:10px; color:#555; }
    .footer { margin-top:14px; text-align:center; font-size:9px; color:#aaa; border-top:1px solid #eee; padding-top:8px; }
    .overdue { color:#dc2626 !important; font-weight:700; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="shop-name">🖨️ ${shopName}</div>
      <div class="card-title">PRINTING JOB CARD</div>
    </div>
    <div class="card-meta">
      <div class="order-no">${order.orderNo}</div>
      <div>Date: <strong>${formatDate(order.date)}</strong></div>
      <div>Printed: ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
      <div style="margin-top:4px">
        <span class="priority-box" style="background:${order.priority === 'EXPRESS' ? '#fee2e2' : order.priority === 'URGENT' ? '#fef3c7' : '#f0fdf4'}; color:${order.priority === 'EXPRESS' ? '#dc2626' : order.priority === 'URGENT' ? '#d97706' : '#16a34a'}">
          ${order.priority === 'EXPRESS' ? '🔴' : order.priority === 'URGENT' ? '🟡' : '🟢'} ${order.priority}
        </span>
      </div>
    </div>
  </div>

  <div class="workflow">
    ${['PENDING','DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK','READY','DISPATCHED','DELIVERED'].map(s => {
      const statuses = ['PENDING','DESIGNING','DESIGN_DONE','PRINTING','PRINT_DONE','QUALITY_CHECK','READY','DISPATCHED','DELIVERED']
      const currentIdx = statuses.indexOf(order.status)
      const thisIdx    = statuses.indexOf(s)
      const cls = s === order.status ? 'active' : thisIdx < currentIdx ? 'done' : ''
      const labels: Record<string,string> = { PENDING:'Booked', DESIGNING:'Design', DESIGN_DONE:'Design✓', PRINTING:'Printing', PRINT_DONE:'Print✓', QUALITY_CHECK:'QC', READY:'Ready', DISPATCHED:'Dispatched', DELIVERED:'Delivered' }
      return `<div class="wf-step ${cls}">${cls === 'done' ? '✓ ' : cls === 'active' ? '● ' : ''}${labels[s]}</div>`
    }).join('')}
  </div>

  <div class="info-grid">
    <div class="info-box"><div class="info-label">Customer</div><div class="info-value">${order.customer?.name || '—'}</div></div>
    <div class="info-box"><div class="info-label">Mobile</div><div class="info-value">${order.customer?.mobile || '—'}</div></div>
    <div class="info-box"><div class="info-label">Order Type</div><div class="info-value">${order.orderType}</div></div>
    <div class="info-box"><div class="info-label">Due Date</div>
      <div class="info-value ${order.dueDate && new Date(order.dueDate) < now ? 'overdue' : ''}">
        ${order.dueDate ? formatDate(order.dueDate) : '—'}${order.dueDate && new Date(order.dueDate) < now ? ' ⚠ OVERDUE' : ''}
      </div>
    </div>
  </div>

  <div class="section-title">📋 Job Items (${items.length > 0 ? items.length : 1})</div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">Sr.</th>
        ${order.orderType === 'FLEX'
          ? `<th>Description</th><th>Media</th><th>Width</th><th>Height</th><th>Unit</th><th>Sq.Ft</th><th>Qty</th><th>Rate/sqft</th><th style="text-align:right">Amount</th>`
          : `<th>Job Name</th><th>Size</th><th>Qty</th><th>Colors</th><th>Side</th><th>Lamination</th><th style="text-align:right">Amount</th>`
        }
      </tr>
    </thead>
    <tbody>
      ${items.length > 0
        ? items.map((item: any, i: number) => {
            const w = getW(item); const h = getH(item); const u = getUnit(item)
            return `<tr>
              <td style="text-align:center;font-weight:700;color:#1a56db">${i + 1}</td>
              ${order.orderType === 'FLEX'
                ? `<td><strong>${item.description || `Banner ${i + 1}`}</strong></td>
                   <td>${item.flexMedia || '—'}</td>
                   <td style="text-align:center;font-weight:600">${w || '—'}</td>
                   <td style="text-align:center;font-weight:600">${h || '—'}</td>
                   <td style="text-align:center;font-size:9px;color:#9ca3af">${u}</td>
                   <td style="text-align:center;font-weight:700;color:#1a56db">${item.sqFt ? parseFloat(item.sqFt).toFixed(2) : '—'}</td>
                   <td style="text-align:center">${item.qty || 1}</td>
                   <td style="text-align:center">₹${item.ratePerSqFt || '—'}</td>
                   <td class="amount-cell">₹${(item.amount || 0).toLocaleString('en-IN')}</td>`
                : `<td><strong>${item.jobName || '—'}</strong></td>
                   <td>${item.size || '—'}</td>
                   <td style="text-align:center;font-weight:600">${item.qty || '—'}</td>
                   <td>${item.colors || '—'}</td>
                   <td>${item.printSide || '—'}</td>
                   <td>${item.lamination || 'None'}</td>
                   <td class="amount-cell">₹${(item.amount || 0).toLocaleString('en-IN')}</td>`
              }</tr>`
          }).join('')
        : (() => {
            const w = order.widthFt ?? order.width ?? '—'
            const h = order.heightFt ?? order.height ?? '—'
            return `<tr>
              <td style="text-align:center;font-weight:700;color:#1a56db">1</td>
              ${order.orderType === 'FLEX'
                ? `<td><strong>${order.description || '—'}</strong></td><td>${order.flexMedia || '—'}</td>
                   <td style="text-align:center;font-weight:600">${w}</td><td style="text-align:center;font-weight:600">${h}</td>
                   <td style="text-align:center;font-size:9px;color:#9ca3af">ft</td>
                   <td style="text-align:center;font-weight:700;color:#1a56db">${order.sqFt ? parseFloat(order.sqFt).toFixed(2) : '—'}</td>
                   <td style="text-align:center">1</td><td style="text-align:center">₹${order.ratePerSqFt || '—'}</td>
                   <td class="amount-cell">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</td>`
                : `<td><strong>${order.jobName || '—'}</strong></td><td>${order.size || '—'}</td>
                   <td style="text-align:center;font-weight:600">${order.qty || '—'}</td>
                   <td>${order.colors || '—'}</td><td>${order.printSide || '—'}</td>
                   <td>${order.lamination || 'None'}</td>
                   <td class="amount-cell">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</td>`
              }</tr>`
          })()
      }
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span class="total-label">Subtotal</span><span class="total-val">₹${(order.subTotal || order.totalAmount || 0).toLocaleString('en-IN')}</span></div>
    ${order.discount > 0 ? `<div class="total-row"><span class="total-label">Discount</span><span class="total-val" style="color:#dc2626">- ₹${order.discount.toLocaleString('en-IN')}</span></div>` : ''}
    <div class="total-row"><span class="total-label">GST (${order.gstPct || 18}%)</span><span class="total-val">₹${(order.gstAmount || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row grand"><span class="total-label">TOTAL</span><span class="total-val">₹${(order.totalAmount || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row"><span class="total-label">Advance Paid</span><span class="total-val" style="color:#059669">₹${(order.advancePaid || 0).toLocaleString('en-IN')}</span></div>
    <div class="total-row" style="font-size:13px;font-weight:700;color:${order.balanceDue > 0 ? '#dc2626' : '#059669'}"><span class="total-label">Balance Due</span><span class="total-val">₹${(order.balanceDue || 0).toLocaleString('en-IN')}</span></div>
  </div>

  ${order.vendorName ? `<div class="info-box" style="margin-bottom:12px"><div class="info-label">Vendor</div><div class="info-value">${order.vendorName}</div></div>` : ''}

  <div class="section-title">📝 Notes</div>
  <div class="notes-box">${order.notes || '&nbsp;'}</div>

  <div class="section-title">✅ Operator Checklist</div>
  <div class="checklist">
    ${order.orderType === 'FLEX' ? `
      <div class="check-item"><div class="checkbox"></div> File received from customer / designer</div>
      <div class="check-item"><div class="checkbox"></div> Media loaded — ${items[0]?.flexMedia || order.flexMedia || 'check media type'}</div>
      <div class="check-item"><div class="checkbox"></div> Size verified — ${items.length > 0 ? items.map((i: any) => `${getW(i)}×${getH(i)} ${getUnit(i)}`).join(', ') : `${order.widthFt ?? order.width ?? '?'}×${order.heightFt ?? order.height ?? '?'} ft`}</div>
      <div class="check-item"><div class="checkbox"></div> Print quality checked — colors OK</div>
      <div class="check-item"><div class="checkbox"></div> Cutting / finishing done</div>
      <div class="check-item"><div class="checkbox"></div> Ready for delivery</div>
    ` : `
      <div class="check-item"><div class="checkbox"></div> File / design received</div>
      <div class="check-item"><div class="checkbox"></div> Paper loaded</div>
      <div class="check-item"><div class="checkbox"></div> Size verified</div>
      <div class="check-item"><div class="checkbox"></div> Print test done — colors OK</div>
      <div class="check-item"><div class="checkbox"></div> Cutting / folding done</div>
      ${items.some((i: any) => i.lamination) ? `<div class="check-item"><div class="checkbox"></div> Lamination applied</div>` : ''}
      <div class="check-item"><div class="checkbox"></div> Quality checked — ready</div>
    `}
  </div>

  <div class="sig-row">
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Operator</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Checked By</div></div>
    <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Customer Signature</div></div>
  </div>

  <div class="footer">PrintFlow MIS • ${now.toLocaleString('en-IN')} • ${order.orderNo}</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html)
  win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ── ORDER CARD (Kanban) ────────────────────────────────────────────────────────
function OrderCard({ order, action, onAction, onPrint }: {
  order: any
  action?: { label: string; nextStatus: string; color: string }
  onAction: (id: string, status: string) => void
  onPrint: (order: any) => void
}) {
  const overdue = order.dueDate && new Date(order.dueDate) < new Date() && !['DELIVERED','CANCELLED'].includes(order.status)
  const items: any[] = order.orderItems || []

  return (
    <div style={{ background: '#1e2535', border: `2px solid ${order.priority === 'EXPRESS' ? '#ef4444' : order.priority === 'URGENT' ? '#f59e0b' : '#2a3348'}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#3b82f6', fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{order.orderNo}</span>
        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700, background: order.priority === 'EXPRESS' ? 'rgba(239,68,68,.15)' : order.priority === 'URGENT' ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.05)', color: order.priority === 'EXPRESS' ? '#ef4444' : order.priority === 'URGENT' ? '#f59e0b' : '#8892a4' }}>
          {order.priority}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 1 }}>{order.customer?.name}</div>
      <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 8 }}>{order.customer?.mobile}</div>

      <div style={{ marginBottom: 8 }}>
        {items.length > 0 ? items.map((item: any, i: number) => {
          const w = getW(item); const h = getH(item); const u = getUnit(item)
          return (
            <div key={i} style={{ fontSize: 11, padding: '3px 7px', background: 'rgba(59,130,246,.08)', borderRadius: 5, marginBottom: 3, color: '#93c5fd' }}>
              {order.orderType === 'FLEX'
                ? `${item.description || `Item ${i + 1}`}: ${w}×${h} ${u} = ${item.sqFt ? parseFloat(item.sqFt).toFixed(1) : 0} sqft × qty ${item.qty || 1}`
                : `${item.jobName}: ${item.qty} pcs | ${item.size || '—'} | ${item.colors || '—'}`
              }
            </div>
          )
        }) : (
          <div style={{ fontSize: 11, color: '#8892a4' }}>
            {order.orderType === 'FLEX'
              ? `${order.sqFt?.toFixed(1) || 0} sqft @ ₹${order.ratePerSqFt || '—'} | ${order.flexMedia || '—'}`
              : `${order.jobName || order.description || '—'} × ${order.qty || 1}`
            }
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
        <span style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</span>
        {order.balanceDue > 0 && <span style={{ color: '#ef4444', fontWeight: 600 }}>Bal: {formatCurrency(order.balanceDue)}</span>}
      </div>

      {order.notes && (
        <div style={{ fontSize: 10, color: '#8892a4', fontStyle: 'italic', padding: '3px 7px', background: '#252d40', borderRadius: 4, marginBottom: 8 }}>{order.notes}</div>
      )}

      {order.dueDate && (
        <div style={{ fontSize: 10, color: overdue ? '#ef4444' : '#8892a4', fontWeight: overdue ? 700 : 400, marginBottom: 8 }}>
          ⏰ {overdue ? 'OVERDUE! ' : ''}{formatDate(order.dueDate)}
        </div>
      )}

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
  const [orders, setOrders]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [sheetDate, setSheetDate]   = useState(() => new Date().toISOString().slice(0, 10))
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

  function handlePrint(order: any) {
    printJobCard(withParsedItems(order), shopName)
  }

  function handleDailySheet() {
    // Filter orders by selected date (using order.date) and parse items
    const filtered = orders
      .filter(o => {
        const orderDate = new Date(o.date).toISOString().slice(0, 10)
        const matchDate = sheetDate ? orderDate === sheetDate : true
        const matchActive = sheetFilter === 'active'
          ? !['DELIVERED', 'CANCELLED'].includes(o.status)
          : true
        return matchDate && matchActive
      })
      .map(withParsedItems)

    if (filtered.length === 0) {
      toast.error(`No jobs found for ${sheetDate || 'today'}`)
      return
    }
    printDailyJobSheet(filtered, sheetDate, shopName)
  }

  const activeCount = orders.filter(o => !['DELIVERED','CANCELLED'].includes(o.status)).length

  return (
    <PageShell title={config.title}>
      <div className="animate-in">

        {/* Info bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 14px', background: '#161b27', border: '1px solid #2a3348', borderRadius: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#8892a4', flex: 1 }}>
            {activeCount} active job{activeCount !== 1 ? 's' : ''}
          </span>

          {/* Daily Job Sheet — only shown in printing panel */}
          {panel === 'printing' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e2535', border: '1px solid #2a3348', borderRadius: 8, padding: '6px 10px' }}>
              <span style={{ fontSize: 11, color: '#8892a4', fontWeight: 600 }}>📅 Daily Job Sheet:</span>
              <input
                type="date"
                value={sheetDate}
                onChange={e => setSheetDate(e.target.value)}
                style={{ background: '#252d40', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
              />
              <select
                value={sheetFilter}
                onChange={e => setSheetFilter(e.target.value as any)}
                style={{ background: '#252d40', border: '1px solid #2a3348', borderRadius: 6, color: '#e2e8f0', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}>
                <option value="active">Active only</option>
                <option value="all">All orders</option>
              </select>
              <button
                onClick={handleDailySheet}
                style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.4)', borderRadius: 6, color: '#3b82f6', fontSize: 11, fontWeight: 700, padding: '5px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🖨️ Print Job Sheet
              </button>
            </div>
          )}
        </div>

        {/* Kanban columns */}
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
                  {loading
                    ? <Loading />
                    : colOrders.length === 0
                      ? <Empty message="No jobs here" />
                      : colOrders.map(o => (
                          <OrderCard key={o.id} order={o} action={col.action} onAction={handleAction} onPrint={handlePrint} />
                        ))
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