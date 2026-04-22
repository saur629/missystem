import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const where: any = { active: true }
  if (category) where.category = category

  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, category, unit, isDecimal, hsnCode, gstPct, saleRate, currentQty, minQty } = body
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const item = await prisma.inventoryItem.create({
    data: {
      name,
      category:   category   || 'OTHER',
      unit:       unit       || 'PCS',
      isDecimal:  isDecimal  !== undefined ? Boolean(isDecimal) : true,
      hsnCode:    hsnCode    || null,
      gstPct:     parseFloat(String(gstPct   || 18)),
      saleRate:   parseFloat(String(saleRate || 0)),
      currentQty: parseFloat(String(currentQty || 0)),
      minQty:     parseFloat(String(minQty   || 10)),
    },
  })

  // Opening stock transaction
  if (item.currentQty > 0) {
    await prisma.inventoryTransaction.create({
      data: { itemId: item.id, type: 'ADD', qty: item.currentQty, balAfter: item.currentQty, note: 'Opening stock', ref: 'OPENING' },
    })
  }

  return NextResponse.json(item, { status: 201 })
}