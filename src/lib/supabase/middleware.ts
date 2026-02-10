import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    type UserRole = 'admin' | 'factory_manager' | 'buyer' | 'driver'

    let supabaseResponse = NextResponse.next({
        request,
    })

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
        // Refresh the session — this is the primary job of the proxy.
        // supabase.auth.getUser() validates the JWT and refreshes the token if needed,
        // which triggers setAll above to write updated cookies onto supabaseResponse.
        const { data: { user } } = await supabase.auth.getUser()

        // If accessing protected route without auth, redirect to login
        if (isProtectedRoute && !user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('redirectTo', `${request.nextUrl.pathname}${request.nextUrl.search}`)
            return NextResponse.redirect(url)
        }

        // If accessing login while authenticated, redirect to appropriate dashboard.
        // We use a lightweight cookie-based check here; role enforcement happens
        // in server components / layouts to avoid extra DB calls in the proxy.
        if (request.nextUrl.pathname === '/login' && user) {
            // Quick profile fetch only for the login→dashboard redirect
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', user.id)
                .single()

            if (profile && profile.is_active !== false) {
                const dashboardMap: Record<string, string> = {
                    admin: '/admin',
                    factory_manager: '/factory',
                    buyer: '/buyer',
                    driver: '/driver',
                }
                const dashboard = dashboardMap[profile.role] || '/admin'
                const url = request.nextUrl.clone()
                url.pathname = dashboard
                return NextResponse.redirect(url)
            }
        }
    }

    return supabaseResponse
}
