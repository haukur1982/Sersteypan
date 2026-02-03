import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()

    // Sign out from Supabase (clears server-side session)
    await supabase.auth.signOut()

    // Force clear likely cookie names just in case
    const response = NextResponse.redirect(new URL('/login', request.url))

    // We rely on standard Supabase signout, but explicit cookie clearing is safer
    // response.cookies.delete('sb-access-token') // Example if we knew exact name

    revalidatePath('/', 'layout')

    return response
}
