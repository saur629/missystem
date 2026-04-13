import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// ── GET single payment ────────────────────────────────────────────────────────
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

// ── PATCH — edit payment amount/mode/reference ────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { amount, mode, reference, notes, date } = body

  try {
    // Get existing payment first so we can reverse its effect on the order
    const existing = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { order: true },
    })
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const oldAmount = existing.amount
    const newAmount = amount !== undefined ? parseFloat(String(amount)) : oldAmount
    const diff      = newAmount - oldAmount  // positive = paying more, negative = paying less

    // Update the payment record
    const updated = await prisma.payment.update({
      where: { id: params.id },
      data: {
        ...(amount    !== undefined && { amount: newAmount }),
        ...(mode      !== undefined && { mode }),
        ...(reference !== undefined && { reference: reference || null }),
        ...(notes     !== undefined && { notes: notes || null }),
        ...(date      !== undefined && { date: new Date(date) }),
      },
      include: { customer: true, order: true, invoice: true },
    })

    // If linked to an order, adjust its advance + balance
    if (existing.orderId && diff !== 0) {
      const order = await prisma.order.findUnique({
        where: { id: existing.orderId },
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

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Payment PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update' }, { status: 500 })
  }
}

// ── DELETE — remove payment and reverse its effect on the order ───────────────
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { order: true },
    })
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Reverse effect on order before deleting
    if (payment.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
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
    }

    await prisma.payment.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Payment DELETE error:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 })
  }
}