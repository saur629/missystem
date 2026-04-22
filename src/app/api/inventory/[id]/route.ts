import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  try {
    const item = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        ...(body.name      !== undefined && { name: body.name }),
        ...(body.category  !== undefined && { category: body.category }),
        ...(body.unit      !== undefined && { unit: body.unit }),
        ...(body.isDecimal !== undefined && { isDecimal: Boolean(body.isDecimal) }),
        ...(body.hsnCode   !== undefined && { hsnCode: body.hsnCode || null }),
        ...(body.gstPct    !== undefined && { gstPct:    parseFloat(String(body.gstPct)) }),
        ...(body.saleRate  !== undefined && { saleRate:  parseFloat(String(body.saleRate)) }),
        ...(body.minQty    !== undefined && { minQty:    parseFloat(String(body.minQty)) }),
      },
    })
    return NextResponse.json(item)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.inventoryItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Cannot delete — item has transactions' }, { status: 400 })
  }
}