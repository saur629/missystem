import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [purchases, suppliers, stock] = await Promise.all([
    prisma.purchase.findMany({ include: { supplier: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.stockItem.findMany({ orderBy: { name: 'asc' } }),
  ])
  return NextResponse.json({ purchases, suppliers, stock })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { supplierId, items, notes } = await req.json()
  if (!supplierId || !items?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const count = await prisma.purchase.count()
  const poNo  = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
  let totalAmount = 0
  const itemsJson = JSON.stringify(items.map((i: any) => {
    const amt = parseFloat(i.qty || 0) * parseFloat(i.rate || 0)
    totalAmount += amt
    return { itemName: i.itemName, unit: i.unit || 'PCS', qty: parseFloat(i.qty), rate: parseFloat(i.rate), amount: amt }
  }))
  const po = await prisma.purchase.create({
    data: { poNo, supplierId, totalAmount, notes, status: 'ORDERED', itemsJson },
    include: { supplier: true },
  })
  return NextResponse.json(po, { status: 201 })
}