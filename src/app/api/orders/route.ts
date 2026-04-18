import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status     = searchParams.get('status')
  const statuses   = searchParams.get('statuses')
  const orderType  = searchParams.get('orderType')
  const search     = searchParams.get('search')
  const customerId = searchParams.get('customerId')

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (status)     where.status    = status
  if (statuses)   where.status    = { in: statuses.split(',') }
  if (orderType)  where.orderType = orderType
  if (search) {
    where.OR = [
      { orderNo:  { contains: search, mode: 'insensitive' } },
      { customer: { name:   { contains: search, mode: 'insensitive' } } },
      { customer: { mobile: { contains: search } } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    include: { customer: true },
 orderBy: [{ createdAt: 'desc' }],
    take: 500,
  })

  const result = orders.map((o: any) => ({
    ...o,
    orderItems: (() => {
      try { return JSON.parse(o.orderItemsJson || '[]') } catch { return [] }
    })(),
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    customerId, orderType, priority, dueDate, notes,
    items = [],
    vendorName, costPrice, paymentMethod,
    discount = 0, gstPct = 18, advancePaid = 0,
    subTotal = 0, gstAmount = 0, totalAmount = 0, balanceDue = 0,
  } = body

  if (!customerId) return NextResponse.json({ error: 'Customer is required' }, { status: 400 })
  if (!items.length) return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })

  const year    = new Date().getFullYear()
  const last    = await prisma.order.findFirst({
    where:   { orderNo: { startsWith: `ORD-${year}-` } },
    orderBy: { orderNo: 'desc' },
    select:  { orderNo: true },
  })
  const lastNum = last ? parseInt(last.orderNo.split('-')[2]) : 0
  const orderNo = `ORD-${year}-${String(lastNum + 1).padStart(4, '0')}`

  const sessionUser = session.user as any
  const fi = items[0] || {}

  const data: any = {
    orderNo,
    customerId,
    orderType:      orderType     || 'FLEX',
    priority:       priority      || 'NORMAL',
    status:         'PENDING',
    dueDate:        dueDate ? new Date(dueDate) : null,
    notes:          notes         || null,
    vendorName:     vendorName    || null,
    paymentMethod:  paymentMethod || null,
    costPrice:      costPrice  ? parseFloat(String(costPrice))  : null,
    discount:       parseFloat(String(discount)),
    gstPct:         parseFloat(String(gstPct)),
    gstAmount:      parseFloat(String(gstAmount)),
    subTotal:       parseFloat(String(subTotal)),
    totalAmount:    parseFloat(String(totalAmount)),
    advancePaid:    parseFloat(String(advancePaid)),
    balanceDue:     parseFloat(String(balanceDue)),
    itemCount:      items.length,
    orderItemsJson: JSON.stringify(items),
    operatorId:     sessionUser?.id || null,
  }

  if (orderType === 'FLEX') {
    data.width       = fi.widthFt  ? parseFloat(String(fi.widthFt))  : (fi.width  ? parseFloat(String(fi.width))  : null)
    data.height      = fi.heightFt ? parseFloat(String(fi.heightFt)) : (fi.height ? parseFloat(String(fi.height)) : null)
    data.sqFt        = fi.sqFt        ? parseFloat(String(fi.sqFt))        : null
    data.ratePerSqFt = fi.ratePerSqFt ? parseFloat(String(fi.ratePerSqFt)) : null
    data.flexMedia   = fi.flexMedia   || null
    data.description = fi.description || null
  } else {
    data.jobName    = fi.jobName    || null
    data.qty        = fi.qty        ? parseInt(String(fi.qty)) : null
    data.size       = fi.size       || null
    data.colors     = fi.colors     || null
    data.printSide  = fi.printSide  || null
    data.lamination = fi.lamination || null
    data.description = fi.description || null
  }

  try {
    const order = await prisma.order.create({
      data,
      include: { customer: true },
    })

    await prisma.statusLog.create({
      data: { orderId: order.id, status: 'PENDING', notes: 'Order created', userId: sessionUser?.id || null },
    })

    // ── AUTO-CREATE PAYMENT RECORD if advance was paid ──────────────────────
    const advAmt = parseFloat(String(advancePaid))
    if (advAmt > 0) {
      // Generate receipt number
      const lastPayment = await prisma.payment.findFirst({
        where:   { receiptNo: { startsWith: `REC-${year}-` } },
        orderBy: { receiptNo: 'desc' },
        select:  { receiptNo: true },
      })
      const lastPayNum = lastPayment ? parseInt(lastPayment.receiptNo.split('-')[2]) : 0
      const receiptNo  = `REC-${year}-${String(lastPayNum + 1).padStart(5, '0')}`

      await prisma.payment.create({
        data: {
          receiptNo,
          customerId,
          orderId:   order.id,
          amount:    advAmt,
          mode:      paymentMethod || 'Cash',
          notes:     `Advance payment for ${orderNo}`,
          date:      new Date(),
          type:      'PAYMENT',
        },
      })

      // If advance > total, store excess as customer credit balance
      const totalAmt = parseFloat(String(totalAmount))
      if (advAmt > totalAmt) {
        const excess = advAmt - totalAmt
        await prisma.customer.update({
          where: { id: customerId },
          data:  { balance: { increment: excess } },
        })
      }
    }

    return NextResponse.json({ ...order, orderItems: items }, { status: 201 })
  } catch (err: any) {
    console.error('Order create error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 })
  }
}