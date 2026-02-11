import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, updateUserRole } from '@/lib/admin'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'
import { updateUserRoleSchema, validateInput, validationErrorResponse, uuidSchema } from '@/lib/validations'

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

        // Validate input with Zod (rejects extra fields)
        const validation = validateInput(updateUserRoleSchema, body)
        if (!validation.success) {
            return NextResponse.json(validationErrorResponse(validation.errors), { status: 400 })
        }

        const { role } = validation.data

        // Get current admin user
        const supabase = await createClient()
        const {
            data: { user: adminUser },
        } = await supabase.auth.getUser()

        // Update the role
        await updateUserRole(userId, role)

        // Get target user email
        const { data: targetUser } = await supabase.auth.admin.getUserById(userId)

        // Log audit event
        await logAuditEvent({
            userId: adminUser?.id,
            userEmail: adminUser?.email,
            action: AUDIT_ACTIONS.ROLE_UPDATED,
            resourceType: 'user',
            resourceId: userId,
            details: {
                new_role: role,
                target_user_email: targetUser?.user?.email,
            },
            request,
        })

        return NextResponse.json({
            message: 'User role updated successfully',
            data: { userId, role },
        })
    } catch (error: any) {
        console.error('Update role API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to update user role' },
            { status: 500 }
        )
    }
}
