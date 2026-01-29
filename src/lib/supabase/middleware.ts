import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create an unmodified response for potential use if no session update is needed
    // but we specifically need the response to be able to set cookies on it

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )

                    supabaseResponse = NextResponse.next({
                        request,
                    })

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Do not run Supabase code on static assets or Next.js internals
    if (
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.startsWith('/favicon.ico')
    ) {
        return supabaseResponse
    }

    // Define protected routes that require authentication
    const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/admin') ||
        request.nextUrl.pathname.startsWith('/factory') ||
        request.nextUrl.pathname.startsWith('/buyer') ||
        request.nextUrl.pathname.startsWith('/driver')

    // Only check auth for protected routes or login page
    if (isProtectedRoute || request.nextUrl.pathname === '/login') {
        // IMPORTANT: You *must* return the supabaseResponse object as it might have cookies set
        // This refreshes the session if needed
        const { data: { user } } = await supabase.auth.getUser()

        // If accessing protected route without auth, redirect to login
        if (isProtectedRoute && !user) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
            return NextResponse.redirect(redirectUrl)
        }

        // If accessing login while authenticated, redirect to appropriate dashboard
        if (request.nextUrl.pathname === '/login' && user) {
            // Get user profile to determine role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile) {
                const dashboardMap = {
                    admin: '/admin',
                    factory_manager: '/factory',
                    buyer: '/buyer',
                    driver: '/driver',
                }

                const dashboard = dashboardMap[profile.role as keyof typeof dashboardMap] || '/admin'
                const redirectUrl = request.nextUrl.clone()
                redirectUrl.pathname = dashboard
                return NextResponse.redirect(redirectUrl)
            }
        }
    }

    return supabaseResponse
}
