import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function logActivity({
  userId,
  action,
  module,
  details,
  ipAddress,
}: {
  userId: string
  action: string
  module: string
  details?: string
  ipAddress?: string
}) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, module, details: details || null, ipAddress: ipAddress || null }
    })
  } catch (e) {
    console.error('Activity log error:', e)
  }
}