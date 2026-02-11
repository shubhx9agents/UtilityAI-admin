import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        await supabase.auth.exchangeCodeForSession(code)
    }

    // Check if user is admin after OAuth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Check admin status
        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (roleData?.role === 'admin' || roleData?.role === 'moderator') {
            // Redirect to admin dashboard
            return NextResponse.redirect(new URL('/admin', requestUrl.origin))
        } else {
            // Not an admin, sign out and redirect to login with error
            await supabase.auth.signOut()
            return NextResponse.redirect(new URL('/login?error=unauthorized', requestUrl.origin))
        }
    }

    // Redirect to login if no user
    return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
