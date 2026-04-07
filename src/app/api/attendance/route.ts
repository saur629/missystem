import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const userId = searchParams.get('userId')
  const month = searchParams.get('month')
  const where: any = {}
  if (userId) where.userId = userId
  if (date) { const d = new Date(date); const n = new Date(d); n.setDate(n.getDate()+1); where.date = { gte: d, lt: n } }
  else if (month) { const [y,m] = month.split('-').map(Number); where.date = { gte: new Date(y,m-1,1), lt: new Date(y,m,1) } }
  const att = await prisma.attendance.findMany({ where, include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { date: 'desc' } })
  return NextResponse.json(att)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, date, checkIn, checkOut, status, notes } = await req.json()
  if (!userId || !date || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const att = await prisma.attendance.upsert({ where: { userId_date: { userId, date: new Date(date) } }, update: { checkIn, checkOut, status, notes }, create: { userId, date: new Date(date), checkIn, checkOut, status, notes }, include: { user: { select: { id: true, name: true } } } })
  return NextResponse.json(att)
}
