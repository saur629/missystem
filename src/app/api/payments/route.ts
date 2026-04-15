import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get('customerId')
  const mode       = searchParams.get('mode')
  const search     = searchParams.get('search')

  let where: any = {}
  if (customerId) where.customerId = customerId
  if (mode)       where.mode = mode

  const payments = await prisma.payment.findMany({
    where,
    include: {
      customer: true,
      invoice:  true,
      order: { select: { id:true, orderNo:true, totalAmount:true, advancePaid:true, balanceDue:true } },
    },
    orderBy: { date: 'desc' },
    take: 500,
  })

  if (search) {
    const s = search.toLowerCase()
    return NextResponse.json(payments.filter((p: any) => {
      return String(p.receiptNo||'').toLowerCase().includes(s) ||
             String(p.customer?.name||'').toLowerCase().includes(s) ||
             String(p.customer?.mobile||'').includes(s) ||
             String(p.reference||'').toLowerCase().includes(s)
    }))
  }

  return NextResponse.json(payments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerId, orderId, invoiceId, amount, mode, reference, notes, date, applyCredit } = body

  if (!customerId) return NextResponse.json({ error: 'Customer required' }, { status: 400 })

  // ── CREDIT APPLICATION MODE ────────────────────────────────
  if (applyCredit && applyCredit.orderId && applyCredit.amount > 0) {
    const creditAmt = parseFloat(String(applyCredit.amount))

    const [customer, targetOrder] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.order.findUnique({ where: { id: applyCredit.orderId } }),
    ])

    if (!customer)    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    if (!targetOrder) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const available = customer.balance || 0
    if (creditAmt > available + 0.01) {
      return NextResponse.json({ error: `Insufficient credit. Available: ₹${available.toFixed(2)}` }, { status: 400 })
    }

    const applyAmt   = Math.min(creditAmt, targetOrder.balanceDue)
    const newAdvance = targetOrder.advancePaid + applyAmt
    const newBalance = Math.max(0, targetOrder.totalAmount - newAdvance)

    await prisma.order.update({
      where: { id: applyCredit.orderId },
      data:  { advancePaid: newAdvance, balanceDue: newBalance },
    })

    await prisma.customer.update({
      where: { id: customerId },
      data:  { balance: { decrement: applyAmt } },
    })

    const count     = await prisma.payment.count()
    const receiptNo = `CRED-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

    const creditPayment = await prisma.payment.create({
      data: {
        receiptNo,
        customerId,
        orderId:  applyCredit.orderId,
        amount:   applyAmt,
        mode:     'CREDIT',
        notes:    `Credit balance applied to ${targetOrder.orderNo}`,
        date:     new Date(),
        type:     'CREDIT_APPLIED',
      },
      include: { customer: true, order: true },
    })

    return NextResponse.json({ ...creditPayment, creditApplied: applyAmt }, { status: 201 })
  }

  // ── NORMAL PAYMENT ─────────────────────────────────────────
  const parsedAmt = parseFloat(String(amount))
  if (isNaN(parsedAmt) || parsedAmt <= 0)
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })

  const count     = await prisma.payment.count()
  const receiptNo = `REC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`
  const payDate   = date ? new Date(date) : new Date()

  const payment = await prisma.payment.create({
    data: {
      receiptNo,
      customerId,
      orderId:   orderId   || null,
      invoiceId: invoiceId || null,
      amount:    parsedAmt,
      mode:      mode      || 'Cash',
      reference: reference || null,
      notes:     notes     || null,
      date:      payDate,
      type:      orderId ? 'PAYMENT' : 'ADVANCE',
    },
    include: { customer: true, order: true },
  })

  let creditAdded = 0

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (order) {
      const newAdvance = order.advancePaid + parsedAmt
      const newBalance = Math.max(0, order.totalAmount - newAdvance)
      await prisma.order.update({
        where: { id: orderId },
        data:  { advancePaid: newAdvance, balanceDue: newBalance },
      })
      // Overpaid → store excess as customer credit
      if (newAdvance > order.totalAmount) {
        creditAdded = parseFloat((newAdvance - order.totalAmount).toFixed(2))
        await prisma.customer.update({
          where: { id: customerId },
          data:  { balance: { increment: creditAdded } },
        })
      }
    }
  } else {
    // No order → entire amount stored as customer credit balance
    creditAdded = parsedAmt
    await prisma.customer.update({
      where: { id: customerId },
      data:  { balance: { increment: parsedAmt } },
    })
  }

  if (invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (inv) {
      const paid = inv.paidAmount + parsedAmt
      await prisma.invoice.update({
        where: { id: invoiceId },
        data:  { paidAmount: paid, status: paid >= inv.totalAmount ? 'PAID' : 'PARTIAL' },
      })
    }
  }

  return NextResponse.json({ ...payment, creditAdded }, { status: 201 })
}