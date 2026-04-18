import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivity } from '@/lib/activity'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      statusLogs: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}


export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const sessionUser = session.user as any

  // ── Whitelist every field that actually exists in the Order schema ──
  // This prevents unknown fields (items, subTotal sent from frontend) from
  // crashing Prisma with "Unknown argument" errors.
  const data: any = {}

  // Status & delivery
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'DELIVERED') data.deliveredAt = new Date()
  }

  // Classification
  if (body.orderType  !== undefined) data.orderType  = body.orderType
  if (body.priority   !== undefined) data.priority   = body.priority

  // Customer
 if (body.customerId !== undefined) data.customer = { connect: { id: body.customerId } }

  // Dates
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null

  // Text fields
  if (body.notes         !== undefined) data.notes         = body.notes         || null
  if (body.vendorName    !== undefined) data.vendorName    = body.vendorName    || null
  if (body.description   !== undefined) data.description   = body.description   || null
  if (body.flexMedia     !== undefined) data.flexMedia     = body.flexMedia     || null
  if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod || null
  if (body.jobName       !== undefined) data.jobName       = body.jobName       || null
  if (body.size          !== undefined) data.size          = body.size          || null
  if (body.colors        !== undefined) data.colors        = body.colors        || null
  if (body.printSide     !== undefined) data.printSide     = body.printSide     || null
  if (body.lamination    !== undefined) data.lamination    = body.lamination    || null

  // Numeric fields
  if (body.width       !== undefined) data.width       = body.width       ? parseFloat(String(body.width))       : null
  if (body.height      !== undefined) data.height      = body.height      ? parseFloat(String(body.height))      : null
  if (body.sqFt        !== undefined) data.sqFt        = body.sqFt        ? parseFloat(String(body.sqFt))        : null
  if (body.ratePerSqFt !== undefined) data.ratePerSqFt = body.ratePerSqFt ? parseFloat(String(body.ratePerSqFt)) : null
  if (body.costPrice   !== undefined) data.costPrice   = body.costPrice   ? parseFloat(String(body.costPrice))   : null
  if (body.discount    !== undefined) data.discount    = parseFloat(String(body.discount    ?? 0))
  if (body.gstPct      !== undefined) data.gstPct      = parseFloat(String(body.gstPct      ?? 18))
  if (body.gstAmount   !== undefined) data.gstAmount   = parseFloat(String(body.gstAmount   ?? 0))
  if (body.subTotal    !== undefined) data.subTotal    = parseFloat(String(body.subTotal     ?? 0))
  if (body.totalAmount !== undefined) data.totalAmount = parseFloat(String(body.totalAmount  ?? 0))
  if (body.advancePaid !== undefined) data.advancePaid = parseFloat(String(body.advancePaid  ?? 0))
  if (body.balanceDue  !== undefined) data.balanceDue  = parseFloat(String(body.balanceDue   ?? 0))
  if (body.qty         !== undefined) data.qty         = body.qty ? parseInt(String(body.qty)) : null
  if (body.itemCount   !== undefined) data.itemCount   = parseInt(String(body.itemCount ?? 1))

  // Items JSON blob (design/print task statuses + all item details)
  if (body.orderItemsJson !== undefined) data.orderItemsJson = body.orderItemsJson

  // Pull first-item FLEX/print fields from items array if sent
  if (Array.isArray(body.items) && body.items.length > 0) {
    const fi = body.items[0]
    if (body.orderType === 'FLEX') {
      // Support both old (width) and new (widthFt) field names
      data.width       = fi.widthFt  ? parseFloat(String(fi.widthFt))  : (fi.width  ? parseFloat(String(fi.width))  : null)
      data.height      = fi.heightFt ? parseFloat(String(fi.heightFt)) : (fi.height ? parseFloat(String(fi.height)) : null)
      data.sqFt        = fi.sqFt        ? parseFloat(String(fi.sqFt))        : null
      data.ratePerSqFt = fi.ratePerSqFt ? parseFloat(String(fi.ratePerSqFt)) : null
      data.flexMedia   = fi.flexMedia   || null
      data.description = fi.description || null
    } else {
      data.jobName    = fi.jobName    || null
      data.qty        = fi.qty        ? parseInt(String(fi.qty))   : null
      data.size       = fi.size       || null
      data.colors     = fi.colors     || null
      data.printSide  = fi.printSide  || null
      data.lamination = fi.lamination || null
      data.description = fi.description || null
    }
    // Always store full items JSON
    data.orderItemsJson = JSON.stringify(body.items)
  }

  try {
    const order = await prisma.order.update({
      where: { id: params.id },
      data,
      include: { customer: true },
    })

    // Log status change if status was updated
    if (body.status) {
      await prisma.statusLog.create({
        data: {
          orderId: params.id,
          status:  body.status,
          notes:   body.notes || null,
          userId:  sessionUser?.id ?? null,
        },
        
      })
      
    }
    await logActivity({
      userId: sessionUser?.id,
      action: body.status ? 'UPDATE_ORDER_STATUS' : 'UPDATE_ORDER',
      module: 'orders',
      details: body.status
        ? `Changed order ${params.id} status to ${body.status}`
        : `Updated order ${params.id}`,
    })

    
    

    return NextResponse.json(order)
  } catch (err: any) {
    console.error('Order PATCH error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 })
  }
}


export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.order.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Order DELETE error:', err)
    return NextResponse.json({ error: 'Cannot delete order' }, { status: 400 })
  }
}
