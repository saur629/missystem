import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const flexMedia = await prisma.flexMedia.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(flexMedia)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const media = await prisma.flexMedia.create({
    data: {
      name: body.name,
      rate: body.rate,
      unit: body.unit || 'sqft',
      gst:  body.gst  || '18%',
    },
  })
  return NextResponse.json(media, { status: 201 })
}