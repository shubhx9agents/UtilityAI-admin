import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        // Verify admin access
        await requireAdmin()

        const { userId } = await params
        const body = await request.json()
        const { status } = body

        if (!['active', 'suspended', 'deleted'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be active, suspended, or deleted.' },
                { status: 400 }
            )
        }

        const supabaseAdmin = createServiceRoleClient()

        // For deleted status, we could also delete from auth.users, but the prompt says 
        // "he/she can login but all pathways... will be blocked", 
        // so we just update the status field.
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', userId)

        if (updateError) {
            throw new Error(`Failed to update status: ${updateError.message}`)
        }

        // Add to audit logs
        try {
            // Getting admin user ID would be nice, but we might not have it easily here without supabase auth check.
            // We just log the action.
            await supabaseAdmin.from('audit_logs').insert({
                action: status === 'deleted' ? 'user.deleted' : status === 'suspended' ? 'user.suspended' : 'user.restored',
                resource_type: 'user',
                resource_id: userId,
                details: { status },
                created_at: new Date().toISOString()
            })
        } catch (auditError) {
            console.error('Failed to write audit log:', auditError)
        }

        return NextResponse.json({ success: true, status })
    } catch (error: any) {
        console.error('Update status API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to update user status' },
            { status: 500 }
        )
    }
}
