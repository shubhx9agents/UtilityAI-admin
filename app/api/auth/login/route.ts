import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { loginSchema, validateInput, validationErrorResponse } from '@/lib/validations'
import { sanitizeEmail } from '@/utils/sanitize'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const validation = validateInput(loginSchema, body)
        if (!validation.success) {
            return NextResponse.json(validationErrorResponse(validation.errors), { status: 400 })
        }

        const { email, password } = validation.data
        const sanitizedEmail = sanitizeEmail(email)

        if (!sanitizedEmail || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data, error } = await supabase.auth.signInWithPassword({
            email: sanitizedEmail,
            password,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        if (data.user) {
            await logAuditEvent({
                userId: data.user.id,
                userEmail: data.user.email || undefined,
                action: AUDIT_ACTIONS.USER_LOGIN,
                resourceType: 'user',
                resourceId: data.user.id,
                details: { email: data.user.email, source: 'admin_panel' },
                request,
            })
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('Login API error:', error)
        return NextResponse.json(
            { error: error.message || 'Login failed' },
            { status: 500 }
        )
    }
}
