import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function formatDateKey(dateInput: string | Date) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    return date.toISOString().slice(0, 10)
}

function getHourKey(dateInput: string | Date) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    const d = new Date(date)
    d.setMinutes(0, 0, 0)
    return d.toISOString()
}

export async function GET(request: NextRequest) {
    try {
        await requireAdmin()

        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        const url = new URL(request.url)
        const startDateParam = url.searchParams.get('start_date')
        const endDateParam = url.searchParams.get('end_date')

        // Default to last 7 days if not provided
        const endDate = endDateParam ? new Date(endDateParam) : new Date()
        const startDate = startDateParam
            ? new Date(startDateParam)
            : new Date(new Date().setDate(new Date().getDate() - 6))

        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        const startIso = startDate.toISOString()
        const endIso = endDate.toISOString()

        const diffMs = endDate.getTime() - startDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        const isHourly = diffDays <= 3

        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
        const totalUsers = authUsers?.users?.length || 0

        const { count: sessionCount } = await supabase
            .from('agent_sessions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        const { count: activityCount } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        const { data: userActivity } = await supabase
            .from('audit_logs')
            .select('user_email')
            .not('user_email', 'is', null)
            .gte('created_at', startIso)
            .lte('created_at', endIso)

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

        const { data: sessionsData } = await supabase
            .from('agent_sessions')
            .select('agent_type, created_at')
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        const agentUsageCounts = new Map<string, number>()
        sessionsData?.forEach(session => {
            agentUsageCounts.set(
                session.agent_type,
                (agentUsageCounts.get(session.agent_type) || 0) + 1
            )
        })
        const mostUsedAgents = Array.from(agentUsageCounts.entries())
            .map(([agent_type, usage_count]) => ({ agent_type, usage_count }))
            .sort((a, b) => b.usage_count - a.usage_count)
            .slice(0, 5)

        const totalAgentSessions = mostUsedAgents.reduce((sum, item) => sum + item.usage_count, 0)
        const agentUsageDistribution = mostUsedAgents.map((item) => ({
            ...item,
            percentage: totalAgentSessions > 0 ? Math.round((item.usage_count / totalAgentSessions) * 100) : 0,
        }))

        const { data: auditLogs } = await supabase
            .from('audit_logs')
            .select('action, resource_type, created_at')
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        const actionBreakdownMap = new Map<string, number>()
        const resourceBreakdownMap = new Map<string, number>()

        let totalLogins = 0
        let totalLogouts = 0

        const timelineMap = new Map<
            string,
            { timeKey: string; displayLabel: string; actions: number; sessions_created: number; user_logins: number; user_logouts: number }
        >()

        if (isHourly) {
            let current = new Date(startDate)
            current.setMinutes(0, 0, 0)
            while (current <= endDate) {
                const k = current.toISOString()
                const label = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                timelineMap.set(k, { timeKey: k, displayLabel: label, actions: 0, sessions_created: 0, user_logins: 0, user_logouts: 0 })
                current.setHours(current.getHours() + 1)
            }
        } else {
            let current = new Date(startDate)
            while (current <= endDate) {
                const k = formatDateKey(current)
                const label = new Date(current).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                timelineMap.set(k, { timeKey: k, displayLabel: label, actions: 0, sessions_created: 0, user_logins: 0, user_logouts: 0 })
                current.setDate(current.getDate() + 1)
            }
        }

        auditLogs?.forEach((log) => {
            actionBreakdownMap.set(log.action, (actionBreakdownMap.get(log.action) || 0) + 1)
            const resourceType = log.resource_type || 'system'
            resourceBreakdownMap.set(resourceType, (resourceBreakdownMap.get(resourceType) || 0) + 1)

            if (log.action === 'user.login') totalLogins += 1
            if (log.action === 'user.logout') totalLogouts += 1

            if (isHourly) {
                const hKey = getHourKey(log.created_at)
                const bucket = timelineMap.get(hKey)
                if (bucket) {
                    bucket.actions += 1
                    if (log.action === 'user.login') bucket.user_logins += 1
                    if (log.action === 'user.logout') bucket.user_logouts += 1
                }
            } else {
                const dKey = formatDateKey(log.created_at)
                const bucket = timelineMap.get(dKey)
                if (bucket) {
                    bucket.actions += 1
                    if (log.action === 'user.login') bucket.user_logins += 1
                    if (log.action === 'user.logout') bucket.user_logouts += 1
                }
            }
        })

        sessionsData?.forEach((session) => {
            if (isHourly) {
                const hKey = getHourKey(session.created_at)
                const bucket = timelineMap.get(hKey)
                if (bucket) {
                    bucket.sessions_created += 1
                }
            } else {
                const dKey = formatDateKey(session.created_at)
                const bucket = timelineMap.get(dKey)
                if (bucket) {
                    bucket.sessions_created += 1
                }
            }
        })

        const actionBreakdown = Array.from(actionBreakdownMap.entries())
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)

        const resourceBreakdown = Array.from(resourceBreakdownMap.entries())
            .map(([resource_type, count]) => ({ resource_type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)

        const activityTimeline = Array.from(timelineMap.values())
            .sort((a, b) => a.timeKey.localeCompare(b.timeKey))

        const stats = {
            total_users: totalUsers || 0,
            total_sessions_filtered: sessionCount || 0,
            activity_count_filtered: activityCount || 0,
            total_logins_filtered: totalLogins,
            total_logouts_filtered: totalLogouts,
            most_active_users: mostActiveUsers,
            most_used_agents: mostUsedAgents,
            agent_usage_distribution: agentUsageDistribution,
            action_breakdown: actionBreakdown,
            resource_breakdown: resourceBreakdown,
            activity_timeline: activityTimeline,
        }

        return NextResponse.json({ data: stats })
    } catch (error: any) {
        console.error('Admin stats API error:', error)
        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
        return NextResponse.json({ error: error.message || 'Failed to fetch statistics' }, { status: 500 })
    }
}
