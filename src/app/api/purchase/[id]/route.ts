import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const data: any = {}

  // Status-only update
  if (body.status) data.status = body.status

  // Supplier — must use relation connect syntax
  if (body.supplierId) data.supplier = { connect: { id: body.supplierId } }

  // Notes
  if (body.notes !== undefined) data.notes = body.notes

  // Items
  if (body.items) {
    let totalAmount = 0
    data.itemsJson = JSON.stringify(body.items.map((i: any) => {
      const amt = parseFloat(i.qty || 0) * parseFloat(i.rate || 0)
      totalAmount += amt
      return { itemName: i.itemName, unit: i.unit || 'PCS', qty: parseFloat(i.qty), rate: parseFloat(i.rate), amount: amt }
    }))
    data.totalAmount = totalAmount
  }

  const po = await prisma.purchase.update({
    where: { id: params.id },
    data,
    include: { supplier: true },
  })
  return NextResponse.json(po)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.purchase.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('PO delete error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}