import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const vendorId = searchParams.get('vendorId')
  const where: any = {}
  if (vendorId) where.vendorId = vendorId

  const purchases = await prisma.inventoryPurchase.findMany({
    where,
    include: {
      vendor: { select: { id:true, name:true, mobile:true } },
      items: {
        include: { item: { select: { id:true, name:true, unit:true, category:true } } },
      },
    },
    orderBy: { billDate: 'desc' },
    take: 200,
  })
  return NextResponse.json(purchases)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { vendorId, billNo, billDate, paidAmount, notes, items } = body

  if (!vendorId) return NextResponse.json({ error: 'Vendor required' }, { status: 400 })
  if (!items || items.length === 0) return NextResponse.json({ error: 'At least one item required' }, { status: 400 })

  // Validate all items
  for (const it of items) {
    if (!it.itemId || !it.qty || it.qty <= 0 || !it.rate || it.rate <= 0) {
      return NextResponse.json({ error: 'Each item needs itemId, qty and rate' }, { status: 400 })
    }
  }

  const totalAmount = items.reduce((s: number, it: any) => s + (parseFloat(it.qty) * parseFloat(it.rate)), 0)

  // Create purchase record
  const purchase = await prisma.inventoryPurchase.create({
    data: {
      vendorId,
      billNo:      billNo      || null,
      billDate:    billDate ? new Date(billDate) : new Date(),
      totalAmount,
      paidAmount:  parseFloat(String(paidAmount || 0)),
      notes:       notes || null,
      items: {
        create: items.map((it: any) => ({
          itemId: it.itemId,
          qty:    parseFloat(String(it.qty)),
          rate:   parseFloat(String(it.rate)),
          amount: parseFloat(String(it.qty)) * parseFloat(String(it.rate)),
        })),
      },
    },
    include: {
      vendor: true,
      items: { include: { item: true } },
    },
  })

  // Auto-update stock for each item + create inventory transaction
  for (const pi of purchase.items) {
    const inv = await prisma.inventoryItem.findUnique({ where: { id: pi.itemId } })
    if (inv) {
      const newQty = parseFloat((inv.currentQty + pi.qty).toFixed(4))
      await prisma.inventoryItem.update({ where: { id: pi.itemId }, data: { currentQty: newQty } })
      await prisma.inventoryTransaction.create({
        data: {
          itemId:   pi.itemId,
          type:     'ADD',
          qty:      pi.qty,
          balAfter: newQty,
          note:     `Purchase from ${purchase.vendor.name}${billNo ? ` — Bill: ${billNo}` : ''}`,
          ref:      purchase.id,
        },
      })
    }
  }

  return NextResponse.json(purchase, { status: 201 })
}