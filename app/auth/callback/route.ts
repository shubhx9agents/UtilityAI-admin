import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { AUDIT_ACTIONS } from '@/lib/audit'

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

        if (roleData?.role === 'admin' || roleData?.role === 'mod') {
            // Insert directly with the same authenticated client used for OAuth callback.
            // This avoids losing auth context in a secondary helper client.
            try {
                const ipAddress =
                    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                    request.headers.get('x-real-ip') ||
                    request.headers.get('cf-connecting-ip') ||
                    null
                const userAgent = request.headers.get('user-agent') || null

                const { error: auditError } = await supabase.from('audit_logs').insert({
                    user_id: user.id,
                    user_email: user.email || null,
                    action: AUDIT_ACTIONS.USER_LOGIN,
                    resource_type: 'user',
                    resource_id: user.id,
                    details: { email: user.email, source: 'admin_oauth', provider: 'google' },
                    ip_address: ipAddress,
                    user_agent: userAgent,
                })

                if (auditError) {
                    console.error('OAuth login audit insert failed:', auditError)
                }
            } catch (auditInsertError) {
                console.error('OAuth login audit insert error:', auditInsertError)
            }
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
