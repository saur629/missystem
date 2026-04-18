import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  const perms = await prisma.permission.findMany()
  return NextResponse.json(perms)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { permissions } = await req.json()
  // permissions = [{ module, role, allowed }]

  await Promise.all(
    permissions.map((p: { module: string; role: string; allowed: boolean }) =>
      prisma.permission.upsert({
        where: { module_role: { module: p.module, role: p.role } },
        update: { allowed: p.allowed },
        create: { module: p.module, role: p.role, allowed: p.allowed },
      })
    )
  )

  return NextResponse.json({ ok: true })
}