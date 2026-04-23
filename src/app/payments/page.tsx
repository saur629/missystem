'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import {
  StatCard, Badge, Button, Modal, FormGroup, Input, Select,
  Card, CardHeader, CardTitle, Loading, Empty, Grid,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const PAYMENT_MODES = ['Cash', 'UPI', 'NEFT/RTGS', 'Cheque', 'Card']
const MODE_ICON: Record<string, string>  = { Cash:'💵', UPI:'📱', 'NEFT/RTGS':'🏦', Cheque:'📝', Card:'💳', CREDIT:'🏷️' }
const MODE_COLOR: Record<string, string> = { Cash:'#10b981', UPI:'#3b82f6', 'NEFT/RTGS':'#8b5cf6', Cheque:'#f59e0b', Card:'#f97316', CREDIT:'#14b8a6' }

// ─────────────────────────────────────────────────────────────────────────────
// printReceipt — UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
function printReceipt(payment: any, shopName: string) {
  const now = new Date()
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt ${payment.receiptNo}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111}@page{size:A5;margin:12mm}
.header{text-align:center;border-bottom:3px double #1a56db;padding-bottom:12px;margin-bottom:14px}
.shop{font-size:20px;font-weight:800;color:#1a56db}.receipt-no{font-size:13px;font-weight:800;color:#1a56db;font-family:monospace;margin-top:4px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
.info-box{border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px}
.info-label{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.info-value{font-size:12px;font-weight:700;color:#111}
.amount-box{background:#1a56db;color:#fff;border-radius:10px;padding:16px;text-align:center;margin:14px 0}
.amount-value{font-size:28px;font-weight:800;font-family:monospace}
.mode-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;margin-top:8px;background:rgba(255,255,255,.2);color:#fff}
.order-ref{background:#f3f4f6;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:11px}
.order-row{display:flex;justify-content:space-between;margin-bottom:4px}
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px}
.sig-line{height:30px;border-bottom:1px solid #374151;margin-bottom:4px}
.sig-label{font-size:9px;color:#6b7280;text-align:center}
.footer{margin-top:14px;text-align:center;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
.thank-you{font-size:13px;font-weight:700;color:#1a56db;text-align:center;margin-top:10px}
</style></head><body>
<div class="header"><div class="shop">🖨️ ${shopName}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">Payment Receipt</div><div class="receipt-no">${payment.receiptNo}</div></div>
<div class="info-grid">
  <div class="info-box"><div class="info-label">Customer</div><div class="info-value">${payment.customer?.name||'—'}</div></div>
  <div class="info-box"><div class="info-label">Mobile</div><div class="info-value" style="color:#1a56db">${payment.customer?.mobile||'—'}</div></div>
  <div class="info-box"><div class="info-label">Date</div><div class="info-value">${new Date(payment.date||payment.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
  <div class="info-box"><div class="info-label">Time</div><div class="info-value">${now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div></div>
</div>
<div class="amount-box">
  <div style="font-size:11px;opacity:.8;margin-bottom:4px">Amount Received</div>
  <div class="amount-value">₹${Number(payment.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
  <div class="mode-badge">${MODE_ICON[payment.mode]||'💰'} ${payment.mode}</div>
</div>
${payment.reference?`<div style="text-align:center;font-size:11px;color:#6b7280;margin-bottom:14px">Ref: <strong>${payment.reference}</strong></div>`:''}
${payment.order?`<div class="order-ref"><div style="font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;margin-bottom:6px">Against Order</div>
<div class="order-row"><span style="color:#6b7280">Order No.</span><span style="font-weight:700;color:#1a56db;font-family:monospace">${payment.order.orderNo}</span></div>
<div class="order-row"><span style="color:#6b7280">This Payment</span><span style="font-weight:600;color:#059669">₹${Number(payment.amount).toLocaleString('en-IN')}</span></div></div>`:''}
${payment.notes?`<div style="background:#f9fafb;border-radius:6px;padding:8px 12px;font-size:11px;color:#6b7280;margin-bottom:14px">📝 ${payment.notes}</div>`:''}
<div class="sig-row">
  <div><div class="sig-line"></div><div class="sig-label">Authorised Signatory</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Customer Signature</div></div>
</div>
<div class="thank-you">🙏 Thank you for your payment!</div>
<div class="footer">${shopName} • ${payment.receiptNo} • ${now.toLocaleString('en-IN')}</div>
</body></html>`
  const win = window.open('','_blank','width=700,height=550')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ─────────────────────────────────────────────────────────────────────────────
// printLedger — UNCHANGED (single customer A4)
// ─────────────────────────────────────────────────────────────────────────────
function printLedger(customer: any, ledgerData: any, shopName: string) {
  const now = new Date()
  const { orders, payments, totalOrders, totalPaid, totalBalance, realCredit } = ledgerData

  const orderRows = orders.map((o: any, i: number) => `
    <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="font-family:monospace;color:#1a56db;font-weight:700">${o.orderNo}</td>
      <td>${new Date(o.date||o.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td>${o.orderType}</td>
      <td style="text-align:right;font-weight:600">₹${(o.totalAmount||0).toLocaleString('en-IN')}</td>
      <td style="text-align:right;color:#1a56db">₹${(o.advancePaid||0).toLocaleString('en-IN')}</td>
      <td style="text-align:right;font-weight:700;color:${Math.max(0,o.balanceDue)>0?'#dc2626':'#059669'}">₹${Math.max(0,(o.balanceDue||0)).toLocaleString('en-IN')}</td>
      <td style="text-align:center"><span style="padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700;background:${Math.max(0,o.balanceDue)<=0?'#dcfce7':'#fee2e2'};color:${Math.max(0,o.balanceDue)<=0?'#16a34a':'#dc2626'}">${Math.max(0,o.balanceDue)<=0?'✅ PAID':'⏳ DUE'}</span></td>
    </tr>`).join('')

  const paymentRows = payments.map((p: any, i: number) => `
    <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="font-family:monospace;color:#1a56db;font-weight:700;font-size:10px">${p.receiptNo}</td>
      <td>${new Date(p.date||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td><span style="padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#eff6ff;color:#1a56db">${p.mode}</span></td>
      <td style="font-family:monospace;font-size:10px">${p.order?.orderNo||'—'}</td>
      <td>${p.reference||'—'}</td>
      <td style="text-align:right;font-weight:700;color:#059669;font-size:13px">₹${(p.amount||0).toLocaleString('en-IN')}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Customer Ledger — ${customer.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#111}@page{size:A4;margin:12mm}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a56db;padding-bottom:12px;margin-bottom:16px}
.shop{font-size:18px;font-weight:800;color:#1a56db}.title{font-size:13px;color:#6b7280;margin-top:3px}
.profile{display:flex;align-items:center;gap:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:14px}
.avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#1a56db,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.sbox{border:1px solid #e5e7eb;border-radius:6px;padding:9px 12px}
.slabel{font-size:9px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.sval{font-size:14px;font-weight:800}
.sec{font-size:10px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:5px 10px;margin:14px 0 8px;border-radius:0 4px 4px 0;text-transform:uppercase}
table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px}
th{background:#1a56db;color:#fff;padding:7px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
td{padding:6px 8px;border-bottom:1px solid #f3f4f6}
.sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px}
.sig-line{height:32px;border-bottom:1px solid #374151;margin-bottom:4px}
.sig-label{font-size:9px;color:#6b7280;text-align:center}
.footer{margin-top:14px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px}
</style></head><body>
<div class="header">
  <div><div class="shop">🖨️ ${shopName}</div><div class="title">Customer Account Ledger</div></div>
  <div style="text-align:right"><div style="font-size:14px;font-weight:800;color:#1a56db">${customer.name}</div>
  <div style="font-size:10px;color:#6b7280;margin-top:2px">${customer.mobile||''}</div>
  <div style="font-size:10px;color:#6b7280">Printed: ${now.toLocaleString('en-IN')}</div></div>
</div>
<div class="profile">
  <div class="avatar">${customer.name.charAt(0).toUpperCase()}</div>
  <div style="flex:1">
    <div style="font-size:16px;font-weight:700;color:#1a56db">${customer.name}</div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px">${customer.mobile||''}${customer.city?` • ${customer.city}`:''}${customer.gstNo?` • GST: ${customer.gstNo}`:''}</div>
  </div>
  ${realCredit>0?`<div style="text-align:right"><div style="font-size:9px;color:#6b7280">Credit Balance</div><div style="font-size:18px;font-weight:800;color:#059669">₹${realCredit.toLocaleString('en-IN')}</div></div>`:''}
</div>
<div class="summary">
  <div class="sbox"><div class="slabel">Total Orders</div><div class="sval" style="color:#1a56db">₹${(totalOrders||0).toLocaleString('en-IN')}</div></div>
  <div class="sbox"><div class="slabel">Total Paid</div><div class="sval" style="color:#059669">₹${(totalPaid||0).toLocaleString('en-IN')}</div></div>
  <div class="sbox"><div class="slabel">Outstanding</div><div class="sval" style="color:${(totalBalance||0)>0?'#dc2626':'#059669'}">₹${(totalBalance||0).toLocaleString('en-IN')}</div></div>
  <div class="sbox"><div class="slabel">Credit Balance</div><div class="sval" style="color:#059669">₹${(realCredit||0).toLocaleString('en-IN')}</div></div>
</div>
<div class="sec">📋 Orders (${orders.length})</div>
<table>
  <thead><tr><th>Order No</th><th>Date</th><th>Type</th><th style="text-align:right">Total</th><th style="text-align:right">Paid</th><th style="text-align:right">Balance</th><th style="text-align:center">Status</th></tr></thead>
  <tbody>${orderRows||'<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:12px">No orders</td></tr>'}</tbody>
  <tfoot><tr style="background:#1a56db;color:#fff;font-weight:700">
    <td colspan="3">TOTAL</td>
    <td style="text-align:right">₹${(totalOrders||0).toLocaleString('en-IN')}</td>
    <td style="text-align:right">₹${payments.reduce((s:number,p:any)=>s+(p.amount||0),0).toLocaleString('en-IN')}</td>
    <td style="text-align:right">₹${(totalBalance||0).toLocaleString('en-IN')}</td>
    <td></td>
  </tr></tfoot>
</table>
<div class="sec">💳 Payment History (${payments.length})</div>
<table>
  <thead><tr><th>Receipt No</th><th>Date</th><th>Mode</th><th>Order Ref</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${paymentRows||'<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:12px">No payments recorded</td></tr>'}</tbody>
  <tfoot><tr style="background:#1a56db;color:#fff;font-weight:700">
    <td colspan="5">TOTAL RECEIVED</td>
    <td style="text-align:right">₹${(totalPaid||0).toLocaleString('en-IN')}</td>
  </tr></tfoot>
</table>
${realCredit>0?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;margin-bottom:12px">
  <div style="font-size:10px;font-weight:700;color:#16a34a;margin-bottom:4px">💰 CREDIT BALANCE AVAILABLE</div>
  <div style="font-size:13px;color:#374151">This customer has <strong style="color:#059669">₹${realCredit.toLocaleString('en-IN')}</strong> credit balance.</div>
</div>`:''}
<div class="sig-row">
  <div><div class="sig-line"></div><div class="sig-label">Prepared By</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Authorised Signatory</div></div>
  <div><div class="sig-line"></div><div class="sig-label">Customer Acknowledgement</div></div>
</div>
<div class="footer">${shopName} • Customer Ledger • ${customer.name} • Generated ${now.toLocaleString('en-IN')}</div>
</body></html>`

  const win = window.open('','_blank','width=900,height=700')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print(); win.close() }
}

// ─────────────────────────────────────────────────────────────────────────────
// printMonthlyLedger — UNCHANGED (existing bulk print function)
// ─────────────────────────────────────────────────────────────────────────────
function printMonthlyLedger(
  allPayments: any[], allOrders: any[], customers: any[],
  shopName: string, monthKey: string
) {
  const now = new Date()
  function inMonth(dateStr: string) {
    if (monthKey === 'all') return true
    return (dateStr || '').slice(0, 7) === monthKey
  }
  const periodPayments = allPayments.filter(p => inMonth((p.date || p.createdAt || '').slice(0, 10)))
  const fmtAmt = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtD   = (d: string) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  const monthLabel = monthKey === 'all' ? 'All Time' : new Date(monthKey + '-01').toLocaleDateString('en-IN', { month:'long', year:'numeric' })

  const blocks = customers.map(c => {
    const custOrders   = allOrders.filter(o => o.customerId === c.id)
    const custPayments = allPayments.filter(p => p.customerId === c.id || p.customer?.id === c.id)
    const periodPay    = periodPayments.filter(p => p.customerId === c.id || p.customer?.id === c.id)
    const totalOrders   = custOrders.reduce((s, o) => s + (o.totalAmount || 0), 0)
    const totalPaid     = custPayments.filter(p => p.type !== 'CREDIT_APPLIED').reduce((s, p) => s + (p.amount || 0), 0)
    const totalBalance  = custOrders.reduce((s, o) => s + Math.max(0, o.balanceDue || 0), 0)
    const creditBalance = Math.max(0, Math.round((totalPaid - totalOrders) * 100) / 100)
    const monthPaid     = periodPay.filter(p => p.type !== 'CREDIT_APPLIED').reduce((s, p) => s + (p.amount || 0), 0)
    return { customer: c, orders: custOrders, payments: custPayments, periodPay, totalOrders, totalPaid, totalBalance, creditBalance, monthPaid }
  }).filter(b => b.orders.length > 0 || b.payments.length > 0)

  const grandTotalOrders  = blocks.reduce((s, b) => s + b.totalOrders, 0)
  const grandTotalPaid    = blocks.reduce((s, b) => s + b.totalPaid, 0)
  const grandTotalBalance = blocks.reduce((s, b) => s + b.totalBalance, 0)
  const grandMonthPaid    = blocks.reduce((s, b) => s + b.monthPaid, 0)
  const grandCredit       = blocks.reduce((s, b) => s + b.creditBalance, 0)
  const modes = ['Cash', 'UPI', 'NEFT/RTGS', 'Cheque', 'Card']
  const modeBreakdown = modes.map(m => ({
    mode: m,
    amount: periodPayments.filter(p => p.mode === m && p.type !== 'CREDIT_APPLIED').reduce((s, p) => s + (p.amount || 0), 0),
    count:  periodPayments.filter(p => p.mode === m).length,
  }))

  const customerSections = blocks.map((b, idx) => {
    const orderRows = b.orders.map((o: any, i: number) => `
      <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="font-family:monospace;color:#1a56db;font-weight:700;font-size:9px">${o.orderNo}</td>
        <td style="font-size:9px">${fmtD(o.date||o.createdAt)}</td>
        <td style="font-size:9px">${o.orderType||'—'}</td>
        <td style="text-align:right;font-weight:600;font-size:9px">${fmtAmt(o.totalAmount||0)}</td>
        <td style="text-align:right;color:#1a56db;font-size:9px">${fmtAmt(o.advancePaid||0)}</td>
        <td style="text-align:right;font-weight:700;font-size:9px;color:${Math.max(0,o.balanceDue||0)>0?'#dc2626':'#16a34a'}">${fmtAmt(Math.max(0,o.balanceDue||0))}</td>
        <td style="text-align:center"><span style="padding:1px 6px;border-radius:3px;font-size:8px;font-weight:700;background:${Math.max(0,o.balanceDue)<=0?'#dcfce7':'#fee2e2'};color:${Math.max(0,o.balanceDue)<=0?'#16a34a':'#dc2626'}">${Math.max(0,o.balanceDue)<=0?'PAID':'DUE'}</span></td>
      </tr>`).join('')
    const payRows = b.payments.map((p: any, i: number) => `
      <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="font-family:monospace;color:#1a56db;font-size:8px;font-weight:700">${p.receiptNo}</td>
        <td style="font-size:9px">${fmtD(p.date||p.createdAt)}</td>
        <td><span style="padding:1px 7px;border-radius:8px;font-size:8px;font-weight:700;background:${MODE_COLOR[p.mode]||'#888'}18;color:${MODE_COLOR[p.mode]||'#888'}">${MODE_ICON[p.mode]||'💰'} ${p.mode}</span></td>
        <td style="font-family:monospace;font-size:9px;color:#1a56db">${p.order?.orderNo||'—'}</td>
        <td style="font-size:9px;color:#6b7280">${p.reference||'—'}</td>
        <td style="font-size:9px;color:#6b7280">${p.notes||'—'}</td>
        <td style="text-align:right;font-weight:700;color:${p.type==='CREDIT_APPLIED'?'#0d9488':'#16a34a'};font-size:11px">${fmtAmt(p.amount||0)}</td>
      </tr>`).join('')
    const showPeriod = monthKey !== 'all' && b.periodPay.length > 0
    const periodRows = b.periodPay.map((p: any, i: number) => `
      <tr style="background:${i%2===0?'#f0fdf4':'#fff'}">
        <td style="font-family:monospace;color:#059669;font-size:8px;font-weight:700">${p.receiptNo}</td>
        <td style="font-size:9px">${fmtD(p.date||p.createdAt)}</td>
        <td><span style="padding:1px 7px;border-radius:8px;font-size:8px;font-weight:700;background:${MODE_COLOR[p.mode]||'#888'}18;color:${MODE_COLOR[p.mode]||'#888'}">${MODE_ICON[p.mode]||'💰'} ${p.mode}</span></td>
        <td style="font-family:monospace;font-size:9px;color:#1a56db">${p.order?.orderNo||'—'}</td>
        <td style="text-align:right;font-weight:700;color:#16a34a;font-size:11px">${fmtAmt(p.amount||0)}</td>
      </tr>`).join('')

    return `<div style="page-break-inside:avoid;margin-bottom:24px;border:1.5px solid #e0e7ef;border-radius:10px;overflow:hidden">
      <div style="background:linear-gradient(90deg,#1a56db,#2563eb,#7c3aed);padding:9px 14px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:#fff">${b.customer.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-size:13px;font-weight:800;color:#fff">${b.customer.name}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.7)">${b.customer.mobile||''}${b.customer.city?' · '+b.customer.city:''}${b.customer.gstNo?' · GST: '+b.customer.gstNo:''}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;text-align:right">
          <div><div style="font-size:8px;color:rgba(255,255,255,.6);text-transform:uppercase">Outstanding</div><div style="font-size:14px;font-weight:900;color:${b.totalBalance>0?'#fca5a5':'#6ee7b7'}">${fmtAmt(b.totalBalance)}</div></div>
          ${showPeriod?`<div><div style="font-size:8px;color:rgba(255,255,255,.6);text-transform:uppercase">${monthLabel} Paid</div><div style="font-size:14px;font-weight:900;color:#6ee7b7">${fmtAmt(b.monthPaid)}</div></div>`:''}
          ${b.creditBalance>0.01?`<div><div style="font-size:8px;color:rgba(255,255,255,.6);text-transform:uppercase">Credit</div><div style="font-size:14px;font-weight:900;color:#6ee7b7">${fmtAmt(b.creditBalance)}</div></div>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid #e5e7eb;background:#fafafa">
        ${[['Orders Value',fmtAmt(b.totalOrders),'#1a56db'],['Total Paid',fmtAmt(b.totalPaid),'#16a34a'],['Outstanding',fmtAmt(b.totalBalance),b.totalBalance>0?'#dc2626':'#16a34a'],['Credit',b.creditBalance>0.01?fmtAmt(b.creditBalance):'—','#059669']].map(([l,v,c],qi)=>`
          <div style="padding:7px 10px;${qi>0?'border-left:1px solid #e5e7eb':''}">
            <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;margin-bottom:2px">${l}</div>
            <div style="font-size:11px;font-weight:800;color:${c}">${v}</div>
          </div>`).join('')}
      </div>
      <div style="padding:10px 12px">
        ${showPeriod?`<div style="margin-bottom:10px">
          <div style="font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;margin-bottom:4px">✨ ${monthLabel} Payments (${b.periodPay.length})</div>
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <thead><tr style="background:#f0fdf4">
              <th style="padding:4px 6px;color:#16a34a;font-size:8px">Receipt No</th><th style="padding:4px 6px;color:#16a34a;font-size:8px">Date</th>
              <th style="padding:4px 6px;color:#16a34a;font-size:8px">Mode</th><th style="padding:4px 6px;color:#16a34a;font-size:8px">Order</th>
              <th style="padding:4px 6px;text-align:right;color:#16a34a;font-size:8px">Amount</th>
            </thead><tbody>${periodRows}</tbody>
            <tfoot><tr style="background:#dcfce7"><td colspan="4" style="padding:4px 6px;font-size:9px;font-weight:700;color:#16a34a">Period Total</td><td style="padding:4px 6px;text-align:right;font-weight:800;font-size:11px;color:#16a34a">${fmtAmt(b.monthPaid)}</td></tr></tfoot>
          </table>
        </div>`:''}
        <div style="margin-bottom:10px">
          <div style="font-size:9px;font-weight:700;color:#1a56db;text-transform:uppercase;margin-bottom:4px">📋 All Orders (${b.orders.length})</div>
          ${b.orders.length===0?'<p style="font-size:10px;color:#9ca3af">No orders</p>':`
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <thead><tr style="background:#eff6ff">
              <th style="padding:4px 6px;color:#1a56db;font-size:8px">Order No</th><th style="padding:4px 6px;color:#1a56db;font-size:8px">Date</th>
              <th style="padding:4px 6px;color:#1a56db;font-size:8px">Type</th><th style="padding:4px 6px;text-align:right;color:#1a56db;font-size:8px">Total</th>
              <th style="padding:4px 6px;text-align:right;color:#1a56db;font-size:8px">Paid</th><th style="padding:4px 6px;text-align:right;color:#1a56db;font-size:8px">Balance</th>
              <th style="padding:4px 6px;text-align:center;color:#1a56db;font-size:8px">Status</th>
            </thead><tbody>${orderRows}</tbody>
            <tfoot><tr style="background:#eff6ff;font-weight:700">
              <td colspan="3" style="padding:4px 6px;font-size:9px">Total</td>
              <td style="padding:4px 6px;text-align:right;font-size:9px">${fmtAmt(b.totalOrders)}</td>
              <td style="padding:4px 6px;text-align:right;color:#1a56db;font-size:9px">${fmtAmt(b.totalPaid)}</td>
              <td style="padding:4px 6px;text-align:right;font-size:9px;color:${b.totalBalance>0?'#dc2626':'#16a34a'}">${fmtAmt(b.totalBalance)}</td><td></td>
            </tr></tfoot>
          </table>`}
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;margin-bottom:4px">💳 Full Payment History (${b.payments.length})</div>
          ${b.payments.length===0?'<p style="font-size:10px;color:#9ca3af">No payments</p>':`
          <table style="width:100%;border-collapse:collapse;font-size:9px">
            <thead><tr style="background:#f0fdf4">
              <th style="padding:4px 6px;color:#16a34a;font-size:8px">Receipt No</th><th style="padding:4px 6px;color:#16a34a;font-size:8px">Date</th>
              <th style="padding:4px 6px;color:#16a34a;font-size:8px">Mode</th><th style="padding:4px 6px;color:#16a34a;font-size:8px">Order</th>
              <th style="padding:4px 6px;color:#16a34a;font-size:8px">Reference</th><th style="padding:4px 6px;color:#16a34a;font-size:8px">Notes</th>
              <th style="padding:4px 6px;text-align:right;color:#16a34a;font-size:8px">Amount</th>
            </thead><tbody>${payRows}</tbody>
            <tfoot><tr style="background:#f0fdf4;font-weight:700">
              <td colspan="6" style="padding:4px 6px;font-size:9px">Total Received</td>
              <td style="padding:4px 6px;text-align:right;font-weight:800;font-size:11px;color:#16a34a">${fmtAmt(b.totalPaid)}</td>
            </tr></tfoot>
          </table>`}
        </div>
        ${b.creditBalance>0.01?`<div style="margin-top:8px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:7px 12px;font-size:10px">💰 <strong style="color:#16a34a">₹${b.creditBalance.toLocaleString('en-IN')} credit</strong> available for future orders.</div>`:''}
      </div>
    </div>`
  }).join('')

  const sortedPeriodPay = [...periodPayments].sort((a,b)=>new Date(a.date||a.createdAt).getTime()-new Date(b.date||b.createdAt).getTime())
  const allPayRows = sortedPeriodPay.map((p,i)=>`
    <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="font-family:monospace;color:#1a56db;font-size:9px;font-weight:700">${p.receiptNo}</td>
      <td style="font-size:9px">${fmtD(p.date||p.createdAt)}</td>
      <td style="font-size:10px;font-weight:600">${p.customer?.name||'—'}</td>
      <td style="font-size:9px;color:#6b7280">${p.customer?.mobile||'—'}</td>
      <td><span style="padding:1px 7px;border-radius:8px;font-size:8px;font-weight:700;background:${MODE_COLOR[p.mode]||'#888'}18;color:${MODE_COLOR[p.mode]||'#888'}">${MODE_ICON[p.mode]||'💰'} ${p.mode}</span></td>
      <td style="font-family:monospace;font-size:9px;color:#1a56db">${p.order?.orderNo||'—'}</td>
      <td style="font-size:9px;color:#6b7280">${p.reference||'—'}</td>
      <td style="text-align:right;font-weight:700;color:${p.type==='CREDIT_APPLIED'?'#0d9488':'#16a34a'};font-size:11px">${fmtAmt(p.amount||0)}</td>
    </tr>`).join('')

  const modeSummaryRows = modeBreakdown.filter(m=>m.amount>0).map(m=>`
    <tr><td style="padding:5px 10px;font-size:11px">${MODE_ICON[m.mode]||'💰'} ${m.mode}</td>
    <td style="padding:5px 10px;text-align:center;font-size:11px">${m.count}</td>
    <td style="padding:5px 10px;text-align:right;font-weight:700;font-size:12px;color:${MODE_COLOR[m.mode]||'#333'}">${fmtAmt(m.amount)}</td></tr>`).join('')

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${shopName} — ${monthLabel} Full Ledger</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;background:#fff}
@page{size:A4;margin:10mm 12mm}@media print{.page-break{page-break-before:always}.no-break{page-break-inside:avoid}}
table{width:100%;border-collapse:collapse}th{background:#1a56db;color:#fff;padding:6px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
td{padding:5px 8px;border-bottom:1px solid #f0f4f8;vertical-align:middle}tfoot td{background:#1e3a8a;color:#fff;font-weight:700}
.section-hdr{background:linear-gradient(90deg,#1a56db,#2563eb);color:#fff;padding:8px 14px;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;display:flex;justify-content:space-between;align-items:center}
.sig-row{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:20px}
.sig-line{height:34px;border-bottom:1.5px solid #374151;margin-bottom:4px}.sig-label{font-size:9px;color:#6b7280;text-align:center;font-weight:600}
.footer-band{background:#1a56db;color:#fff;text-align:center;font-size:9px;padding:7px;margin-top:16px;border-radius:6px}
</style></head><body>
<div style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:linear-gradient(135deg,#eff6ff,#f5f3ff);padding:40px;page-break-after:always">
  <div style="font-size:56px;margin-bottom:14px">🖨️</div>
  <div style="font-size:38px;font-weight:900;color:#1a56db;margin-bottom:6px">${shopName}</div>
  <div style="font-size:18px;font-weight:700;color:#374151;margin-bottom:4px">Full Account Ledger Report</div>
  <div style="font-size:15px;color:#6b7280;margin-bottom:36px">${monthLabel}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:100%;max-width:540px;margin-bottom:30px">
    ${[['Customers',blocks.length,'#1a56db'],['Transactions',periodPayments.length,'#16a34a'],['Orders',allOrders.length,'#7c3aed'],
       ['Orders Value',fmtAmt(grandTotalOrders),'#1a56db'],[monthKey==='all'?'Total Collected':monthLabel+' Collected',fmtAmt(monthKey==='all'?grandTotalPaid:grandMonthPaid),'#16a34a'],
       ['Outstanding',fmtAmt(grandTotalBalance),grandTotalBalance>0?'#dc2626':'#16a34a']].map(([l,v,c])=>`
      <div style="background:#fff;border:1.5px solid #e0e7ef;border-radius:12px;padding:14px 16px;text-align:left">
        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">${l}</div>
        <div style="font-size:20px;font-weight:900;color:${c}">${v}</div>
      </div>`).join('')}
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:24px">
    ${modeBreakdown.filter(m=>m.amount>0).map(m=>`
      <div style="padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;border:1.5px solid ${MODE_COLOR[m.mode]}40;background:${MODE_COLOR[m.mode]}10;color:${MODE_COLOR[m.mode]}">
        ${MODE_ICON[m.mode]} ${m.mode} | ${fmtAmt(m.amount)} (${m.count})</div>`).join('')}
  </div>
  <div style="font-size:10px;color:#9ca3af">Generated by ${shopName} • ${now.toLocaleString('en-IN')} • CONFIDENTIAL</div>
</div>
<div class="page-break"></div>
<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:16px">
  <div><div style="font-size:20px;font-weight:900;color:#1a56db">🖨️ ${shopName}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">Consolidated Summary — ${monthLabel}</div></div>
  <div style="text-align:right;font-size:10px;color:#6b7280"><div>Printed: ${now.toLocaleString('en-IN')}</div><div>Customers: ${blocks.length}</div></div>
</div>
<div class="section-hdr"><span>📊 Customer-wise Summary</span><span style="font-size:10px;font-weight:400;opacity:.8">${blocks.length} customers</span></div>
<table><thead><tr><th>#</th><th>Customer</th><th>Mobile</th><th style="text-align:right">Orders Value</th><th style="text-align:right">Total Paid</th>${monthKey!=='all'?`<th style="text-align:right">${monthLabel} Paid</th>`:''}<th style="text-align:right">Outstanding</th><th style="text-align:right">Credit</th><th style="text-align:center">Status</th></tr></thead>
<tbody>${blocks.map((b,i)=>`<tr style="background:${i%2===0?'#fff':'#f8fafc'}"><td style="font-size:9px;color:#9ca3af">${i+1}</td><td style="font-weight:700;font-size:11px">${b.customer.name}</td><td style="font-size:9px;color:#6b7280">${b.customer.mobile||'—'}</td><td style="text-align:right;font-weight:600">${fmtAmt(b.totalOrders)}</td><td style="text-align:right;color:#16a34a;font-weight:700">${fmtAmt(b.totalPaid)}</td>${monthKey!=='all'?`<td style="text-align:right;color:#2563eb;font-weight:700">${fmtAmt(b.monthPaid)}</td>`:''}<td style="text-align:right;font-weight:700;color:${b.totalBalance>0?'#dc2626':'#16a34a'}">${fmtAmt(b.totalBalance)}</td><td style="text-align:right;color:#16a34a;font-weight:700">${b.creditBalance>0.01?fmtAmt(b.creditBalance):'—'}</td><td style="text-align:center"><span style="padding:2px 7px;border-radius:4px;font-size:8px;font-weight:700;background:${b.totalBalance<=0?'#dcfce7':'#fee2e2'};color:${b.totalBalance<=0?'#16a34a':'#dc2626'}">${b.totalBalance<=0?'✅ CLEAR':'⏳ DUE'}</span></td></tr>`).join('')}</tbody>
<tfoot><tr><td colspan="3">GRAND TOTAL (${blocks.length})</td><td style="text-align:right">${fmtAmt(grandTotalOrders)}</td><td style="text-align:right">${fmtAmt(grandTotalPaid)}</td>${monthKey!=='all'?`<td style="text-align:right">${fmtAmt(grandMonthPaid)}</td>`:''}<td style="text-align:right">${fmtAmt(grandTotalBalance)}</td><td style="text-align:right">${fmtAmt(grandCredit)}</td><td></td></tr></tfoot></table>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px">
  <div><div class="section-hdr"><span>💳 Mode Breakdown</span></div><table><thead><tr><th>Mode</th><th style="text-align:center">Count</th><th style="text-align:right">Amount</th></tr></thead><tbody>${modeSummaryRows||'<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:10px">No transactions</td></tr>'}</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:center">${periodPayments.filter(p=>p.type!=='CREDIT_APPLIED').length}</td><td style="text-align:right">${fmtAmt(monthKey==='all'?grandTotalPaid:grandMonthPaid)}</td></tr></tfoot></table></div>
  <div><div class="section-hdr"><span>⚠️ Outstanding Dues</span></div><table><thead><tr><th>Customer</th><th style="text-align:right">Due Amount</th></tr></thead><tbody>${blocks.filter(b=>b.totalBalance>0.01).map((b,i)=>`<tr style="background:${i%2===0?'#fff':'#fff5f5'}"><td style="font-weight:600;font-size:10px">${b.customer.name}</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmtAmt(b.totalBalance)}</td></tr>`).join()||'<tr><td colspan="2" style="text-align:center;color:#16a34a;padding:10px;font-weight:700">✅ No outstanding dues!</td></tr>'}</tbody><tfoot><tr><td>TOTAL DUE</td><td style="text-align:right">${fmtAmt(grandTotalBalance)}</td></tr></tfoot></table></div>
</div>
<div class="page-break"></div>
<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a56db;padding-bottom:8px;margin-bottom:14px">
  <div style="font-size:14px;font-weight:800;color:#1a56db">🖨️ ${shopName} — Payment Register (${monthLabel})</div>
  <div style="font-size:10px;color:#6b7280">${periodPayments.length} transactions • Total: ${fmtAmt(monthKey==='all'?grandTotalPaid:grandMonthPaid)}</div>
</div>
<div class="section-hdr"><span>📋 All Transactions — Chronological</span><span style="font-size:10px;font-weight:400;opacity:.8">${periodPayments.length} records</span></div>
<table><thead><tr><th>Receipt No</th><th>Date</th><th>Customer</th><th>Mobile</th><th>Mode</th><th>Order Ref</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${allPayRows||'<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:16px">No transactions</td></tr>'}</tbody>
<tfoot><tr><td colspan="7">TOTAL — ${monthLabel}</td><td style="text-align:right">${fmtAmt(monthKey==='all'?grandTotalPaid:grandMonthPaid)}</td></tr></tfoot></table>
<div class="page-break"></div>
<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #1a56db;padding-bottom:10px;margin-bottom:20px">
  <div><div style="font-size:18px;font-weight:900;color:#1a56db">🖨️ ${shopName}</div><div style="font-size:11px;color:#6b7280;margin-top:2px">Individual Customer Ledgers — ${monthLabel}</div></div>
  <div style="text-align:right;font-size:10px;color:#6b7280"><div>${blocks.length} customers</div><div>${now.toLocaleString('en-IN')}</div></div>
</div>
${customerSections}
<div style="margin-top:28px;border:1px solid #e5e7eb;border-radius:8px;padding:14px">
  <div style="font-size:10px;font-weight:700;color:#374151;margin-bottom:12px;text-align:center;text-transform:uppercase;letter-spacing:.5px">Prepared &amp; Verified By</div>
  <div class="sig-row">
    <div><div class="sig-line"></div><div class="sig-label">Prepared By</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Accounts Head</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Authorised Signatory</div></div>
  </div>
</div>
<div class="footer-band">${shopName} • ${monthLabel} Full Account Ledger • Generated ${now.toLocaleString('en-IN')} • CONFIDENTIAL</div>
</body></html>`

  const win = window.open('','_blank','width=1050,height=820')
  if (!win) { toast.error('Allow popups to print'); return }
  win.document.write(html); win.document.close()
  win.onload = () => { win.focus(); win.print() }
}

// ─────────────────────────────────────────────────────────────────────────────
// MonthlyPrintModal — UNCHANGED (existing modal)
// ─────────────────────────────────────────────────────────────────────────────
function MonthlyPrintModal({ open, onClose, customers, shopName }: { open:boolean; onClose:()=>void; customers:any[]; shopName:string }) {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [fetchLoading, setFetchLoading]   = useState(false)
  const [printing, setPrinting]           = useState(false)
  const [allPayments, setAllPayments]     = useState<any[]>([])
  const [allOrders,   setAllOrders]       = useState<any[]>([])
  const [fetched,     setFetched]         = useState(false)
  const [preview,     setPreview]         = useState<any>(null)

  const monthOptions = Array.from({ length:18 }, (_,i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i)
    return { value: d.toISOString().slice(0,7), label: d.toLocaleDateString('en-IN',{month:'long',year:'numeric'}) }
  })

  useEffect(() => { if (open && !fetched) fetchAllData() }, [open])

  async function fetchAllData() {
    setFetchLoading(true)
    try {
      const [pr,or] = await Promise.all([
        fetch('/api/payments?limit=9999').then(r=>r.json()),
        fetch('/api/orders?limit=9999').then(r=>r.json()),
      ])
      const pmts = Array.isArray(pr)?pr:(pr?.payments||[])
      const ords = Array.isArray(or)?or:(or?.orders||[])
      setAllPayments(pmts); setAllOrders(ords); setFetched(true)
      calcPreview(pmts,ords,'')
    } catch { toast.error('Failed to load data') }
    setFetchLoading(false)
  }

  function calcPreview(pmts:any[],ords:any[],month:string) {
    const filtered = month ? pmts.filter(p=>(p.date||p.createdAt||'').slice(0,7)===month) : pmts
    const total  = filtered.filter(p=>p.type!=='CREDIT_APPLIED').reduce((s,p)=>s+(p.amount||0),0)
    const due    = ords.reduce((s,o)=>s+Math.max(0,o.balanceDue||0),0)
    const custs  = new Set(filtered.map(p=>p.customerId||p.customer?.id).filter(Boolean))
    setPreview({ count:filtered.length, total, customers:custs.size, due })
  }

  function handleMonthChange(v:string) { setSelectedMonth(v); calcPreview(allPayments,allOrders,v) }

  async function handlePrint() {
    setPrinting(true)
    await new Promise(r=>setTimeout(r,80))
    printMonthlyLedger(allPayments,allOrders,customers,shopName,selectedMonth||'all')
    setPrinting(false)
  }

  if (!open) return null
  const fmtP = (n:number) => '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2})
  const chosenLabel = selectedMonth ? monthOptions.find(m=>m.value===selectedMonth)?.label||selectedMonth : 'All Time'

  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#161d2e',border:'1px solid #2a3348',borderRadius:18,width:540,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,.5)' }}>
        <div style={{ padding:'20px 24px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:'#e2e8f0' }}>🖨️ Monthly Ledger Report</div>
            <div style={{ fontSize:11,color:'#8892a4',marginTop:4 }}>Full A4 PDF — all customers in one print</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#8892a4',fontSize:22,cursor:'pointer',padding:4 }}>✕</button>
        </div>
        <div style={{ padding:'18px 24px 24px' }}>
          {fetchLoading ? (
            <div style={{ textAlign:'center',padding:'40px 0',color:'#8892a4' }}>
              <div style={{ fontSize:32,marginBottom:12 }}>⏳</div>
              <div style={{ fontWeight:600 }}>Loading all transactions…</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:10,fontWeight:700,color:'#8892a4',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px' }}>Select Period</div>
                <select value={selectedMonth} onChange={e=>handleMonthChange(e.target.value)}
                  style={{ width:'100%',padding:'11px 14px',background:'#1e2535',border:'1.5px solid #2a3348',borderRadius:10,color:'#e2e8f0',fontSize:14,fontWeight:600,cursor:'pointer',outline:'none' }}>
                  <option value="">📅 All Time — Complete Ledger</option>
                  {monthOptions.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {preview && (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:18 }}>
                  {([['Transactions',preview.count,'#3b82f6'],['Amount Collected',fmtP(preview.total),'#10b981'],['Customers',preview.customers,'#8b5cf6'],['Outstanding',fmtP(preview.due),preview.due>0?'#ef4444':'#10b981']] as [string,any,string][]).map(([l,v,c])=>(
                    <div key={l} style={{ background:'#1e2535',border:'1px solid #2a3348',borderRadius:10,padding:'12px 14px' }}>
                      <div style={{ fontSize:9,color:'#8892a4',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:18,fontWeight:800,color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={onClose} style={{ flex:1,padding:'11px 0',background:'transparent',border:'1px solid #2a3348',borderRadius:10,color:'#8892a4',fontSize:13,cursor:'pointer',fontWeight:600 }}>Cancel</button>
                <button onClick={handlePrint} disabled={printing||fetchLoading}
                  style={{ flex:2.5,padding:'11px 0',background:printing?'#374151':'linear-gradient(90deg,#1a56db,#2563eb)',border:'none',borderRadius:10,color:'#fff',fontSize:14,cursor:printing?'default':'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:fetchLoading?0.6:1 }}>
                  {printing?'⏳ Opening Print Dialog…':`🖨️ Print ${chosenLabel} Report`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ✨ NEW: AllLedgersPrintModal
// Fetches ALL payments + orders, then prints every customer ledger in one PDF
// Each customer gets their own A4 page, one after another
// ─────────────────────────────────────────────────────────────────────────────
function AllLedgersPrintModal({ open, onClose, customers, shopName }: { open:boolean; onClose:()=>void; customers:any[]; shopName:string }) {
  const [selectedMonth, setSelectedMonth] = useState('')
  const [fetchLoading, setFetchLoading]   = useState(false)
  const [printing, setPrinting]           = useState(false)
  const [allPayments, setAllPayments]     = useState<any[]>([])
  const [allOrders,   setAllOrders]       = useState<any[]>([])
  const [fetched,     setFetched]         = useState(false)
  const [preview,     setPreview]         = useState<any>(null)

  const monthOptions = Array.from({ length:18 }, (_,i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i)
    return { value: d.toISOString().slice(0,7), label: d.toLocaleDateString('en-IN',{month:'long',year:'numeric'}) }
  })

  useEffect(() => { if (open && !fetched) loadAll() }, [open])

  async function loadAll() {
    setFetchLoading(true)
    try {
      const [pr,or] = await Promise.all([
        fetch('/api/payments?limit=9999').then(r=>r.json()),
        fetch('/api/orders?limit=9999').then(r=>r.json()),
      ])
      const pmts = Array.isArray(pr)?pr:(pr?.payments||[])
      const ords = Array.isArray(or)?or:(or?.orders||[])
      setAllPayments(pmts); setAllOrders(ords); setFetched(true)
      buildPreview(pmts,ords,'')
    } catch { toast.error('Failed to load data') }
    setFetchLoading(false)
  }

  function buildPreview(pmts:any[],ords:any[],month:string) {
    const filtered = month ? pmts.filter(p=>(p.date||p.createdAt||'').slice(0,7)===month) : pmts
    const amount = filtered.filter(p=>p.type!=='CREDIT_APPLIED').reduce((s,p)=>s+(p.amount||0),0)
    const custSet = new Set(filtered.map(p=>p.customerId||p.customer?.id).filter(Boolean))
    setPreview({ payments:filtered.length, amount, customers:custSet.size||customers.length })
  }

  function handleMonthChange(v:string) { setSelectedMonth(v); buildPreview(allPayments,allOrders,v) }

  async function handlePrint() {
    setPrinting(true)
    await new Promise(r=>setTimeout(r,80))

    const now = new Date()
    const monthKey = selectedMonth
    const monthLabel = monthKey ? new Date(monthKey+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'}) : 'All Time'
    const fmtINR = (n:number) => '₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2})
    const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})

    // filter payments by month if selected
    const filteredPayments = monthKey
      ? allPayments.filter(p=>(p.date||p.createdAt||'').slice(0,7)===monthKey)
      : allPayments

    // build one section per customer
    const sections: string[] = []

    customers.forEach((customer, idx) => {
      const orders   = allOrders.filter(o=>o.customerId===customer.id)
      const payments = filteredPayments.filter(p=>p.customerId===customer.id||p.customer?.id===customer.id)
      if (orders.length===0 && payments.length===0) return

      const totalOrders  = orders.reduce((s,o)=>s+(o.totalAmount||0),0)
      const totalPaid    = payments.filter(p=>p.type!=='CREDIT_APPLIED').reduce((s,p)=>s+(p.amount||0),0)
      const totalBalance = orders.reduce((s,o)=>s+Math.max(0,o.balanceDue||0),0)
      const realCredit   = Math.max(0,Math.round((totalPaid-totalOrders)*100)/100)

      const modeRows = ['Cash','UPI','NEFT/RTGS','Cheque','Card','CREDIT']
        .map(m=>({ mode:m, count:payments.filter(p=>p.mode===m).length, total:payments.filter(p=>p.mode===m).reduce((s,p)=>s+(p.amount||0),0) }))
        .filter(r=>r.count>0)

      const monthMap:Record<string,number> = {}
      payments.forEach(p=>{ const k=new Date(p.date||p.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'}); monthMap[k]=(monthMap[k]||0)+(p.amount||0) })
      const monthRows = Object.entries(monthMap).sort((a,b)=>new Date(a[0].split(' ').reverse().join(' ')).getTime()-new Date(b[0].split(' ').reverse().join(' ')).getTime())

      const orderRows = [...orders].sort((a,b)=>new Date(b.date||b.createdAt).getTime()-new Date(a.date||a.createdAt).getTime()).map((o,i)=>{
        const bal=Math.max(0,o.balanceDue||0); const paid=o.advancePaid||0; const pct=o.totalAmount>0?Math.round((paid/o.totalAmount)*100):0
        return `<tr style="background:${i%2===0?'#fff':'#f9fafb'}">
          <td style="font-family:monospace;color:#1a56db;font-weight:800;font-size:10px">${o.orderNo}</td>
          <td style="font-size:10px">${fmtDate(o.date||o.createdAt)}</td>
          <td style="font-size:10px">${o.orderType||'—'}</td>
          <td style="text-align:right;font-weight:700;font-size:10px">${fmtINR(o.totalAmount||0)}</td>
          <td style="text-align:right;color:#1a56db;font-size:10px">${fmtINR(paid)}</td>
          <td style="text-align:right;font-weight:800;font-size:10px;color:${bal>0?'#dc2626':'#16a34a'}">${fmtINR(bal)}</td>
          <td style="text-align:center">
            <div style="background:#e5e7eb;border-radius:20px;height:6px;width:56px;margin:0 auto;overflow:hidden">
              <div style="background:${pct>=100?'#16a34a':pct>=50?'#f59e0b':'#ef4444'};height:100%;width:${Math.min(pct,100)}%;border-radius:20px"></div>
            </div>
            <div style="font-size:8px;color:#6b7280;margin-top:1px">${pct}%</div>
          </td>
          <td style="text-align:center"><span style="padding:2px 7px;border-radius:20px;font-size:8px;font-weight:700;background:${bal<=0?'#dcfce7':bal<(o.totalAmount||0)?'#fef9c3':'#fee2e2'};color:${bal<=0?'#16a34a':bal<(o.totalAmount||0)?'#b45309':'#dc2626'}">${bal<=0?'✅ PAID':bal<(o.totalAmount||0)?'⏳ PARTIAL':'🔴 UNPAID'}</span></td>
        </tr>`}).join('')

      const payRows = [...payments].sort((a,b)=>new Date(b.date||b.createdAt).getTime()-new Date(a.date||a.createdAt).getTime()).map((p,i)=>{
        const isCredit=p.type==='CREDIT_APPLIED'
        return `<tr style="background:${isCredit?'#f0fdf4':i%2===0?'#fff':'#f9fafb'}">
          <td style="font-family:monospace;color:${isCredit?'#059669':'#1a56db'};font-weight:800;font-size:9px">${p.receiptNo}</td>
          <td style="font-size:10px">${fmtDate(p.date||p.createdAt)}</td>
          <td><span style="padding:2px 8px;border-radius:20px;font-size:8px;font-weight:700;background:${(MODE_COLOR[p.mode]||'#888')}18;color:${MODE_COLOR[p.mode]||'#888'};border:1px solid ${(MODE_COLOR[p.mode]||'#888')}30">${MODE_ICON[p.mode]||'💰'} ${p.mode}</span></td>
          <td style="font-family:monospace;font-size:9px;color:#1a56db">${p.order?.orderNo||p.invoice?.invNo||'—'}</td>
          <td style="font-size:9px;color:#6b7280">${p.reference||'—'}</td>
          <td style="font-size:9px;color:#6b7280;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.notes||'—'}</td>
          <td style="text-align:right;font-weight:800;font-size:12px;color:${isCredit?'#059669':'#111'}">${fmtINR(p.amount||0)}</td>
          <td style="text-align:center"><span style="padding:2px 7px;border-radius:20px;font-size:8px;font-weight:700;background:${isCredit?'#dcfce7':'#eff6ff'};color:${isCredit?'#16a34a':'#1a56db'}">${isCredit?'CREDIT':'PAID'}</span></td>
        </tr>`}).join('')

      sections.push(`
      <div style="${idx>0?'page-break-before:always;':''}padding:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px double #1a56db;padding-bottom:10px;margin-bottom:14px">
          <div>
            <div style="font-size:20px;font-weight:900;color:#1a56db">🖨️ ${shopName}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">Customer Account Statement — ${monthLabel}</div>
          </div>
          <div style="text-align:right;font-size:10px;color:#6b7280">
            <div>Printed: ${now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} ${now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
            <div style="margin-top:2px">Customer ${idx+1} of ${customers.length}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,#eff6ff,#f5f3ff);border:1.5px solid #bfdbfe;border-radius:10px;padding:12px 16px;margin-bottom:14px">
          <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#1a56db,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;flex-shrink:0">${customer.name.charAt(0).toUpperCase()}</div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:900;color:#1a56db">${customer.name}</div>
            <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:4px">
              ${customer.mobile?`<span style="font-size:10px;color:#374151">📞 ${customer.mobile}</span>`:''}
              ${customer.email?`<span style="font-size:10px;color:#374151">✉️ ${customer.email}</span>`:''}
              ${customer.city?`<span style="font-size:10px;color:#374151">📍 ${customer.city}</span>`:''}
              ${customer.gstNo?`<span style="font-size:10px;color:#374151;font-weight:700">GST: ${customer.gstNo}</span>`:''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.4px">Status</div>
            <div style="font-size:12px;font-weight:800;margin-top:2px;color:${totalBalance>0?'#dc2626':'#16a34a'}">${totalBalance>0?'⏳ OUTSTANDING':'✅ CLEAR'}</div>
            ${realCredit>0.01?`<div style="font-size:10px;color:#059669;font-weight:700;margin-top:2px">💰 Credit: ${fmtINR(realCredit)}</div>`:''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:12px">
          ${[{label:'Total Orders',value:fmtINR(totalOrders),color:'#1a56db',bg:'#eff6ff',border:'#bfdbfe'},
             {label:'Total Paid',value:fmtINR(totalPaid),color:'#16a34a',bg:'#f0fdf4',border:'#bbf7d0'},
             {label:'Outstanding',value:fmtINR(totalBalance),color:totalBalance>0?'#dc2626':'#16a34a',bg:totalBalance>0?'#fef2f2':'#f0fdf4',border:totalBalance>0?'#fecaca':'#bbf7d0'},
             {label:'Credit Balance',value:fmtINR(realCredit||0),color:'#059669',bg:'#f0fdf4',border:'#bbf7d0'}
          ].map(b=>`<div style="background:${b.bg};border:1.5px solid ${b.border};border-radius:8px;padding:10px 12px"><div style="font-size:8px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">${b.label}</div><div style="font-size:15px;font-weight:900;color:${b.color};font-family:monospace">${b.value}</div></div>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#f8fafc;border-radius:7px;border:1px solid #e5e7eb;margin-bottom:4px">
          <span style="font-size:10px;color:#374151;font-weight:700">📋 ${orders.length} Order${orders.length!==1?'s':''}</span>
          <span style="color:#d1d5db">|</span>
          <span style="font-size:10px;color:#374151;font-weight:700">💳 ${payments.length} Payment${payments.length!==1?'s':''}</span>
          <span style="color:#d1d5db">|</span>
          ${modeRows.map(r=>`<span style="padding:2px 8px;border-radius:20px;font-size:8px;font-weight:700;background:${(MODE_COLOR[r.mode]||'#888')}14;color:${MODE_COLOR[r.mode]||'#888'};border:1px solid ${(MODE_COLOR[r.mode]||'#888')}28">${MODE_ICON[r.mode]||'💰'} ${r.mode}: ${fmtINR(r.total)} (${r.count})</span>`).join('')}
        </div>
        <div style="font-size:10px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:5px 11px;margin:14px 0 7px;border-radius:0 5px 5px 0;text-transform:uppercase">📋 Order Details (${orders.length})</div>
        ${orders.length===0?'<p style="padding:10px;color:#9ca3af;text-align:center;font-size:10px">No orders.</p>':`
        <table style="width:100%;border-collapse:collapse;font-size:9px">
          <thead><tr style="background:#1a56db;color:#fff">
            <th style="padding:6px 8px;text-align:left;font-size:8px">Order No</th><th style="padding:6px 8px;text-align:left;font-size:8px">Date</th><th style="padding:6px 8px;text-align:left;font-size:8px">Type</th>
            <th style="padding:6px 8px;text-align:right;font-size:8px">Total</th><th style="padding:6px 8px;text-align:right;font-size:8px">Paid</th><th style="padding:6px 8px;text-align:right;font-size:8px">Balance</th>
            <th style="padding:6px 8px;text-align:center;font-size:8px">Progress</th><th style="padding:6px 8px;text-align:center;font-size:8px">Status</th>
          </tr></thead>
          <tbody>${orderRows}</tbody>
          <tfoot><tr style="background:#1e3a8a;color:#fff;font-weight:700"><td colspan="3" style="padding:5px 8px;font-size:9px">TOTAL (${orders.length})</td><td style="padding:5px 8px;text-align:right;font-size:9px">${fmtINR(totalOrders)}</td><td style="padding:5px 8px;text-align:right;font-size:9px">${fmtINR(totalPaid)}</td><td style="padding:5px 8px;text-align:right;font-size:9px">${fmtINR(totalBalance)}</td><td colspan="2"></td></tr></tfoot>
        </table>`}
        <div style="font-size:10px;font-weight:700;color:#16a34a;background:#f0fdf4;border-left:4px solid #16a34a;padding:5px 11px;margin:14px 0 7px;border-radius:0 5px 5px 0;text-transform:uppercase">💳 Payment History (${payments.length})</div>
        ${payments.length===0?'<p style="padding:10px;color:#9ca3af;text-align:center;font-size:10px">No payments in this period.</p>':`
        <table style="width:100%;border-collapse:collapse;font-size:9px">
          <thead><tr style="background:#1a56db;color:#fff">
            <th style="padding:6px 8px;font-size:8px">Receipt No</th><th style="padding:6px 8px;font-size:8px">Date</th><th style="padding:6px 8px;font-size:8px">Mode</th>
            <th style="padding:6px 8px;font-size:8px">Against Order</th><th style="padding:6px 8px;font-size:8px">Ref/UTR</th><th style="padding:6px 8px;font-size:8px">Notes</th>
            <th style="padding:6px 8px;text-align:right;font-size:8px">Amount</th><th style="padding:6px 8px;text-align:center;font-size:8px">Type</th>
          </tr></thead>
          <tbody>${payRows}</tbody>
          <tfoot><tr style="background:#1e3a8a;color:#fff;font-weight:700"><td colspan="6" style="padding:5px 8px;font-size:9px">TOTAL RECEIVED (${payments.filter((p:any)=>p.type!=='CREDIT_APPLIED').length})</td><td style="padding:5px 8px;text-align:right;font-size:13px">${fmtINR(totalPaid)}</td><td></td></tr></tfoot>
        </table>`}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px">
          <div>
            <div style="font-size:10px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:5px 11px;margin:12px 0 7px;border-radius:0 5px 5px 0;text-transform:uppercase">💳 Mode Breakdown</div>
            <table style="width:100%;border-collapse:collapse;font-size:9px">
              <thead><tr style="background:#1a56db;color:#fff"><th style="padding:5px 8px;font-size:8px">Mode</th><th style="padding:5px 8px;text-align:center;font-size:8px">Count</th><th style="padding:5px 8px;text-align:right;font-size:8px">Total</th></tr></thead>
              <tbody>${modeRows.length===0?'<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:8px;font-size:10px">—</td></tr>':modeRows.map((r,i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}"><td style="padding:5px 8px"><span style="padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;background:${(MODE_COLOR[r.mode]||'#888')}14;color:${MODE_COLOR[r.mode]||'#888'};border:1px solid ${(MODE_COLOR[r.mode]||'#888')}28">${MODE_ICON[r.mode]||'💰'} ${r.mode}</span></td><td style="padding:5px 8px;text-align:center;font-weight:700;font-size:10px">${r.count}</td><td style="padding:5px 8px;text-align:right;font-weight:700;font-size:10px;color:${MODE_COLOR[r.mode]||'#111'}">${fmtINR(r.total)}</td></tr>`).join('')}</tbody>
              <tfoot><tr style="background:#1e3a8a;color:#fff;font-weight:700"><td style="padding:5px 8px;font-size:9px">TOTAL</td><td style="padding:5px 8px;text-align:center;font-size:9px">${payments.length}</td><td style="padding:5px 8px;text-align:right;font-size:9px">${fmtINR(totalPaid)}</td></tr></tfoot>
            </table>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#1a56db;background:#eff6ff;border-left:4px solid #1a56db;padding:5px 11px;margin:12px 0 7px;border-radius:0 5px 5px 0;text-transform:uppercase">📅 Month-wise Collections</div>
            <table style="width:100%;border-collapse:collapse;font-size:9px">
              <thead><tr style="background:#1a56db;color:#fff"><th style="padding:5px 8px;font-size:8px">Month</th><th style="padding:5px 8px;text-align:right;font-size:8px">Collected</th></tr></thead>
              <tbody>${monthRows.length===0?'<tr><td colspan="2" style="text-align:center;color:#9ca3af;padding:8px;font-size:10px">—</td></tr>':monthRows.map(([month,amt],i)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'}"><td style="padding:5px 8px;font-weight:600;font-size:10px">${month}</td><td style="padding:5px 8px;text-align:right;font-weight:700;font-size:10px;color:#16a34a">${fmtINR(amt as number)}</td></tr>`).join('')}</tbody>
              <tfoot><tr style="background:#1e3a8a;color:#fff;font-weight:700"><td style="padding:5px 8px;font-size:9px">TOTAL</td><td style="padding:5px 8px;text-align:right;font-size:9px">${fmtINR(totalPaid)}</td></tr></tfoot>
            </table>
          </div>
        </div>
        ${realCredit>0.01?`<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:12px 16px;margin-top:14px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;font-weight:800;color:#16a34a;margin-bottom:2px">💰 CREDIT BALANCE AVAILABLE</div><div style="font-size:10px;color:#374151">${customer.name} has <strong style="color:#059669">${fmtINR(realCredit)}</strong> credit available for future orders.</div></div><div style="font-size:22px;font-weight:900;color:#059669;font-family:monospace;flex-shrink:0;margin-left:16px">${fmtINR(realCredit)}</div></div>`:''}
        ${totalBalance>0.01?`<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-top:12px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;font-weight:800;color:#dc2626;margin-bottom:2px">⚠️ OUTSTANDING DUES</div><div style="font-size:10px;color:#374151"><strong style="color:#dc2626">${fmtINR(totalBalance)}</strong> outstanding. Please arrange payment.</div></div><div style="font-size:22px;font-weight:900;color:#dc2626;font-family:monospace;flex-shrink:0;margin-left:16px">${fmtINR(totalBalance)}</div></div>`:`<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:10px 16px;margin-top:12px;text-align:center"><div style="font-size:12px;font-weight:800;color:#16a34a">✅ ALL DUES CLEARED — Account fully settled</div></div>`}
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:22px">
          <div><div style="height:32px;border-bottom:1.5px solid #374151;margin-bottom:4px"></div><div style="font-size:9px;color:#6b7280;text-align:center;font-weight:600">Prepared By</div></div>
          <div><div style="height:32px;border-bottom:1.5px solid #374151;margin-bottom:4px"></div><div style="font-size:9px;color:#6b7280;text-align:center;font-weight:600">Authorised Signatory</div></div>
          <div><div style="height:32px;border-bottom:1.5px solid #374151;margin-bottom:4px"></div><div style="font-size:9px;color:#6b7280;text-align:center;font-weight:600">Customer: ${customer.name}</div></div>
        </div>
        <div style="margin-top:12px;background:#1a56db;color:#fff;border-radius:7px;padding:7px 12px;display:flex;justify-content:space-between;font-size:8px">
          <span>${shopName} • Account Statement • ${monthLabel}</span>
          <span>${customer.name}${customer.mobile?' • '+customer.mobile:''}</span>
          <span>Generated: ${now.toLocaleString('en-IN')} • CONFIDENTIAL</span>
        </div>
      </div>`)
    })

    if (sections.length===0) { toast.error('No data for selected period'); setPrinting(false); return }

    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${shopName} — All Customer Ledgers — ${monthLabel}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;background:#fff}
@page{size:A4;margin:10mm 12mm}@media print{tr{page-break-inside:avoid}}
</style></head><body>${sections.join('\n')}</body></html>`

    const win = window.open('','_blank','width=1050,height=820')
    if (!win) { toast.error('Allow popups to print'); setPrinting(false); return }
    win.document.write(html); win.document.close()
    win.onload = () => { win.focus(); win.print() }
    setPrinting(false)
  }

  if (!open) return null
  const fmtP = (n:number) => '₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2})
  const chosenLabel = selectedMonth ? monthOptions.find(m=>m.value===selectedMonth)?.label||selectedMonth : 'All Time'

  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.65)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#161d2e',border:'1px solid #2a3348',borderRadius:18,width:520,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 64px rgba(0,0,0,.5)' }}>
        <div style={{ padding:'20px 24px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:'#e2e8f0' }}>🖨️ Print All Customer Ledgers</div>
            <div style={{ fontSize:11,color:'#8892a4',marginTop:4 }}>One PDF — every customer's full ledger, page by page</div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'#8892a4',fontSize:22,cursor:'pointer',padding:4 }}>✕</button>
        </div>
        <div style={{ padding:'18px 24px 24px' }}>
          {fetchLoading ? (
            <div style={{ textAlign:'center',padding:'36px 0',color:'#8892a4' }}>
              <div style={{ fontSize:32,marginBottom:12 }}>⏳</div>
              <div style={{ fontWeight:600 }}>Loading all transactions…</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:10,fontWeight:700,color:'#8892a4',marginBottom:7,textTransform:'uppercase',letterSpacing:'.5px' }}>Select Month / Period</div>
                <select value={selectedMonth} onChange={e=>handleMonthChange(e.target.value)}
                  style={{ width:'100%',padding:'11px 14px',background:'#1e2535',border:'1.5px solid #2a3348',borderRadius:10,color:'#e2e8f0',fontSize:14,fontWeight:600,cursor:'pointer',outline:'none' }}>
                  <option value="">📅 All Time — Complete Ledger</option>
                  {monthOptions.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {preview && (
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18 }}>
                  {([['Customers',preview.customers,'#3b82f6'],['Payments',preview.payments,'#10b981'],['Collected',fmtP(preview.amount),'#10b981']] as [string,any,string][]).map(([l,v,c])=>(
                    <div key={l} style={{ background:'#1e2535',border:'1px solid #2a3348',borderRadius:10,padding:'12px 14px' }}>
                      <div style={{ fontSize:9,color:'#8892a4',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4 }}>{l}</div>
                      <div style={{ fontSize:18,fontWeight:800,color:c }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ background:'rgba(59,130,246,.06)',border:'1px solid rgba(59,130,246,.18)',borderRadius:10,padding:'12px 16px',marginBottom:20 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#3b82f6',marginBottom:8 }}>📄 Each customer page includes:</div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:4 }}>
                  {['Customer profile & contact details','Financial summary (4 boxes)','Full order details + progress bars','Complete payment history','Mode-wise breakdown','Month-wise collections','Credit / outstanding notice','Signature block'].map(item=>(
                    <div key={item} style={{ display:'flex',gap:6,alignItems:'flex-start',fontSize:11,color:'#8892a4' }}>
                      <span style={{ color:'#10b981',flexShrink:0 }}>✓</span><span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={onClose} style={{ flex:1,padding:'11px 0',background:'transparent',border:'1px solid #2a3348',borderRadius:10,color:'#8892a4',fontSize:13,cursor:'pointer',fontWeight:600 }}>Cancel</button>
                <button onClick={handlePrint} disabled={printing||fetchLoading}
                  style={{ flex:2.5,padding:'11px 0',background:printing?'#374151':'linear-gradient(90deg,#1a56db,#2563eb)',border:'none',borderRadius:10,color:'#fff',fontSize:14,cursor:printing?'default':'pointer',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:fetchLoading?0.6:1 }}>
                  {printing?'⏳ Generating PDF…':`🖨️ Print All Ledgers — ${chosenLabel}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE — everything inside is exactly as you had it
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const shopName = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SHOP_NAME || 'PrintFlow') : 'PrintFlow'

  const [payments, setPayments]         = useState<any[]>([])
  const [customers, setCustomers]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [editPayment, setEditPayment]   = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting]         = useState(false)
  const [viewLedger, setViewLedger]     = useState<any>(null)
  const [ledgerData, setLedgerData]     = useState<any>(null)
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [search, setSearch]             = useState('')
  const [filterMode, setFilterMode]     = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const PAY_PAGE_SIZE = 50
  const [payPage, setPayPage]           = useState(1)
  const [payTotal, setPayTotal]         = useState(0)
  const [payTotalPages, setPayTotalPages] = useState(1)
  const [form, setForm] = useState({ customerId:'', orderId:'', amount:'', mode:'Cash', reference:'', notes:'', date: new Date().toISOString().slice(0,10) })
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const [editForm, setEditForm] = useState({ amount:'', mode:'Cash', reference:'', notes:'', date:'' })
  const ef = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }))
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder]   = useState<any>(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditCustomer, setCreditCustomer]   = useState<any>(null)
  const [creditOrderId, setCreditOrderId]     = useState('')
  const [creditAmount, setCreditAmount]       = useState('')
  const [creditOrders, setCreditOrders]       = useState<any[]>([])
  const [creditAvailable, setCreditAvailable] = useState(0)
  const [showMonthlyPrint, setShowMonthlyPrint] = useState(false)  // existing
  const [showAllLedgers, setShowAllLedgers]     = useState(false)  // NEW

  const refreshCustomers = useCallback(() => {
    fetch('/api/customers').then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
  }, [])

  const fetchPayments = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMode)     params.set('mode', filterMode)
    if (filterCustomer) params.set('customerId', filterCustomer)
    if (search)         params.set('search', search)
    params.set('page', String(page))
    params.set('limit', String(PAY_PAGE_SIZE))
    const data = await fetch(`/api/payments?${params}`).then(r => r.json())
    if (data && typeof data === 'object' && 'payments' in data) {
      setPayments(Array.isArray(data.payments) ? data.payments : [])
      setPayTotal(data.total || 0)
      setPayTotalPages(data.totalPages || 1)
      setPayPage(page)
    } else {
      setPayments(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [filterMode, filterCustomer, search])

  useEffect(() => { fetchPayments(1) }, [fetchPayments])
  useEffect(() => { refreshCustomers() }, [refreshCustomers])

  useEffect(() => {
    if (!form.customerId) { setCustomerOrders([]); setSelectedOrder(null); f('orderId',''); return }
    fetch(`/api/orders?customerId=${form.customerId}`).then(r => r.json()).then(d => {
      const sorted = (Array.isArray(d) ? d : []).sort((a:any,b:any) => (b.balanceDue||0) - (a.balanceDue||0))
      setCustomerOrders(sorted)
    })
  }, [form.customerId])

  useEffect(() => {
    if (!form.orderId) { setSelectedOrder(null); return }
    const o = customerOrders.find(o => o.id === form.orderId)
    setSelectedOrder(o || null)
    if (o && (o.balanceDue || 0) > 0) f('amount', String(o.balanceDue.toFixed(2)))
  }, [form.orderId, customerOrders])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerId) { toast.error('Select a customer'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...form, amount: parseFloat(form.amount), orderId: form.orderId || null }) })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const payment = await res.json()
      setPayments(p => [payment, ...p]); refreshCustomers(); setShowModal(false); resetForm()
      if ((payment.creditAdded||0) > 0.01) toast.success(`✅ ${payment.receiptNo} — ₹${payment.creditAdded.toLocaleString('en-IN')} stored as credit!`, { duration:6000 })
      else toast.success(`✅ Receipt ${payment.receiptNo} recorded!`)
    } catch (err: any) { toast.error(err.message || 'Failed') }
    setSaving(false)
  }

  function openEdit(p: any) {
    setEditPayment(p)
    setEditForm({ amount:String(p.amount), mode:p.mode||'Cash', reference:p.reference||'', notes:p.notes||'', date:p.date?new Date(p.date).toISOString().slice(0,10):new Date().toISOString().slice(0,10) })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPayment) return
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/payments/${editPayment.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...editForm, amount: parseFloat(editForm.amount) }) })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const updated = await res.json()
      setPayments(p => p.map(x => x.id === updated.id ? updated : x)); setEditPayment(null); toast.success(`✅ Payment updated`)
    } catch (err: any) { toast.error(err.message || 'Failed') }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/payments/${deleteTarget.id}`, { method:'DELETE' })
      if (!res.ok) throw new Error()
      setPayments(p => p.filter(x => x.id !== deleteTarget.id)); refreshCustomers(); setDeleteTarget(null); toast.success('🗑️ Payment deleted and balance restored')
    } catch { toast.error('Failed to delete') }
    setDeleting(false)
  }

  async function openLedger(customer: any) {
    if (!customer?.id) return
    setViewLedger(customer); setLedgerLoading(true)
    const [pmts,ords] = await Promise.all([fetch(`/api/payments?customerId=${customer.id}`).then(r=>r.json()), fetch(`/api/orders?customerId=${customer.id}`).then(r=>r.json())])
    const paymentList = Array.isArray(pmts)?pmts:[]
    const orderList   = Array.isArray(ords)?ords:[]
    const totalOrders  = orderList.reduce((s:number,o:any)=>s+(o.totalAmount||0),0)
    const totalPaid    = paymentList.filter((p:any)=>p.type!=='CREDIT_APPLIED').reduce((s:number,p:any)=>s+(p.amount||0),0)
    const totalBalance = orderList.reduce((s:number,o:any)=>s+Math.max(0,o.balanceDue||0),0)
    const realCredit   = Math.max(0,Math.round((totalPaid-totalOrders)*100)/100)
    setLedgerData({ payments:paymentList, orders:orderList, totalOrders, totalPaid, totalBalance, realCredit }); setLedgerLoading(false)
  }

  async function openCreditApply(customer: any) {
    if (!customer?.id) return
    setCreditCustomer(customer); setCreditOrderId(''); setCreditAmount('')
    const [pmts,ords] = await Promise.all([fetch(`/api/payments?customerId=${customer.id}`).then(r=>r.json()), fetch(`/api/orders?customerId=${customer.id}`).then(r=>r.json())])
    const paymentList = Array.isArray(pmts)?pmts:[]
    const orderList   = Array.isArray(ords)?ords:[]
    const totalOrders = orderList.reduce((s:number,o:any)=>s+(o.totalAmount||0),0)
    const totalPaid   = paymentList.filter((p:any)=>p.type!=='CREDIT_APPLIED').reduce((s:number,p:any)=>s+(p.amount||0),0)
    const credit      = Math.max(0,Math.round((totalPaid-totalOrders)*100)/100)
    const dbCredit    = Math.max(0,customer.balance||0)
    setCreditAvailable(Math.max(credit,dbCredit))
    setCreditOrders(orderList.filter((o:any)=>(o.balanceDue||0)>0))
    setShowCreditModal(true); setViewLedger(null); setLedgerData(null)
  }

  async function handleApplyCredit(e: React.FormEvent) {
    e.preventDefault()
    if (!creditOrderId) { toast.error('Select an order'); return }
    if (!creditAmount || parseFloat(creditAmount) <= 0) { toast.error('Enter amount'); return }
    const amt = parseFloat(creditAmount)
    if (amt > creditAvailable + 0.01) { toast.error(`Max credit: ₹${creditAvailable.toLocaleString('en-IN')}`); return }
    setSaving(true)
    try {
      const res = await fetch('/api/payments', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ customerId:creditCustomer.id, applyCredit:{ orderId:creditOrderId, amount:amt } }) })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Failed') }
      const result = await res.json()
      fetchPayments(); refreshCustomers(); setShowCreditModal(false)
      toast.success(`✅ ₹${amt.toLocaleString('en-IN')} credit applied! Receipt: ${result.receiptNo}`, { duration:6000 })
    } catch (err: any) { toast.error(err.message || 'Failed to apply credit') }
    setSaving(false)
  }

  function resetForm() {
    setForm({ customerId:'', orderId:'', amount:'', mode:'Cash', reference:'', notes:'', date:new Date().toISOString().slice(0,10) })
    setCustomerOrders([]); setSelectedOrder(null)
  }

  const today    = new Date().toISOString().slice(0,10)
  const todayAmt = payments.filter(p=>new Date(p.date||p.createdAt).toISOString().slice(0,10)===today).reduce((s,p)=>s+(p.amount||0),0)
  const totalAmt = payments.filter(p=>p.type!=='CREDIT_APPLIED').reduce((s,p)=>s+(p.amount||0),0)
  const cashAmt  = payments.filter(p=>p.mode==='Cash').reduce((s,p)=>s+(p.amount||0),0)
  const upiAmt   = payments.filter(p=>p.mode==='UPI').reduce((s,p)=>s+(p.amount||0),0)
  const amountOver = selectedOrder && parseFloat(form.amount||'0') > (selectedOrder.balanceDue||0)
  const overpayAmt = amountOver ? parseFloat(form.amount||'0') - (selectedOrder?.balanceDue||0) : 0
  const filtered = payments.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return String(p.receiptNo||'').toLowerCase().includes(s)||String(p.customer?.name||'').toLowerCase().includes(s)||String(p.customer?.mobile||'').includes(s)||String(p.reference||'').toLowerCase().includes(s)
  })
  const customersWithCredit = customers.filter(c=>(c.balance||0)>0.01)

  return (
    <PageShell title="💳 Payment Management" action={{ label:'+ Record Payment', onClick:()=>setShowModal(true) }}>
      <div className="animate-in">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          <StatCard label="Total Receipts"     value={payments.length}          icon="🧾" color="blue" />
          <StatCard label="Today's Collection" value={formatCurrency(todayAmt)} icon="📅" color="green" />
          <StatCard label="Total Collected"    value={formatCurrency(totalAmt)} icon="💰" color="green" />
          <StatCard label="Cash"               value={formatCurrency(cashAmt)}  icon="💵" color="yellow" />
          <StatCard label="UPI"                value={formatCurrency(upiAmt)}   icon="📱" color="blue" />
        </div>

        {customersWithCredit.length > 0 && (
          <div style={{ background:'rgba(16,185,129,.07)', border:'1px solid rgba(16,185,129,.25)', borderRadius:10, padding:'10px 16px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#10b981', marginBottom:8 }}>💰 Customers with Credit Balance</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {customersWithCredit.map(c => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.3)', borderRadius:8, padding:'5px 12px' }}>
                  <span style={{ fontWeight:700, fontSize:12 }}>{c.name}</span>
                  <span style={{ fontSize:11, color:'#10b981', fontWeight:700 }}>₹{(c.balance||0).toLocaleString('en-IN')}</span>
                  <button onClick={() => openCreditApply(c)} style={{ padding:'2px 10px', background:'rgba(16,185,129,.2)', border:'1px solid rgba(16,185,129,.4)', borderRadius:6, color:'#10b981', fontSize:11, cursor:'pointer', fontWeight:700 }}>Apply →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
          <Input placeholder="🔍 Receipt no, customer, mobile..." value={searchInput}
            onChange={e => { setSearchInput(e.target.value); clearTimeout((window as any).__paySearchTimer); (window as any).__paySearchTimer = setTimeout(() => { setSearch(e.target.value); setPayPage(1) }, 350) }}
            onKeyDown={e => { if (e.key==='Enter') { clearTimeout((window as any).__paySearchTimer); setSearch(searchInput); fetchPayments(1) } }}
            style={{ flex:1, minWidth:220 }} />
          <Select style={{ width:130 }} value={filterMode} onChange={e => setFilterMode(e.target.value)}>
            <option value="">All Modes</option>
            {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
          </Select>
          <Select style={{ width:180 }} value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Button onClick={() => { clearTimeout((window as any).__paySearchTimer); setSearch(searchInput); fetchPayments(1) }}>Search</Button>
          <Button variant="primary" onClick={() => setShowModal(true)}>+ Record Payment</Button>
          {/* Monthly summary report (existing) */}
          <button onClick={() => setShowMonthlyPrint(true)}
            style={{ padding:'0 16px', height:38, background:'linear-gradient(90deg,rgba(139,92,246,.15),rgba(59,130,246,.15))', border:'1px solid rgba(139,92,246,.4)', borderRadius:8, color:'#a78bfa', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
            🖨️ Monthly Report
          </button>
          {/* NEW: Print all customer ledgers in one PDF */}
          <button onClick={() => setShowAllLedgers(true)}
            style={{ padding:'0 16px', height:38, background:'linear-gradient(90deg,rgba(16,185,129,.15),rgba(59,130,246,.15))', border:'1px solid rgba(16,185,129,.4)', borderRadius:8, color:'#10b981', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap' }}>
            🖨️ All Ledgers PDF
          </button>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#8892a4', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.5px' }}>📊 Customer Ledger</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {customers.slice(0,15).map(c => (
              <button key={c.id} onClick={() => openLedger(c)}
                style={{ padding:'4px 12px', background:'#1e2535', border:`1px solid ${(c.balance||0)>0.01?'rgba(16,185,129,.4)':'#2a3348'}`, borderRadius:20, color:(c.balance||0)>0.01?'#10b981':'#8892a4', fontSize:11, cursor:'pointer' }}>
                👤 {c.name}{(c.balance||0)>0.01?` • ₹${Math.max(0,c.balance).toLocaleString('en-IN')} credit`:''}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment History ({payTotal > 0 ? payTotal : payments.length} total)</CardTitle>
            <div style={{ fontSize:11, color:'#8892a4' }}>Today: <strong style={{ color:'#10b981' }}>{formatCurrency(todayAmt)}</strong></div>
          </CardHeader>
          {loading ? <Loading /> : filtered.length===0 ? <Empty message="No payments recorded yet." /> : (
            <div style={{ overflowX:'auto' }}>
              <table>
                <thead><tr>
                  <th>Receipt No</th><th>Date</th><th>Customer</th><th>Mobile</th>
                  <th>Mode</th><th>Amount</th><th>Order Ref</th><th>Reference</th><th>Notes</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} style={{ background: p.type==='CREDIT_APPLIED'?'rgba(16,185,129,.04)':undefined }}>
                      <td style={{ color: p.type==='CREDIT_APPLIED'?'#10b981':'#3b82f6', fontFamily:'monospace', fontSize:11, fontWeight:700 }}>{p.receiptNo}</td>
                      <td style={{ color:'#8892a4', fontSize:11, whiteSpace:'nowrap' }}>{new Date(p.date||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      <td style={{ fontWeight:600 }}>{p.customer?.name}</td>
                      <td style={{ fontSize:11, color:'#8892a4' }}>{p.customer?.mobile}</td>
                      <td><span style={{ padding:'2px 10px', borderRadius:12, fontSize:10, fontWeight:700, background:`${MODE_COLOR[p.mode]||'#888'}18`, color:MODE_COLOR[p.mode]||'#888', border:`1px solid ${MODE_COLOR[p.mode]||'#888'}40` }}>{MODE_ICON[p.mode]||'💰'} {p.mode}</span></td>
                      <td style={{ color:'#10b981', fontWeight:700, fontSize:14 }}>{formatCurrency(p.amount)}</td>
                      <td style={{ fontSize:11, color:'#3b82f6', fontFamily:'monospace' }}>{p.order?.orderNo||p.invoice?.invNo||'—'}</td>
                      <td style={{ fontSize:11, color:'#8892a4' }}>{p.reference||'—'}</td>
                      <td style={{ fontSize:11, color:'#8892a4', maxWidth:100, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.notes||'—'}</td>
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button onClick={() => printReceipt(p, shopName)} style={{ padding:'3px 8px', background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:6, color:'#3b82f6', fontSize:10, cursor:'pointer', fontWeight:600 }}>🖨️</button>
                          {p.type !== 'CREDIT_APPLIED' && (<button onClick={() => openEdit(p)} style={{ padding:'3px 8px', background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', borderRadius:6, color:'#10b981', fontSize:10, cursor:'pointer', fontWeight:600 }}>✏️</button>)}
                          <button onClick={() => openLedger(p.customer)} style={{ padding:'3px 8px', background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.3)', borderRadius:6, color:'#8b5cf6', fontSize:10, cursor:'pointer', fontWeight:600 }}>📊</button>
                          <button onClick={() => setDeleteTarget(p)} style={{ padding:'3px 8px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#ef4444', fontSize:10, cursor:'pointer', fontWeight:600 }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {payTotalPages > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'12px 20px', borderTop:'1px solid #2a3348', flexWrap:'wrap' }}>
              <button onClick={()=>fetchPayments(1)} disabled={payPage===1} style={{ padding:'4px 10px', background:'#1e2535', border:'1px solid #2a3348', borderRadius:6, color:payPage===1?'#374151':'#8892a4', cursor:payPage===1?'default':'pointer', fontSize:11 }}>« First</button>
              <button onClick={()=>fetchPayments(payPage-1)} disabled={payPage===1} style={{ padding:'4px 12px', background:'#1e2535', border:'1px solid #2a3348', borderRadius:6, color:payPage===1?'#374151':'#8892a4', cursor:payPage===1?'default':'pointer', fontSize:12 }}>‹ Prev</button>
              {Array.from({length:Math.min(5,payTotalPages)},(_,i)=>{ let p:number; if(payTotalPages<=5)p=i+1; else if(payPage<=3)p=i+1; else if(payPage>=payTotalPages-2)p=payTotalPages-4+i; else p=payPage-2+i; return(<button key={p} onClick={()=>fetchPayments(p)} style={{ padding:'4px 10px', minWidth:30, background:payPage===p?'#3b82f6':'#1e2535', border:`1px solid ${payPage===p?'#3b82f6':'#2a3348'}`, borderRadius:6, color:payPage===p?'#fff':'#8892a4', cursor:'pointer', fontSize:11, fontWeight:payPage===p?700:400 }}>{p}</button>) })}
              <button onClick={()=>fetchPayments(payPage+1)} disabled={payPage===payTotalPages} style={{ padding:'4px 12px', background:'#1e2535', border:'1px solid #2a3348', borderRadius:6, color:payPage===payTotalPages?'#374151':'#8892a4', cursor:payPage===payTotalPages?'default':'pointer', fontSize:12 }}>Next ›</button>
              <button onClick={()=>fetchPayments(payTotalPages)} disabled={payPage===payTotalPages} style={{ padding:'4px 10px', background:'#1e2535', border:'1px solid #2a3348', borderRadius:6, color:payPage===payTotalPages?'#374151':'#8892a4', cursor:payPage===payTotalPages?'default':'pointer', fontSize:11 }}>Last »</button>
              <span style={{ fontSize:11, color:'#8892a4', marginLeft:4 }}>{((payPage-1)*PAY_PAGE_SIZE)+1}–{Math.min(payPage*PAY_PAGE_SIZE,payTotal)} of {payTotal}</span>
            </div>
          )}
        </Card>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginTop:16 }}>
          {PAYMENT_MODES.map(mode => {
            const mp = payments.filter(p => p.mode===mode)
            const total = mp.reduce((s,p) => s+(p.amount||0), 0)
            return (
              <div key={mode} style={{ background:'#1e2535', border:`1px solid ${MODE_COLOR[mode]}30`, borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{MODE_ICON[mode]}</div>
                <div style={{ fontSize:11, color:'#8892a4', marginBottom:2 }}>{mode}</div>
                <div style={{ fontSize:15, fontWeight:700, color:MODE_COLOR[mode] }}>{formatCurrency(total)}</div>
                <div style={{ fontSize:10, color:'#8892a4', marginTop:2 }}>{mp.length} txn{mp.length!==1?'s':''}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Record Payment */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm() }} title="💳 Record Payment" width={560}
        footer={<><Button onClick={() => { setShowModal(false); resetForm() }}>Cancel</Button><Button variant="primary" onClick={handleCreate} disabled={saving}>{saving?'Saving...':'💾 Record Payment'}</Button></>}>
        <form onSubmit={handleCreate}>
          <FormGroup label="Customer *">
            <Select value={form.customerId} onChange={e => f('customerId', e.target.value)} required>
              <option value="">Select Customer</option>
              {customers.map(c => (<option key={c.id} value={c.id}>{c.name} — {c.mobile}{(c.balance||0)>0.01?` (Credit: ₹${Math.max(0,c.balance).toLocaleString('en-IN')})`:''}</option>))}
            </Select>
          </FormGroup>
          {form.customerId && (
            <FormGroup label="Against Order (optional)">
              <Select value={form.orderId} onChange={e => f('orderId', e.target.value)}>
                <option value="">— General Payment / Advance —</option>
                {customerOrders.map(o => (<option key={o.id} value={o.id}>{o.orderNo} | {o.orderType} | Total: ₹{(o.totalAmount||0).toLocaleString('en-IN')} | Bal: ₹{(o.balanceDue||0).toLocaleString('en-IN')}{(o.balanceDue||0)<=0?' ✅':''}</option>))}
              </Select>
            </FormGroup>
          )}
          {selectedOrder && (
            <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:10, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#3b82f6', marginBottom:8, fontFamily:'monospace' }}>📋 {selectedOrder.orderNo}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['Order Total',formatCurrency(selectedOrder.totalAmount),'#e2e8f0'],['Already Paid',formatCurrency(selectedOrder.advancePaid),'#3b82f6'],['Balance Due',formatCurrency(selectedOrder.balanceDue),selectedOrder.balanceDue>0?'#ef4444':'#10b981']].map(([label,value,color]) => (
                  <div key={label} style={{ background:'#252d40', borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ fontSize:9, color:'#8892a4', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Grid cols={2} gap={12}>
            <FormGroup label="Amount ₹ *"><Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => f('amount', e.target.value)} placeholder="0.00" required style={{ fontSize:16, fontWeight:700 }} /></FormGroup>
            <FormGroup label="Payment Mode *"><Select value={form.mode} onChange={e => f('mode', e.target.value)}>{PAYMENT_MODES.map(m => <option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}</Select></FormGroup>
            <FormGroup label="Payment Date *"><Input type="date" value={form.date} onChange={e => f('date', e.target.value)} required /></FormGroup>
            <FormGroup label={form.mode==='UPI'?'UPI Ref No':form.mode==='Cheque'?'Cheque No':form.mode==='NEFT/RTGS'?'UTR No':'Reference (optional)'}><Input value={form.reference} onChange={e => f('reference', e.target.value)} placeholder="Optional" /></FormGroup>
          </Grid>
          <FormGroup label="Notes"><Input value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Optional..." /></FormGroup>
          {amountOver && (<div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.3)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#10b981', marginBottom:8 }}>💰 ₹{overpayAmt.toLocaleString('en-IN')} over balance → stored as <strong>credit</strong></div>)}
          {!form.orderId && form.customerId && (<div style={{ padding:'8px 12px', background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.15)', borderRadius:8, fontSize:11, color:'#8892a4', marginTop:8 }}>💡 No order selected → full amount stored as credit balance</div>)}
          {form.amount && parseFloat(form.amount)>0 && (<div style={{ background:'#1e2535', borderRadius:8, padding:'10px 14px', border:'1px solid #2a3348', display:'flex', justifyContent:'space-between', marginTop:10 }}><span style={{ fontSize:11, color:'#8892a4' }}>Recording</span><span style={{ fontSize:18, fontWeight:800, color:'#10b981' }}>{formatCurrency(parseFloat(form.amount)||0)}</span></div>)}
        </form>
      </Modal>

      {/* Edit Payment */}
      <Modal open={!!editPayment} onClose={() => setEditPayment(null)} title={`✏️ Edit — ${editPayment?.receiptNo}`} width={480}
        footer={<><Button onClick={() => setEditPayment(null)}>Cancel</Button><Button variant="primary" onClick={handleEdit} disabled={saving}>{saving?'Saving...':'💾 Update'}</Button></>}>
        {editPayment && (
          <form onSubmit={handleEdit}>
            <div style={{ background:'#1e2535', border:'1px solid #2a3348', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:12 }}>
              <div style={{ fontWeight:600 }}>{editPayment.customer?.name} — {editPayment.customer?.mobile}</div>
              {editPayment.order && <div style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:11, marginTop:3 }}>Against: {editPayment.order?.orderNo}</div>}
              <div style={{ color:'#f59e0b', fontSize:11, marginTop:3 }}>⚠️ Editing amount auto-adjusts the order balance</div>
            </div>
            <Grid cols={2} gap={12}>
              <FormGroup label="Amount ₹ *"><Input type="number" step="0.01" min="0.01" value={editForm.amount} onChange={e => ef('amount', e.target.value)} required style={{ fontSize:16, fontWeight:700 }} /></FormGroup>
              <FormGroup label="Mode"><Select value={editForm.mode} onChange={e => ef('mode', e.target.value)}>{PAYMENT_MODES.map(m => <option key={m} value={m}>{MODE_ICON[m]} {m}</option>)}</Select></FormGroup>
              <FormGroup label="Date"><Input type="date" value={editForm.date} onChange={e => ef('date', e.target.value)} /></FormGroup>
              <FormGroup label="Reference"><Input value={editForm.reference} onChange={e => ef('reference', e.target.value)} /></FormGroup>
            </Grid>
            <FormGroup label="Notes"><Input value={editForm.notes} onChange={e => ef('notes', e.target.value)} /></FormGroup>
            {editForm.amount && parseFloat(editForm.amount) !== editPayment.amount && (<div style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.2)', borderRadius:8, padding:'8px 14px', fontSize:11, color:'#3b82f6' }}>₹{editPayment.amount.toLocaleString('en-IN')} → ₹{parseFloat(editForm.amount||'0').toLocaleString('en-IN')}{editPayment.order?' • Order balance auto-adjusted':''}</div>)}
          </form>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="🗑️ Delete Payment"
        footer={<><Button onClick={() => setDeleteTarget(null)}>Cancel</Button><button onClick={handleDelete} disabled={deleting} style={{ padding:'8px 18px', background:'rgba(239,68,68,.15)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, color:'#ef4444', fontSize:13, fontWeight:700, cursor:'pointer' }}>{deleting?'Deleting...':'🗑️ Yes, Delete'}</button></>}>
        {deleteTarget && (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
            <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0', marginBottom:6 }}>Delete {deleteTarget.receiptNo}?</div>
            <div style={{ fontSize:13, color:'#8892a4', marginBottom:10 }}>{deleteTarget.customer?.name} — {formatCurrency(deleteTarget.amount)} via {deleteTarget.mode}</div>
            {deleteTarget.order && <div style={{ fontSize:11, color:'#f59e0b', background:'rgba(245,158,11,.08)', borderRadius:8, padding:'8px 14px', marginBottom:8 }}>⚠️ Will restore ₹{deleteTarget.amount.toLocaleString('en-IN')} to order {deleteTarget.order?.orderNo}</div>}
            <div style={{ fontSize:11, color:'#ef4444', background:'rgba(239,68,68,.08)', borderRadius:8, padding:'8px 14px' }}>Cannot be undone.</div>
          </div>
        )}
      </Modal>

      {/* Apply Credit */}
      <Modal open={showCreditModal} onClose={() => setShowCreditModal(false)} title={`💰 Apply Credit — ${creditCustomer?.name}`} width={480}
        footer={<><Button onClick={() => setShowCreditModal(false)}>Cancel</Button><Button variant="primary" onClick={handleApplyCredit} disabled={saving||creditOrders.length===0}>{saving?'Applying...':'✅ Apply Credit'}</Button></>}>
        {creditCustomer && (
          <form onSubmit={handleApplyCredit}>
            <div style={{ background:'rgba(16,185,129,.08)', border:'2px solid rgba(16,185,129,.3)', borderRadius:12, padding:'14px 20px', marginBottom:18, textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#8892a4', marginBottom:4 }}>Available Credit Balance</div>
              <div style={{ fontSize:32, fontWeight:900, color:'#10b981' }}>₹{creditAvailable.toLocaleString('en-IN')}</div>
              <div style={{ fontSize:11, color:'#8892a4', marginTop:4 }}>{creditCustomer.name} — from excess/advance payments</div>
            </div>
            {creditOrders.length===0
              ? <div style={{ textAlign:'center', padding:'16px 0', color:'#8892a4' }}>No pending orders with balance due</div>
              : <>
                  <FormGroup label="Apply to Order *">
                    <Select value={creditOrderId} onChange={e => { const val=e.target.value; const o=creditOrders.find((x:any)=>x.id===val); setCreditOrderId(val); if(o) setCreditAmount(String(Math.min(o.balanceDue,creditAvailable).toFixed(2))) }} required>
                      <option value="">Choose order...</option>
                      {creditOrders.map((o:any) => (<option key={o.id} value={o.id}>{o.orderNo} | {o.orderType} | Due: ₹{o.balanceDue.toLocaleString('en-IN')}</option>))}
                    </Select>
                  </FormGroup>
                  <FormGroup label="Amount to Apply ₹ *"><Input type="number" step="0.01" min="0.01" max={creditAvailable} value={creditAmount} onChange={e => setCreditAmount(e.target.value)} required style={{ fontSize:16, fontWeight:700 }} /></FormGroup>
                  {creditAmount && parseFloat(creditAmount)>0 && (
                    <div style={{ background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.2)', borderRadius:8, padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
                      {[['Applying',formatCurrency(parseFloat(creditAmount||'0')),'#10b981'],['Credit Left',formatCurrency(Math.max(0,creditAvailable-parseFloat(creditAmount||'0'))),'#3b82f6'],['Order Balance After',formatCurrency(Math.max(0,(creditOrders.find((o:any)=>o.id===creditOrderId)?.balanceDue||0)-parseFloat(creditAmount||'0'))),'#e2e8f0']].map(([l,v,c]) => (
                        <div key={l}><div style={{ fontSize:9, color:'#8892a4', marginBottom:2 }}>{l}</div><div style={{ fontSize:13, fontWeight:800, color:String(c) }}>{v}</div></div>
                      ))}
                    </div>
                  )}
                </>
            }
          </form>
        )}
      </Modal>

      {/* Ledger Modal */}
      <Modal open={!!viewLedger} onClose={() => { setViewLedger(null); setLedgerData(null) }} title={`📊 Customer Ledger — ${viewLedger?.name}`} width={760}
        footer={
          <div style={{ display:'flex', justifyContent:'space-between', width:'100%', gap:8 }}>
            <div style={{ display:'flex', gap:8 }}>
              {ledgerData && (<>
                <button onClick={() => printLedger(viewLedger, ledgerData, shopName)} style={{ padding:'7px 14px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:12, fontWeight:700, cursor:'pointer' }}>🖨️ Print Full Ledger (A4)</button>
                {(ledgerData.realCredit||0)>0.01 && (<button onClick={() => { setViewLedger(null); setLedgerData(null); openCreditApply(viewLedger) }} style={{ padding:'7px 14px', background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.4)', borderRadius:8, color:'#10b981', fontSize:12, fontWeight:700, cursor:'pointer' }}>💰 Apply Credit (₹{ledgerData.realCredit.toLocaleString('en-IN')})</button>)}
              </>)}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setViewLedger(null); setLedgerData(null); f('customerId', viewLedger.id); setShowModal(true) }} style={{ padding:'7px 14px', background:'rgba(59,130,246,.15)', border:'1px solid rgba(59,130,246,.4)', borderRadius:8, color:'#3b82f6', fontSize:12, fontWeight:700, cursor:'pointer' }}>+ Record Payment</button>
              <Button onClick={() => { setViewLedger(null); setLedgerData(null) }}>Close</Button>
            </div>
          </div>
        }>
        {ledgerLoading ? <Loading /> : ledgerData && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:16 }}>
              {[['Total Orders Value',formatCurrency(ledgerData.totalOrders),'#e2e8f0'],['Total Paid',formatCurrency(ledgerData.totalPaid),'#10b981'],['Outstanding',formatCurrency(ledgerData.totalBalance),ledgerData.totalBalance>0?'#ef4444':'#10b981'],['Credit Balance',formatCurrency(ledgerData.realCredit||0),'#10b981']].map(([label,value,color]) => (
                <div key={label} style={{ background:'#1e2535', border:`1px solid ${label==='Credit Balance'&&(ledgerData.realCredit||0)>0?'rgba(16,185,129,.3)':'#2a3348'}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:9, color:'#8892a4', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color }}>{value}</div>
                </div>
              ))}
            </div>
            {(ledgerData.realCredit||0)>0.01 && (<div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.3)', borderRadius:8, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}><div style={{ fontSize:12, color:'#10b981' }}>💰 <strong>₹{ledgerData.realCredit.toLocaleString('en-IN')} credit</strong> available</div><button onClick={() => { setViewLedger(null); setLedgerData(null); openCreditApply(viewLedger) }} style={{ padding:'5px 12px', background:'rgba(16,185,129,.2)', border:'1px solid rgba(16,185,129,.4)', borderRadius:6, color:'#10b981', fontSize:11, cursor:'pointer', fontWeight:700 }}>Apply to Order →</button></div>)}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', marginBottom:8, textTransform:'uppercase' }}>📋 Orders ({ledgerData.orders.length})</div>
              <div style={{ maxHeight:180, overflowY:'auto', border:'1px solid #2a3348', borderRadius:8 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead><tr style={{ background:'#252d40' }}>{['Order No','Date','Type','Total','Paid','Balance','Status'].map(h=>(<th key={h} style={{ padding:'6px 8px', textAlign:['Total','Paid','Balance'].includes(h)?'right':'left', color:'#8892a4', fontWeight:600 }}>{h}</th>))}</tr></thead>
                  <tbody>
                    {ledgerData.orders.map((o:any)=>(
                      <tr key={o.id} style={{ borderBottom:'1px solid #2a3348' }}>
                        <td style={{ padding:'6px 8px', color:'#3b82f6', fontFamily:'monospace', fontWeight:700 }}>{o.orderNo}</td>
                        <td style={{ padding:'6px 8px', color:'#8892a4' }}>{new Date(o.date||o.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                        <td style={{ padding:'6px 8px', color:'#8892a4' }}>{o.orderType}</td>
                        <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:600 }}>{formatCurrency(o.totalAmount)}</td>
                        <td style={{ padding:'6px 8px', textAlign:'right', color:'#3b82f6' }}>{formatCurrency(o.advancePaid)}</td>
                        <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:Math.max(0,o.balanceDue)>0?'#ef4444':'#10b981' }}>{formatCurrency(Math.max(0,o.balanceDue))}</td>
                        <td style={{ padding:'6px 8px' }}><span style={{ fontSize:9, padding:'2px 6px', borderRadius:4, background:Math.max(0,o.balanceDue)<=0?'rgba(16,185,129,.15)':'rgba(239,68,68,.1)', color:Math.max(0,o.balanceDue)<=0?'#10b981':'#ef4444', fontWeight:700 }}>{Math.max(0,o.balanceDue)<=0?'✅ PAID':'⏳ DUE'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', marginBottom:8, textTransform:'uppercase' }}>💳 Payment History ({ledgerData.payments.length})</div>
              {ledgerData.payments.length===0 ? <div style={{ textAlign:'center', padding:'16px 0', color:'#8892a4' }}>No payments recorded</div> : (
                <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid #2a3348', borderRadius:8 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead><tr style={{ background:'#252d40' }}>{['Receipt','Date','Mode','Order','Ref','Amount',''].map(h=>(<th key={h} style={{ padding:'6px 8px', textAlign:h==='Amount'?'right':'left', color:'#8892a4', fontWeight:600 }}>{h}</th>))}</tr></thead>
                    <tbody>
                      {ledgerData.payments.map((p:any,idx:number)=>(
                        <tr key={p.id} style={{ borderBottom:'1px solid #2a3348', background:idx%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                          <td style={{ padding:'6px 8px', color:p.type==='CREDIT_APPLIED'?'#10b981':'#3b82f6', fontFamily:'monospace', fontWeight:700, fontSize:10 }}>{p.receiptNo}</td>
                          <td style={{ padding:'6px 8px', color:'#8892a4' }}>{new Date(p.date||p.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'})}</td>
                          <td style={{ padding:'6px 8px' }}><span style={{ fontSize:10, padding:'1px 7px', borderRadius:10, background:`${MODE_COLOR[p.mode]||'#888'}18`, color:MODE_COLOR[p.mode]||'#888', fontWeight:700 }}>{MODE_ICON[p.mode]||'💰'} {p.mode}</span></td>
                          <td style={{ padding:'6px 8px', color:'#8892a4', fontSize:10, fontFamily:'monospace' }}>{p.order?.orderNo||'—'}</td>
                          <td style={{ padding:'6px 8px', color:'#8892a4', fontSize:10 }}>{p.reference||'—'}</td>
                          <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, color:'#10b981', fontSize:13 }}>{formatCurrency(p.amount)}</td>
                          <td style={{ padding:'6px 8px' }}><button onClick={() => printReceipt(p, shopName)} style={{ padding:'2px 6px', background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.3)', borderRadius:5, color:'#3b82f6', fontSize:10, cursor:'pointer' }}>🖨️</button></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background:'#252d40' }}><td colSpan={5} style={{ padding:'8px', textAlign:'right', color:'#8892a4', fontSize:11 }}>Total Received:</td><td style={{ padding:'8px', textAlign:'right', color:'#10b981', fontSize:14, fontWeight:800 }}>{formatCurrency(ledgerData.totalPaid)}</td><td></td></tr></tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Monthly Report Modal (existing) */}
      <MonthlyPrintModal open={showMonthlyPrint} onClose={() => setShowMonthlyPrint(false)} customers={customers} shopName={shopName} />

      {/* All Ledgers PDF Modal (NEW) */}
      <AllLedgersPrintModal open={showAllLedgers} onClose={() => setShowAllLedgers(false)} customers={customers} shopName={shopName} />

    </PageShell>
  )
}