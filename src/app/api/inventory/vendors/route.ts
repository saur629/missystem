import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const vendors = await prisma.inventoryVendor.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      purchases: {
        select: { id:true, totalAmount:true, paidAmount:true, billDate:true },
        orderBy: { billDate: 'desc' },
        take: 5,
      },
    },
  })
  return NextResponse.json(vendors)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  const vendor = await prisma.inventoryVendor.create({
    data: {
      name:    body.name,
      mobile:  body.mobile  || null,
      email:   body.email   || null,
      address: body.address || null,
      gstNo:   body.gstNo   || null,
      notes:   body.notes   || null,
    },
  })
  return NextResponse.json(vendor, { status: 201 })
}