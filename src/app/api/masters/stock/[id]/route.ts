import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const item = await prisma.stockItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  try {
    const item = await prisma.stockItem.update({
      where: { id: params.id },
      data: {
        ...body,
        gstPct:   body.gstPct   !== undefined ? parseFloat(String(body.gstPct))   : undefined,
        saleRate: body.saleRate !== undefined ? parseFloat(String(body.saleRate)) : undefined,
        stock:    body.stock    !== undefined ? parseFloat(String(body.stock))    : undefined,
        minStock: body.minStock !== undefined ? parseFloat(String(body.minStock)) : undefined,
      },
    })
    return NextResponse.json(item)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.stockItem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Cannot delete — stock item is linked to existing purchase orders' },
      { status: 400 }
    )
  }
}