import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AdminUser } from '@/types'

export async function GET(request: NextRequest) {
    try {
        // Verify admin access
        await requireAdmin()

        // Use service role client for admin operations
        const supabaseAdmin = createServiceRoleClient()
        const supabase = await createClient()

        // Get all users from auth.users
        const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()

        if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`)
        }

        // Get user roles
        const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role')

        if (rolesError) {
            console.error('Error fetching roles:', rolesError)
        }

        // Get profiles for subscription type (account_type)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, account_type')

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
        }

        // Get session counts per user
        const { data: sessionCounts, error: sessionError } = await supabase
            .from('agent_sessions')
            .select('user_id')

        if (sessionError) {
            console.error('Error fetching session counts:', sessionError)
        }

        // Create a map of user roles
        const roleMap = new Map(
            roles?.map(r => [r.user_id, r.role]) || []
        )

        // Create a map of account types (id → 'free' | 'premium')
        const accountTypeMap = new Map<string, 'free' | 'premium'>()
        profiles?.forEach(p => {
            const isPremium = p.account_type === 'premium' || p.account_type === 'enterprise'
            accountTypeMap.set(p.id, isPremium ? 'premium' : 'free')
        })

        // Create a map of session counts
        const sessionCountMap = new Map<string, number>()
        sessionCounts?.forEach(s => {
            sessionCountMap.set(s.user_id, (sessionCountMap.get(s.user_id) || 0) + 1)
        })

        // Combine data
        const adminUsers: AdminUser[] = users.users.map(user => ({
            id: user.id,
            email: user.email || '',
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at || null,
            role: roleMap.get(user.id) || 'user',
            session_count: sessionCountMap.get(user.id) || 0,
            subscription_type: accountTypeMap.get(user.id) || 'free',
        }))

        return NextResponse.json({ data: adminUsers })
    } catch (error: any) {
        console.error('Admin users API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to fetch users' },
            { status: 500 }
        )
    }
}
