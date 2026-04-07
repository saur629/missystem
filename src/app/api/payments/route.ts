import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payments = await prisma.payment.findMany({ include: { customer: true, invoice: true }, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(payments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { customerId, invoiceId, amount, mode, reference, notes } = body
  if (!customerId || !amount || !mode) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const count = await prisma.payment.count()
  const receiptNo = `REC-${String(count + 1).padStart(4, '0')}`
  const payment = await prisma.payment.create({ data: { receiptNo, customerId, invoiceId: invoiceId || null, amount: parseFloat(amount), mode, reference, notes }, include: { customer: true } })
  if (invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (inv) {
      const paid = inv.paidAmount + parseFloat(amount)
      await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: paid, status: paid >= inv.totalAmount ? 'PAID' : 'PARTIAL' } })
    }
  }
  return NextResponse.json(payment, { status: 201 })
}
