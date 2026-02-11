import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent, AUDIT_ACTIONS } from '@/lib/audit'
import { registerSchema, validateInput, validationErrorResponse } from '@/lib/validations'
import { sanitizeEmail, sanitizeText } from '@/utils/sanitize'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate input with Zod (rejects extra fields)
        const validation = validateInput(registerSchema, body)
        if (!validation.success) {
            return NextResponse.json(validationErrorResponse(validation.errors), { status: 400 })
        }

        const { email, password, name } = validation.data
        const sanitizedEmail = sanitizeEmail(email)
        const sanitizedName = sanitizeText(name)

        if (!sanitizedEmail) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data, error } = await supabase.auth.signUp({
            email: sanitizedEmail,
            password,
            options: {
                data: {
                    name: sanitizedName,
                },
            },
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        // Log successful registration
        if (data.user) {
            await logAuditEvent({
                userId: data.user.id,
                userEmail: data.user.email || undefined,
                action: AUDIT_ACTIONS.USER_SIGNUP,
                resourceType: 'user',
                resourceId: data.user.id,
                details: { email: data.user.email, name },
                request,
            })
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('Register API error:', error)
        return NextResponse.json(
            { error: error.message || 'Registration failed' },
            { status: 500 }
        )
    }
}
