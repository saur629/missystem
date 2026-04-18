import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Module → route mapping
const MODULE_ROUTES: Record<string, string> = {
  'Dashboard':          '/dashboard',
  'View All Orders':    '/orders',
  'Designer Panel':     '/designer',
  'Printing Panel':     '/printing',
  'Production Panel':   '/production',
  'Quotations':         '/quotations',
  'Invoices':           '/invoices',
  'Payments':           '/payments',
  'Purchase Orders':    '/purchase',
  'Reports':            '/reports',
  'Attendance':         '/attendance',
  'Access Control':     '/access-control',
  'Masters / Settings': '/masters',
  'SMS Alerts':         '/sms',
}

const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/dashboard',
  ADMIN:       '/dashboard',
  RECEPTION:   '/orders',
  DESIGNER:    '/designer',
  PRINTING:    '/printing',
  PRODUCTION:  '/production',
  USER:        '/orders',
}

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token
    const role = token?.role as string
    const pathname = req.nextUrl.pathname

    // Super Admin bypasses all checks
    if (role === 'SUPER_ADMIN') return NextResponse.next()

    // Find which module this route belongs to
    const matchedModule = Object.entries(MODULE_ROUTES).find(([, route]) =>
      pathname.startsWith(route)
    )

    if (!matchedModule) return NextResponse.next()

    const [moduleName] = matchedModule

    // Fetch permissions from DB
    try {
      const res = await fetch(`${req.nextUrl.origin}/api/permissions`)
      const perms: { module: string; role: string; allowed: boolean }[] = await res.json()

      const perm = perms.find(p => p.module === moduleName && p.role === role)

      // If no permission record exists, deny by default
      const allowed = perm?.allowed ?? false

      if (!allowed) {
        const home = ROLE_HOME[role] || '/orders'
        return NextResponse.redirect(new URL(home, req.url))
      }
    } catch {
      // If DB fetch fails, allow through (fail open) — or change to deny if you prefer
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    '/((?!login|api/auth|api/permissions|_next/static|_next/image|favicon.ico).*)',
  ],
}