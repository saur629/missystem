import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const where: any = {}
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search } }]
  const customers = await prisma.customer.findMany({ where, orderBy: { name: 'asc' } })
  return NextResponse.json(customers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name || !body.mobile) return NextResponse.json({ error: 'Name and mobile required' }, { status: 400 })
  const count = await prisma.customer.count()
  const code = `CLT${String(count + 1).padStart(4, '0')}`
  const customer = await prisma.customer.create({ data: { code, name: body.name, mobile: body.mobile, email: body.email, address: body.address, city: body.city, gstNo: body.gstNo, creditLimit: parseFloat(body.creditLimit || 0) } })
  return NextResponse.json(customer, { status: 201 })
}
