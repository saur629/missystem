import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const jobTypes = await prisma.jobType.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(jobTypes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const jobType = await prisma.jobType.create({
    data: {
      code: body.code || null,
      name: body.name,
      rate: body.rate,
      unit: body.unit || 'sqft',
      gst:  body.gst  || '18%',
      tat:  body.tat  || '1 Day',
    },
  })
  return NextResponse.json(jobType, { status: 201 })
}