import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { authRateLimiter, getClientIP } from '@/lib/utils/rateLimit'

function safeRedirectPath(path: string | null): string | null {
  if (!path) return null
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return null
  // Prevent open redirects to //evil.com
  if (trimmed.startsWith('//')) return null
  return trimmed
}

export async function POST(request: NextRequest) {
  // IMPORTANT: do login via a standard route handler so Set-Cookie is applied to a real navigation response.
  // This avoids "logged in, but clicking any link returns to /login" issues caused by missing cookies.

  // Rate limit (same behavior as server action)
  const clientIP = getClientIP(request.headers)
  const { success: rateLimitOk } = await authRateLimiter.check(clientIP)
  if (!rateLimitOk) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'rate_limit')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  const formData = await request.formData()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = safeRedirectPath(String(formData.get('redirectTo') ?? '')) || null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'config')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  // Collect cookies set by Supabase during sign-in and apply them to our redirect response.
  const cookieJar: Array<{ name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }> = []

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          cookieJar.push({ name, value, options })
        })
      },
    },
  })

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'bad_credentials')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'no_user')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut()
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'inactive')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  const dashboardMap: Record<string, string> = {
    admin: '/admin',
    factory_manager: '/factory',
    buyer: '/buyer',
    driver: '/driver',
  }
  const defaultDashboard = dashboardMap[profile.role] || '/admin'

  // Only allow redirectTo within the user's allowed portals.
  const rolePortalAccess: Record<string, string[]> = {
    admin: ['/admin', '/factory', '/buyer', '/driver'],
    factory_manager: ['/factory'],
    buyer: ['/buyer'],
    driver: ['/driver'],
  }
  const allowed = rolePortalAccess[profile.role] || []
  const target = redirectTo && allowed.some((p) => redirectTo.startsWith(p)) ? redirectTo : defaultDashboard

  const url = new URL(target, request.url)
  const redirectResponse = NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  cookieJar.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
  return redirectResponse
}
