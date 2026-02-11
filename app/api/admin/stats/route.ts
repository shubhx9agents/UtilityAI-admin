import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AdminStats } from '@/types'

export async function GET(request: NextRequest) {
    try {
        // Verify admin access
        await requireAdmin()

        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        // Get total users count from auth.users
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
        const totalUsers = authUsers?.users?.length || 0

        // Get total sessions count
        const { count: totalSessions } = await supabase
            .from('agent_sessions')
            .select('*', { count: 'exact', head: true })

        // Get recent activity (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: recentActivity } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twentyFourHoursAgo)

        // Get most active users (by audit log count)
        const { data: userActivity } = await supabase
            .from('audit_logs')
            .select('user_email')
            .not('user_email', 'is', null)
            .gte('created_at', twentyFourHoursAgo)

        // Count actions per user
        const userActionCounts = new Map<string, number>()
        userActivity?.forEach(log => {
            if (log.user_email) {
                userActionCounts.set(
                    log.user_email,
                    (userActionCounts.get(log.user_email) || 0) + 1
                )
            }
        })

        const mostActiveUsers = Array.from(userActionCounts.entries())
            .map(([user_email, action_count]) => ({ user_email, action_count }))
            .sort((a, b) => b.action_count - a.action_count)
            .slice(0, 5)

        // Get most used agents
        const { data: sessions } = await supabase
            .from('agent_sessions')
            .select('agent_type')

        const agentUsageCounts = new Map<string, number>()
        sessions?.forEach(session => {
            agentUsageCounts.set(
                session.agent_type,
                (agentUsageCounts.get(session.agent_type) || 0) + 1
            )
        })

        const mostUsedAgents = Array.from(agentUsageCounts.entries())
            .map(([agent_type, usage_count]) => ({ agent_type, usage_count }))
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, 5)

        const stats: AdminStats = {
            total_users: totalUsers || 0,
            total_sessions: totalSessions || 0,
            recent_activity_24h: recentActivity || 0,
            most_active_users: mostActiveUsers,
            most_used_agents: mostUsedAgents,
        }

        return NextResponse.json({ data: stats })
    } catch (error: any) {
        console.error('Admin stats API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to fetch statistics' },
            { status: 500 }
        )
    }
}
