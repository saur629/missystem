import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const items = await prisma.stockItem.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, category, unit, hsnCode, gstPct, saleRate, stock, minStock } = body

  if (!name || !saleRate) {
    return NextResponse.json({ error: 'Name and sale rate required' }, { status: 400 })
  }

  const item = await prisma.stockItem.create({
    data: {
      name,
      category: category || 'Other',
      unit: unit || 'PCS',
      hsnCode: hsnCode || null,
      gstPct: parseFloat(gstPct || 18),
      saleRate: parseFloat(saleRate),
      stock: parseFloat(stock || 0),
      minStock: parseFloat(minStock || 10),
    },
  })

  return NextResponse.json(item, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...data } = body

  const item = await prisma.stockItem.update({
    where: { id },
    data,
  })

  return NextResponse.json(item)
}
