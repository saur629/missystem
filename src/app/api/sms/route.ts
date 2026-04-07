import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [templates, logs] = await Promise.all([
    prisma.smsTemplate.findMany({ where: { active: true } }),
    prisma.smsLog.findMany({ orderBy: { sentAt: 'desc' }, take: 50 }),
  ])
  return NextResponse.json({ templates, logs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { mobile, message, template, customerId } = await req.json()
  if (!mobile || !message) return NextResponse.json({ error: 'Mobile and message required' }, { status: 400 })
  // Twilio integration (optional)
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  let status = 'SENT'
  if (sid && token && from && !sid.includes('xxx')) {
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method:'POST', headers:{'Authorization':'Basic '+Buffer.from(`${sid}:${token}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({To:mobile,From:from,Body:message}).toString() })
      if (!r.ok) status = 'FAILED'
    } catch { status = 'FAILED' }
  } else {
    console.log(`[SMS Mock] To:${mobile} | ${message}`)
  }
  const log = await prisma.smsLog.create({ data: { mobile, message, template, customerId: customerId || null, status } })
  return NextResponse.json(log, { status: 201 })
}
