import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { uuidSchema } from '@/lib/validations'
import { z } from 'zod'

// Only 'revoke' is accepted — admins cannot promote users to premium
const revokeSubscriptionSchema = z.object({
    action: z.literal('revoke'),
}).strict()

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        // Verify admin access
        await requireAdmin()

        const { userId } = await params

        // Validate user ID
        const userIdValidation = uuidSchema.safeParse(userId)
        if (!userIdValidation.success) {
            return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
        }

        const body = await request.json()

        // Validate input — only 'revoke' allowed
        const validation = revokeSubscriptionSchema.safeParse(body)
        if (!validation.success) {
            // Explicitly reject any attempt to upgrade via admin
            return NextResponse.json(
                {
                    error: 'Forbidden: Admin cannot manually promote users to premium. Only revocation is permitted.',
                },
                { status: 403 }
            )
        }

        // Use service role to bypass RLS for cross-user update
        const supabaseAdmin = createServiceRoleClient()
        const supabase = await createClient()

        // Check current subscription type
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('account_type, email')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        if (profile.account_type !== 'premium' && profile.account_type !== 'enterprise') {
            return NextResponse.json(
                { error: 'User is not on a premium plan — nothing to revoke' },
                { status: 400 }
            )
        }

        // Revoke: set account_type back to 'basic' (maps to 'free' in app layer)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ account_type: 'basic', updated_at: new Date().toISOString() })
            .eq('id', userId)

        if (updateError) {
            throw new Error(`Failed to revoke subscription: ${updateError.message}`)
        }

        // Get admin user for audit log
        const {
            data: { user: adminUser },
        } = await supabase.auth.getUser()

        // Log audit event
        await logAuditEvent({
            userId: adminUser?.id,
            userEmail: adminUser?.email,
            action: AUDIT_ACTIONS.SUBSCRIPTION_REVOKED,
            resourceType: 'subscription',
            resourceId: userId,
            details: {
                target_user_email: profile.email,
                previous_account_type: profile.account_type,
                new_account_type: 'basic',
            },
            request,
        })

        return NextResponse.json({
            message: 'Subscription revoked successfully',
            data: { userId, subscription_type: 'free' },
        })
    } catch (error: any) {
        console.error('Revoke subscription API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        return NextResponse.json(
            { error: error.message || 'Failed to revoke subscription' },
            { status: 500 }
        )
    }
}
