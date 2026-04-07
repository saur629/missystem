import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const quotations = await prisma.quotation.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json(quotations)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { customerId, description, qty, rate, gstPct = 18, validTill, notes, discount = 0 } = body
  if (!customerId || !description || !rate) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const count = await prisma.quotation.count()
  const year = new Date().getFullYear()
  const qtNo = `QT-${year}-${String(count + 1).padStart(4, '0')}`
  const subTotal = parseFloat(rate) * parseInt(qty || 1)
  const afterDisc = subTotal - parseFloat(discount)
  const gstAmount = (afterDisc * parseFloat(gstPct)) / 100
  const totalAmount = afterDisc + gstAmount
  const qt = await prisma.quotation.create({ data: { qtNo, customerId, description, qty: parseInt(qty || 1), rate: parseFloat(rate), subTotal: afterDisc, discount: parseFloat(discount), gstPct: parseFloat(gstPct), gstAmount, totalAmount, validTill: new Date(validTill), notes, status: 'PENDING' }, include: { customer: true } })
  return NextResponse.json(qt, { status: 201 })
}
