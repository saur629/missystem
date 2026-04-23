import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const vendor = await prisma.inventoryVendor.update({
    where: { id: params.id },
    data: {
      ...(body.name    !== undefined && { name:    body.name }),
      ...(body.mobile  !== undefined && { mobile:  body.mobile  || null }),
      ...(body.email   !== undefined && { email:   body.email   || null }),
      ...(body.address !== undefined && { address: body.address || null }),
      ...(body.gstNo   !== undefined && { gstNo:   body.gstNo   || null }),
      ...(body.notes   !== undefined && { notes:   body.notes   || null }),
    },
  })
  return NextResponse.json(vendor)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.inventoryVendor.update({ where: { id: params.id }, data: { active: false } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}