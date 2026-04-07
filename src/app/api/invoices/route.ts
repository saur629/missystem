import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const invoices = await prisma.invoice.findMany({ include: { customer: true, items: true }, orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { customerId, dueDate, items, notes, discount = 0 } = body
  if (!customerId || !items?.length) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const count = await prisma.invoice.count()
  const invNo = `INV-${String(count + 1).padStart(4, '0')}`
  let subTotal = 0, gstAmount = 0
  const processed = items.map((item: any) => {
    const amount = item.qty * item.rate
    const gst = (amount * (item.gstPct || 18)) / 100
    subTotal += amount; gstAmount += gst
    return { description: item.description, qty: parseInt(item.qty), rate: parseFloat(item.rate), amount, gstPct: item.gstPct || 18, gstAmount: gst, totalAmount: amount + gst, orderId: item.orderId || null }
  })
  const totalAmount = subTotal + gstAmount - parseFloat(discount)
  const invoice = await prisma.invoice.create({ data: { invNo, customerId, dueDate: new Date(dueDate), subTotal, discount: parseFloat(discount), gstAmount, totalAmount, notes, status: 'UNPAID', items: { create: processed } }, include: { customer: true, items: true } })
  return NextResponse.json(invoice, { status: 201 })
}
