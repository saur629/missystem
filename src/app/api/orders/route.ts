import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const orderType = searchParams.get('orderType')
  const search = searchParams.get('search')
  const statuses = searchParams.get('statuses')

  const where: any = {}
  if (status) where.status = status
  if (statuses) where.status = { in: statuses.split(',') }
  if (orderType) where.orderType = orderType
  if (search) {
    where.OR = [
      { orderNo: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { mobile: { contains: search } } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true, _count: { select: { statusLogs: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    customerId, orderType, priority, dueDate, notes,
    width, height, ratePerSqFt, flexMedia,
    jobName, qty, paperType, paperGsm, size, colors, printSide, lamination,
    description, vendorName, costPrice,
    discount, gstPct, advancePaid,
  } = body

  if (!customerId) return NextResponse.json({ error: 'Customer required' }, { status: 400 })

  const count = await prisma.order.count()
  const year = new Date().getFullYear()
  const orderNo = `ORD-${year}-${String(count + 1).padStart(4, '0')}`

  // Calculate amounts
  let subTotal = 0
  let sqFt = null

  if (orderType === 'FLEX' && width && height && ratePerSqFt) {
    sqFt = parseFloat(width) * parseFloat(height)
    subTotal = sqFt * parseFloat(ratePerSqFt)
  } else if (qty && body.sellingPrice) {
    subTotal = parseInt(qty) * parseFloat(body.sellingPrice)
  } else {
    subTotal = parseFloat(body.subTotal || 0)
  }

  const disc = parseFloat(discount || 0)
  const afterDiscount = subTotal - disc
  const gp = parseFloat(gstPct || 18)
  const gstAmount = (afterDiscount * gp) / 100
  const totalAmount = afterDiscount + gstAmount
  const advance = parseFloat(advancePaid || 0)
  const balanceDue = totalAmount - advance

  const sessionUser = session.user as any

  const order = await prisma.order.create({
    data: {
      orderNo, customerId,
      orderType: orderType || 'FLEX',
      priority: priority || 'NORMAL',
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      // Flex
      width: width ? parseFloat(width) : null,
      height: height ? parseFloat(height) : null,
      sqFt,
      ratePerSqFt: ratePerSqFt ? parseFloat(ratePerSqFt) : null,
      flexMedia,
      // Print
      jobName, paperType, paperGsm, size,
      qty: qty ? parseInt(qty) : null,
      colors, printSide, lamination,
      // Common
      description, vendorName,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      // Finance
      subTotal: afterDiscount,
      discount: disc,
      gstPct: gp,
      gstAmount,
      totalAmount,
      advancePaid: advance,
      balanceDue,
      operatorId: sessionUser.id,
      status: 'PENDING',
    },
    include: { customer: true },
  })

  await prisma.statusLog.create({
    data: { orderId: order.id, status: 'PENDING', notes: 'Order created', userId: sessionUser.id },
  })

  return NextResponse.json(order, { status: 201 })
}
