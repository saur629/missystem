import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { logActivity } from './activity'

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        try {
          const user = await prisma.user.findUnique({ where: { username: credentials.username } })
          if (!user || !user.active) return null
          const ok = await bcrypt.compare(credentials.password, user.password)
          if (!ok) return null
          return { id: user.id, name: user.name, email: user.username, role: user.role } as any
        } catch (e) {
          console.error('Auth error:', e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) { token.role = user.role; token.id = user.id }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) { session.user.role = token.role; session.user.id = token.id }
      return session
    },
  },
   events: {
    async signIn({ user }) {
      if (user?.id) {
        await logActivity({
          userId: user.id,
          action: 'LOGIN',
          module: 'auth',
          details: `${user.name} logged in`,
        })
      }
    },
    async signOut({ token }: any) {
      if (token?.id) {
        await logActivity({
          userId: token.id,
          action: 'LOGOUT',
          module: 'auth',
          details: `User logged out`,
        })
      }
    },
  },

  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
}
