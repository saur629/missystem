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

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (mode)       where.mode       = mode
  if (search) {
    where.OR = [
      { receiptNo: { contains: search, mode: 'insensitive' } },
      { reference: { contains: search, mode: 'insensitive' } },
      { customer:  { name:   { contains: search, mode: 'insensitive' } } },
      { customer:  { mobile: { contains: search } } },
    ]
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      customer: true,
      invoice:  { select: { invNo: true } },
      order:    { select: { orderNo: true, totalAmount: true, balanceDue: true, advancePaid: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json(payments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerId, orderId, invoiceId, amount, mode, reference, notes, date } = body

  if (!customerId) return NextResponse.json({ error: 'Customer is required' }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })

  // ── Generate receipt number ───────────────────────────────────────────────
  const year = new Date().getFullYear()
  const last = await prisma.payment.findFirst({
    where: { receiptNo: { startsWith: `RCP-${year}-` } },
    orderBy: { receiptNo: 'desc' },
    select: { receiptNo: true },
  })
  const lastNum  = last ? parseInt(last.receiptNo.split('-')[2]) : 0
  const receiptNo = `RCP-${year}-${String(lastNum + 1).padStart(4, '0')}`

  try {
    // ── Create payment ────────────────────────────────────────────────────
    const payment = await prisma.payment.create({
      data: {
        receiptNo,
        customerId,
        amount:    parseFloat(String(amount)),
        mode:      mode || 'Cash',
        reference: reference || null,
        notes:     notes    || null,
        date:      date ? new Date(date) : new Date(),
        ...(orderId   ? { orderId }   : {}),
        ...(invoiceId ? { invoiceId } : {}),
      },
      include: {
        customer: true,
        order:    { select: { orderNo: true, totalAmount: true, balanceDue: true, advancePaid: true } },
        invoice:  { select: { invNo: true } },
      },
    })

    // ── Update order balance if linked ────────────────────────────────────
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { advancePaid: true, balanceDue: true, totalAmount: true },
      })
      if (order) {
        const newAdvance = (order.advancePaid || 0) + parseFloat(String(amount))
        const newBalance = Math.max(0, (order.balanceDue || 0) - parseFloat(String(amount)))
        await prisma.order.update({
          where: { id: orderId },
          data:  { advancePaid: newAdvance, balanceDue: newBalance },
        })
      }
    }

    // ── Update invoice balance if linked ──────────────────────────────────
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { paidAmount: true, totalAmount: true },
      })
      if (invoice) {
        const newPaid = (invoice.paidAmount || 0) + parseFloat(String(amount))
        const newStatus = newPaid >= invoice.totalAmount ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID'
        await prisma.invoice.update({
          where: { id: invoiceId },
          data:  { paidAmount: newPaid, status: newStatus },
        })
      }
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (err: any) {
    console.error('Payment create error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create payment' }, { status: 500 })
  }
}