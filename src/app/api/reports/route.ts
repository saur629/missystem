import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'summary'

  if (type === 'summary') {
    const [orders, invoiceStats, payments, customers] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true, paidAmount: true } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.customer.count(),
    ])
    return NextResponse.json({
      ordersByStatus: orders,
      totalBilled: invoiceStats._sum.totalAmount || 0,
      totalPaid: invoiceStats._sum.paidAmount || 0,
      totalPayments: payments._sum.amount || 0,
      customers,
    })
  }

  if (type === 'daily') {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const [orders, payments] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, include: { customer: true } }),
      prisma.payment.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, include: { customer: true } }),
    ])
    return NextResponse.json({ orders, payments })
  }

  if (type === 'customers') {
    const customers = await prisma.customer.findMany({
      include: { orders: { select: { totalAmount: true, status: true } }, payments: { select: { amount: true } } },
    })
    return NextResponse.json(customers.map(c => ({
      ...c,
      totalOrders: c.orders.length,
      totalBusiness: c.orders.reduce((s, o) => s + o.totalAmount, 0),
      totalPaid: c.payments.reduce((s, p) => s + p.amount, 0),
    })))
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
