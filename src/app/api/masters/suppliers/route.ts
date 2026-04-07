import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name || !body.contact) return NextResponse.json({ error: 'Name and contact required' }, { status: 400 })
  const count = await prisma.supplier.count()
  const code = `SUP${String(count + 1).padStart(3, '0')}`
  const supplier = await prisma.supplier.create({ data: { code, name: body.name, contact: body.contact, email: body.email, gstNo: body.gstNo, items: body.items } })
  return NextResponse.json(supplier, { status: 201 })
}
