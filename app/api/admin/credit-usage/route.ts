import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const PLAN_LIMITS = {
    free: { outputs: 10, canvas: 3 },
    premium: { outputs: 50, canvas: 20 },
}

export async function GET(_request: NextRequest) {
    try {
        await requireAdmin()

        const supabaseAdmin = createServiceRoleClient()

        // List all auth users
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        if (authError) throw new Error(`Failed to fetch users: ${authError.message}`)

        // Fetch all user_usage rows (aggregate columns only)
        const { data: usageRows, error: usageError } = await supabaseAdmin
            .from('user_usage')
            .select('user_id, total_credits_used, canvas_creations_used, updated_at')

        if (usageError) {
            console.error('Error fetching usage:', usageError)
        }

        // Fetch all profiles for subscription type
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, account_type')

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
        }

        // Build lookup maps
        const usageMap = new Map<string, { total_credits_used: number; canvas_creations_used: number; updated_at: string }>()
        usageRows?.forEach(row => {
            usageMap.set(row.user_id, {
                total_credits_used: row.total_credits_used || 0,
                canvas_creations_used: row.canvas_creations_used || 0,
                updated_at: row.updated_at,
            })
        })

        const planMap = new Map<string, 'free' | 'premium'>()
        profiles?.forEach(p => {
            planMap.set(p.id, p.account_type === 'premium' || p.account_type === 'enterprise' ? 'premium' : 'free')
        })

        // Combine
        const result = authData.users.map(user => {
            const plan = planMap.get(user.id) || 'free'
            const limits = PLAN_LIMITS[plan]
            const usage = usageMap.get(user.id) || { total_credits_used: 0, canvas_creations_used: 0, updated_at: null as any }

            return {
                id: user.id,
                email: user.email || '',
                plan,
                usage: {
                    total_credits_used: usage.total_credits_used,
                    canvas_creations_used: usage.canvas_creations_used,
                    last_activity: usage.updated_at,
                },
                limits: {
                    outputs: limits.outputs,
                    canvas: limits.canvas,
                },
                agent_exhausted: usage.total_credits_used >= limits.outputs,
                canvas_exhausted: usage.canvas_creations_used >= limits.canvas,
            }
        })

        return NextResponse.json({ data: result })
    } catch (error: any) {
        console.error('Credit usage API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        return NextResponse.json({ error: error.message || 'Failed to fetch credit usage' }, { status: 500 })
    }
}
