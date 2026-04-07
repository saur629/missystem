import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { customer: true, statusLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { status, notes, ...rest } = await req.json()
  const sessionUser = session.user as any
  const data: any = { ...rest }
  if (status) {
    data.status = status
    if (status === 'DELIVERED') data.deliveredAt = new Date()
  }
  const order = await prisma.order.update({ where: { id: params.id }, data, include: { customer: true } })
  if (status) {
    await prisma.statusLog.create({ data: { orderId: params.id, status, notes: notes || null, userId: sessionUser.id } })
  }
  return NextResponse.json(order)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.order.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
