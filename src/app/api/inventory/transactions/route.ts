import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const type   = searchParams.get('type')
  const limit  = parseInt(searchParams.get('limit') || '100')

  const where: any = {}
  if (itemId) where.itemId = itemId
  if (type)   where.type   = type

  const txns = await prisma.inventoryTransaction.findMany({
    where,
    include: { item: { select: { id:true, name:true, unit:true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json(txns)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { itemId, type, qty, note, ref } = body

  if (!itemId || !type || qty === undefined)
    return NextResponse.json({ error: 'itemId, type, qty required' }, { status: 400 })
  if (!['ADD','USE','ADJUST'].includes(type))
    return NextResponse.json({ error: 'type must be ADD, USE, or ADJUST' }, { status: 400 })

  const parsedQty = parseFloat(String(qty))
  if (isNaN(parsedQty) || parsedQty <= 0)
    return NextResponse.json({ error: 'qty must be positive' }, { status: 400 })

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    // Decimal validation
    if (!item.isDecimal && parsedQty % 1 !== 0)
      return NextResponse.json({ error: `${item.name} only supports whole numbers` }, { status: 400 })

    const delta  = type === 'USE' ? -parsedQty : parsedQty
    const newQty = parseFloat((item.currentQty + delta).toFixed(4))

    if (newQty < 0)
      return NextResponse.json({
        error: `Insufficient stock. Available: ${item.currentQty} ${item.unit}, Requested: ${parsedQty} ${item.unit}`,
      }, { status: 400 })

    // Update quantity
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data:  { currentQty: newQty },
    })

    // Record transaction
    const txn = await prisma.inventoryTransaction.create({
      data: { itemId, type, qty: delta, balAfter: newQty, note: note||null, ref: ref||null },
      include: { item: { select: { id:true, name:true, unit:true, currentQty:true, minQty:true } } },
    })

    return NextResponse.json(txn, { status: 201 })
  } catch (err: any) {
    console.error('Inventory transaction error:', err)
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}