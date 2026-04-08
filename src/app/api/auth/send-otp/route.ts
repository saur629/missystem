import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendSMS(mobile: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from || sid.includes('xxx')) {
    console.log(`\n📱 [SMS OTP Mock]\nTo: ${mobile}\nMessage: ${message}\n`)
    return true
  }
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: mobile, From: from, Body: message }).toString(),
      }
    )
    return res.ok
  } catch { return false }
}

export async function POST(req: NextRequest) {
  const { mobile } = await req.json()
  if (!mobile || mobile.length < 10) return NextResponse.json({ error: 'Valid mobile number required' }, { status: 400 })

  const user = await prisma.user.findFirst({ where: { mobile, active: true }, select: { id: true, name: true } })
  if (!user) return NextResponse.json({ error: 'No active account found with this mobile number' }, { status: 404 })

  await prisma.otpCode.updateMany({ where: { mobile, used: false }, data: { used: true } })

  const code = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.otpCode.create({ data: { mobile, code, expiresAt } })

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'PrintFlow'
  await sendSMS(mobile, `${code} is your ${shopName} password reset OTP. Valid for 10 minutes. Do not share.`)

  return NextResponse.json({
    success: true,
    message: `OTP sent to ${mobile.slice(0, 4)}XXXXXX${mobile.slice(-2)}`,
    ...(process.env.NODE_ENV === 'development' ? { devOtp: code } : {}),
  })
}