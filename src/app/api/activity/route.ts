import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const action = searchParams.get('action')
  const days   = parseInt(searchParams.get('days') || '7')

  const from = new Date()
  from.setDate(from.getDate() - days)

  const logs = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: from },
      ...(userId ? { userId } : {}),
      ...(action ? { action } : {}),
    },
    include: { user: { select: { name: true, username: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  return NextResponse.json(logs)
}