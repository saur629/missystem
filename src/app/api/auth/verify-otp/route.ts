import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { mobile, code, newPassword } = await req.json()
  if (!mobile || !code || !newPassword) return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const otp = await prisma.otpCode.findFirst({
    where: { mobile, code, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!otp) return NextResponse.json({ error: 'Invalid or expired OTP. Please request a new one.' }, { status: 400 })

  await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } })

  const hashed = await bcrypt.hash(newPassword, 10)
  const result = await prisma.user.updateMany({ where: { mobile, active: true }, data: { password: hashed } })
  if (result.count === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ success: true, message: 'Password reset successfully. Please login.' })
}