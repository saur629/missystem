import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ── GET single payment ─────────────────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { customer: true, order: true, invoice: true },
  })
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(payment)
}

// ── PATCH — edit amount / mode / reference ─────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, mode, reference, notes, date } = body

  try {
    const existing = await prisma.payment.findUnique({
      where:   { id: params.id },
      include: { order: true },
    })
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Don't allow editing CREDIT_APPLIED entries
    if (existing.type === 'CREDIT_APPLIED') {
      return NextResponse.json({ error: 'Credit-applied records cannot be edited' }, { status: 400 })
    }

    const oldAmount = existing.amount
    const newAmount = amount !== undefined ? parseFloat(String(amount)) : oldAmount
    const diff      = newAmount - oldAmount  // +ve = paid more, -ve = paid less

    // Update payment record
    const updated = await prisma.payment.update({
      where: { id: params.id },
      data: {
        ...(amount    !== undefined && { amount: newAmount }),
        ...(mode      !== undefined && { mode }),
        ...(reference !== undefined && { reference: reference || null }),
        ...(notes     !== undefined && { notes:     notes     || null }),
        ...(date      !== undefined && { date:      new Date(date) }),
      },
      include: { customer: true, order: true, invoice: true },
    })

    // Adjust linked order balance if amount changed
    if (existing.orderId && diff !== 0) {
      const order = await prisma.order.findUnique({
        where:  { id: existing.orderId },
        select: { advancePaid: true, balanceDue: true, totalAmount: true },
      })
      if (order) {
        const newAdvance = Math.max(0, (order.advancePaid || 0) + diff)
        const newBalance = Math.max(0, (order.totalAmount || 0) - newAdvance)
        await prisma.order.update({
          where: { id: existing.orderId },
          data:  { advancePaid: newAdvance, balanceDue: newBalance },
        })
      }
    }

    // Adjust customer credit balance if this was a general advance (no order)
    if (!existing.orderId && existing.type !== 'CREDIT_APPLIED' && diff !== 0) {
      await prisma.customer.update({
        where: { id: existing.customerId },
        data:  { balance: { increment: diff } },
      })
    }

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Payment PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update' }, { status: 500 })
  }
}

// ── DELETE — remove payment and reverse all effects ────────────────────────────
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payment = await prisma.payment.findUnique({
      where:   { id: params.id },
      include: { order: true },
    })
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // ── Reverse effect on linked order ────────────────────────
    if (payment.orderId) {
      const order = await prisma.order.findUnique({
        where:  { id: payment.orderId },
        select: { advancePaid: true, totalAmount: true },
      })
      if (order) {
        const newAdvance = Math.max(0, (order.advancePaid || 0) - payment.amount)
        const newBalance = Math.max(0, (order.totalAmount || 0) - newAdvance)
        await prisma.order.update({
          where: { id: payment.orderId },
          data:  { advancePaid: newAdvance, balanceDue: newBalance },
        })
      }

      // If this was a CREDIT_APPLIED record, restore customer credit balance
      if (payment.type === 'CREDIT_APPLIED') {
        await prisma.customer.update({
          where: { id: payment.customerId },
          data:  { balance: { increment: payment.amount } },
        })
      }
    }

    // ── Reverse general advance (no order linked) ─────────────
    if (!payment.orderId && payment.type !== 'CREDIT_APPLIED') {
      // Was stored as customer credit — deduct it back
      await prisma.customer.update({
        where: { id: payment.customerId },
        data:  { balance: { decrement: payment.amount } },
      })
    }

    // ── Reverse overpayment credit if order-linked ────────────
    // If the order was fully paid + overpaid, the excess went to credit
    // We only reverse the credit if newAdvance > totalAmount
    if (payment.orderId && payment.type !== 'CREDIT_APPLIED') {
      const order = await prisma.order.findUnique({
        where:  { id: payment.orderId },
        select: { advancePaid: true, totalAmount: true },
      })
      // After reversal above, if the original advance was > totalAmount,
      // there was a credit stored — now reversed by the advancePaid reduction
      // The customer.balance credit was added automatically at POST time
      // We need to check and remove it
      const preDeleteAdvance = (order?.advancePaid || 0) + payment.amount
      if (order && preDeleteAdvance > order.totalAmount) {
        const excessThatWasCredit = preDeleteAdvance - order.totalAmount
        await prisma.customer.update({
          where: { id: payment.customerId },
          data:  { balance: { decrement: excessThatWasCredit } },
        })
      }
    }

    await prisma.payment.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Payment DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 })
  }
}