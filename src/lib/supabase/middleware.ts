import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    type UserRole = 'admin' | 'factory_manager' | 'buyer' | 'driver'

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
        let profile: { role: UserRole; is_active: boolean | null } | null = null

        if (user) {
            const { data: fetchedProfile } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', user.id)
                .single()

            profile = (fetchedProfile as { role: UserRole; is_active: boolean | null } | null) ?? null
        }

        // If accessing protected route without auth, redirect to login
        if (isProtectedRoute && !user) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
            return NextResponse.redirect(redirectUrl)
        }

        // Enforce account status at edge: inactive users are immediately logged out.
        if (user && (!profile || profile.is_active === false)) {
            await supabase.auth.signOut()
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            return NextResponse.redirect(redirectUrl)
        }

        // If user is authenticated, verify they have access to the portal
        if (user && profile && isProtectedRoute) {
                const role = profile.role
                const pathname = request.nextUrl.pathname

                // Define which roles can access which portals
                const rolePortalAccess: Record<string, string[]> = {
                    admin: ['/admin', '/factory', '/buyer', '/driver'], // Admin has full access
                    factory_manager: ['/factory'],
                    buyer: ['/buyer'],
                    driver: ['/driver'],
                }

                const allowedPortals = rolePortalAccess[role] || []
                const currentPortal = '/' + pathname.split('/')[1] // e.g., '/admin', '/factory', etc.

                // Check if user has access to this portal
                const hasAccess = allowedPortals.some(portal => currentPortal.startsWith(portal))

                if (!hasAccess) {
                    // Redirect to their default portal
                    const dashboardMap: Record<string, string> = {
                        admin: '/admin',
                        factory_manager: '/factory',
                        buyer: '/buyer',
                        driver: '/driver',
                    }

                    const redirectUrl = request.nextUrl.clone()
                    redirectUrl.pathname = dashboardMap[role] || '/login'
                    return NextResponse.redirect(redirectUrl)
                }
        }

        // If accessing login while authenticated, redirect to appropriate dashboard
        if (request.nextUrl.pathname === '/login' && user && profile) {
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

    return supabaseResponse
}
