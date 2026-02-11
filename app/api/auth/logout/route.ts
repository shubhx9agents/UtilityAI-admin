import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (user) {
            await logAuditEvent({
                userId: user.id,
                userEmail: user.email || undefined,
                action: AUDIT_ACTIONS.USER_LOGOUT,
                resourceType: 'user',
                resourceId: user.id,
                details: { email: user.email, source: 'admin_panel' },
                request,
            })
        }

        // Sign out
        const { error } = await supabase.auth.signOut()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Logout API error:', error)
        return NextResponse.json(
            { error: error.message || 'Logout failed' },
            { status: 500 }
        )
    }
}
