import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'summary'

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (type === 'summary') {
    const today      = new Date(); today.setHours(0,0,0,0)
    const tomorrow   = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      ordersByStatus, orderTotals, todayOrders, monthOrders,
      payments, todayPayments, customers, recentOrders,
    ] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.order.aggregate({ _sum: { totalAmount: true, advancePaid: true, balanceDue: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: today, lt: tomorrow } }, _count: true, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: monthStart } }, _count: true, _sum: { totalAmount: true } }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { createdAt: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
      prisma.customer.count(),
      prisma.order.findMany({ select: { totalAmount: true, createdAt: true }, orderBy: { createdAt: 'asc' }, take: 1000 }),
    ])

    const monthlyMap: Record<string, number> = {}
    recentOrders.forEach((o: any) => {
      const key = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short' })
      monthlyMap[key] = (monthlyMap[key] || 0) + o.totalAmount
    })

    return NextResponse.json({
      ordersByStatus,
      totalBilled:      orderTotals._sum.totalAmount  || 0,
      totalCollected:   orderTotals._sum.advancePaid  || 0,
      // Clamp to 0 — never show negative outstanding
      totalOutstanding: Math.max(0, orderTotals._sum.balanceDue || 0),
      todayOrderCount:  todayOrders._count,
      todayRevenue:     todayOrders._sum.totalAmount  || 0,
      todayCollected:   todayPayments._sum.amount     || 0,
      monthOrderCount:  monthOrders._count,
      monthRevenue:     monthOrders._sum.totalAmount  || 0,
      totalPayments:    payments._sum.amount          || 0,
      customers,
      monthlyRevenue:   monthlyMap,
    })
  }

  // ── DAILY ─────────────────────────────────────────────────────────────────
  if (type === 'daily') {
    const today    = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
    const [orders, payments] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, include: { customer: true } }),
      prisma.payment.findMany({ where: { createdAt: { gte: today, lt: tomorrow } }, include: { customer: true } }),
    ])
    return NextResponse.json({ orders, payments })
  }

  // ── CUSTOMERS — outstanding clamped to 0, never negative ──────────────────
  if (type === 'customers') {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          select: {
            id: true, orderNo: true, totalAmount: true,
            advancePaid: true, balanceDue: true, status: true, createdAt: true,
          },
        },
        payments: {
          select: { id: true, amount: true, mode: true, createdAt: true, receiptNo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = customers.map((c: any) => {
      const totalOrders   = c.orders.length
      const totalBusiness = c.orders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0)
      // totalPaid = real payment records received
      const totalPaid     = c.payments.reduce((s: number, p: any) => s + (p.amount || 0), 0)
      // totalBalance = sum of balanceDue per order, each clamped to 0 (never negative)
      const totalBalance  = c.orders.reduce((s: number, o: any) => s + Math.max(0, o.balanceDue || 0), 0)
      const paymentCount  = c.payments.length
      const lastOrder     = [...c.orders].sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]

      return {
        id:            c.id,
        name:          c.name,
        mobile:        c.mobile,
        city:          c.city,
        gstNo:         c.gstNo,
        active:        c.active,
        createdAt:     c.createdAt,
        totalOrders,
        totalBusiness,
        totalPaid,
        totalBalance,    // always >= 0
        paymentCount,
        lastOrderDate:   lastOrder?.createdAt || null,
      }
    })

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}