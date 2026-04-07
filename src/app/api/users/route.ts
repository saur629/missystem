import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await prisma.user.findMany({ select: { id: true, name: true, username: true, role: true, mobile: true, active: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, username, password, role, mobile } = await req.json()
  if (!name || !username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, username, password: hashed, role: role || 'RECEPTION', mobile }, select: { id: true, name: true, username: true, role: true, mobile: true, active: true } })
  return NextResponse.json(user, { status: 201 })
}
