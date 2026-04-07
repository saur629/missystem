import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (body.password) body.password = await bcrypt.hash(body.password, 10)
  const user = await prisma.user.update({ where: { id: params.id }, data: body, select: { id: true, name: true, username: true, role: true, mobile: true, active: true } })
  return NextResponse.json(user)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
