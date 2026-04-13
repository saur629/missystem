import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const jobType = await prisma.jobType.update({
    where: { id: params.id },
    data: {
      code: body.code || null,
      name: body.name,
      rate: body.rate,
      unit: body.unit,
      gst:  body.gst,
      tat:  body.tat,
    },
  })
  return NextResponse.json(jobType)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.jobType.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}