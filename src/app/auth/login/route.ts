import { NextResponse, type NextRequest } from 'next/server'
import { authRateLimiter, getClientIP } from '@/lib/utils/rateLimit'
import { createClient } from '@/lib/supabase/server'

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

  const supabase = await createClient()
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'bad_credentials')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  const user = signInData.user
  if (!user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('error', 'no_user')
    return NextResponse.redirect(url, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }

  // Redirect target:
  // - honor redirectTo if it is a safe same-origin path
  // - otherwise send to /admin and let middleware route to the right portal
  const target = redirectTo || '/admin'
  return NextResponse.redirect(new URL(target, request.url), { status: 303, headers: { 'Cache-Control': 'no-store' } })
}
