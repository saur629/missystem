import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, currentPassword, newPassword, forceChange } = await req.json()
  const sessionUser = session.user as any
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(sessionUser.role)
  const targetId = forceChange && isAdmin ? userId : sessionUser.id
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: targetId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!forceChange || targetId === sessionUser.id) {
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }
  await prisma.user.update({ where: { id: targetId }, data: { password: await bcrypt.hash(newPassword, 10) } })
  return NextResponse.json({ success: true })
}
