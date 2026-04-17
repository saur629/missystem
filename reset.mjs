import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const hash = await bcrypt.hash('test1234', 10)
await prisma.user.update({ 
  where: { username: 'admin' }, 
  data: { password: hash } 
})
console.log('Done! New password is: test1234')
console.log('New hash:', hash)
await prisma.$disconnect()