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
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      ordersByStatus,
      orderTotals,
      todayOrders,
      monthOrders,
      payments,
      todayPayments,
      customers,
      recentOrders,
    ] = await Promise.all([
      // Orders grouped by status
      prisma.order.groupBy({ by: ['status'], _count: true }),
      // All order financials
      prisma.order.aggregate({
        _sum: { totalAmount: true, advancePaid: true, balanceDue: true }
      }),
      // Today's orders
      prisma.order.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _count: true,
        _sum: { totalAmount: true }
      }),
      // This month's orders
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart } },
        _count: true,
        _sum: { totalAmount: true }
      }),
      // All payments
      prisma.payment.aggregate({ _sum: { amount: true } }),
      // Today's payments
      prisma.payment.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true }
      }),
      // Customer count
      prisma.customer.count(),
      // Recent 12 months revenue from orders grouped by month
      prisma.order.findMany({
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1000,
      }),
    ])

    // Build monthly revenue from real order data
    const monthlyMap: Record<string, number> = {}
    recentOrders.forEach((o: any) => {
      const key = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short' })
      monthlyMap[key] = (monthlyMap[key] || 0) + o.totalAmount
    })

    return NextResponse.json({
      // Order counts by status
      ordersByStatus,
      // Totals from ORDERS (not invoices)
      totalBilled:    orderTotals._sum.totalAmount  || 0,
      totalCollected: orderTotals._sum.advancePaid  || 0,
      totalOutstanding: orderTotals._sum.balanceDue || 0,
      // Today
      todayOrderCount:  todayOrders._count,
      todayRevenue:     todayOrders._sum.totalAmount || 0,
      todayCollected:   todayPayments._sum.amount    || 0,
      // Month
      monthOrderCount:  monthOrders._count,
      monthRevenue:     monthOrders._sum.totalAmount || 0,
      // Payments
      totalPayments:    payments._sum.amount || 0,
      // Customers
      customers,
      // Monthly chart data
      monthlyRevenue: monthlyMap,
    })
  }

  if (type === 'daily') {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
    const [orders, payments] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, include: { customer: true } }),
      prisma.payment.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, include: { customer: true } }),
    ])
    return NextResponse.json({ orders, payments })
  }

  if (type === 'customers') {
    const customers = await prisma.customer.findMany({
      include: {
        orders: { select: { totalAmount: true, status: true } },
        payments: { select: { amount: true } },
      },
    })
return NextResponse.json(customers.map((c: any) => ({
  ...c,
  totalOrders: c.orders.length,
  totalBusiness: c.orders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
  totalPaid: c.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0),
})))
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}