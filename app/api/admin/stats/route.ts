import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { AdminStats } from '@/types'

function formatDateKey(dateInput: string | Date) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    return date.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
    try {
        // Verify admin access
        await requireAdmin()

        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()
        const now = new Date()
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)
        const sevenDayStart = new Date(startOfToday)
        sevenDayStart.setDate(sevenDayStart.getDate() - 6)
        const sevenDayStartIso = sevenDayStart.toISOString()

        // Get total users count from auth.users
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
        const totalUsers = authUsers?.users?.length || 0

        // Get total sessions count
        const { count: totalSessions } = await supabase
            .from('agent_sessions')
            .select('*', { count: 'exact', head: true })

        // Get recent activity (last 24 hours)
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

        const totalAgentSessions = mostUsedAgents.reduce((sum, item) => sum + item.usage_count, 0)
        const agentUsageDistribution = mostUsedAgents.map((item) => ({
            ...item,
            percentage: totalAgentSessions > 0 ? Math.round((item.usage_count / totalAgentSessions) * 100) : 0,
        }))

        const { data: auditLogs7d } = await supabase
            .from('audit_logs')
            .select('action, resource_type, created_at')
            .gte('created_at', sevenDayStartIso)

        const { data: sessions7d } = await supabase
            .from('agent_sessions')
            .select('created_at')
            .gte('created_at', sevenDayStartIso)

        const actionBreakdownMap = new Map<string, number>()
        const resourceBreakdownMap = new Map<string, number>()

        // 7-day timeline map
        const timelineMap = new Map<
            string,
            { date: string; actions: number; sessions_created: number; user_logins: number; user_logouts: number }
        >()

        // Initialize last 7 days including today
        for (let i = 0; i < 7; i++) {
            const day = new Date()
            day.setDate(day.getDate() - (6 - i)) // start from 6 days ago up to today
            const key = formatDateKey(day)
            timelineMap.set(key, {
                date: key,
                actions: 0,
                sessions_created: 0,
                user_logins: 0,
                user_logouts: 0,
            })
        }

        // 24-hour timeline map
        const timeline24hMap = new Map<
            string,
            { hour: string; actions: number; sessions_created: number; user_logins: number; user_logouts: number }
        >()

        // Initialize last 24 hours
        for (let i = 0; i < 24; i++) {
            const hourDate = new Date()
            hourDate.setHours(hourDate.getHours() - (23 - i), 0, 0, 0)
            const key = hourDate.toISOString() // accurate full ISO string for sorting/filtering consistency if needed, but we use formatted key for frontend
            const displayKey = hourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

            // We use the ISO string of the hour start as the map key to ensure correct bucketing
            // But we store a display friendly 'hour' property
            timeline24hMap.set(key, {
                hour: displayKey,
                actions: 0,
                sessions_created: 0,
                user_logins: 0,
                user_logouts: 0,
            })
        }

        let totalLogins24h = 0
        let totalLogouts24h = 0

        auditLogs7d?.forEach((log) => {
            actionBreakdownMap.set(log.action, (actionBreakdownMap.get(log.action) || 0) + 1)

            const resourceType = log.resource_type || 'system'
            resourceBreakdownMap.set(resourceType, (resourceBreakdownMap.get(resourceType) || 0) + 1)

            // Populate 7-day timeline
            // Use local date string match to align with initialized keys logic
            // Note: Date.parse() handles ISO strings correctly.
            // To match the initialized local date keys, we need to be careful.
            // Best approach: Convert log time to local date string format for matching.
            const logDate = new Date(log.created_at)
            const dayKey = formatDateKey(logDate) // This returns YYYY-MM-DD in local time

            const dayBucket = timelineMap.get(dayKey)
            if (dayBucket) {
                dayBucket.actions += 1
                if (log.action === 'user.login') dayBucket.user_logins += 1
                if (log.action === 'user.logout') dayBucket.user_logouts += 1
            }

            // Populate 24h timeline
            if (logDate >= new Date(Date.now() - 24 * 60 * 60 * 1000)) {
                // Round down to nearest hour
                const logHour = new Date(logDate)
                logHour.setMinutes(0, 0, 0)
                const hourKey = logHour.toISOString()

                // Find nearest bucket (exact match might fail due to specific ms, so iterate or assume alignment)
                // Actually, our initialization loop created keys by subtracting hours from *now*.
                // Better approach for 24h: Just map to the display hour of the log for simplicity if we trust the loop covers it,
                // OR match strictly.
                // Let's iterate map to find the matching hour slot.
                for (const [key, bucket] of timeline24hMap.entries()) {
                    const slotTime = new Date(key).getTime()
                    const logTime = logDate.getTime()
                    // If log is within this hour slot (slot <= log < slot + 1h)
                    if (logTime >= slotTime && logTime < slotTime + 60 * 60 * 1000) {
                        bucket.actions += 1
                        if (log.action === 'user.login') bucket.user_logins += 1
                        if (log.action === 'user.logout') bucket.user_logouts += 1
                        break
                    }
                }
            }

            if (new Date(log.created_at) >= new Date(twentyFourHoursAgo)) {
                if (log.action === 'user.login') totalLogins24h += 1
                if (log.action === 'user.logout') totalLogouts24h += 1
            }
        })

        sessions7d?.forEach((session) => {
            const sessionDate = new Date(session.created_at)
            const dayKey = formatDateKey(sessionDate)

            const dayBucket = timelineMap.get(dayKey)
            if (dayBucket) {
                dayBucket.sessions_created += 1
            }

            // Populate 24h timeline
            if (sessionDate >= new Date(Date.now() - 24 * 60 * 60 * 1000)) {
                for (const [key, bucket] of timeline24hMap.entries()) {
                    const slotTime = new Date(key).getTime()
                    const logTime = sessionDate.getTime()
                    if (logTime >= slotTime && logTime < slotTime + 60 * 60 * 1000) {
                        bucket.sessions_created += 1
                        break
                    }
                }
            }
        })

        const actionBreakdown7d = Array.from(actionBreakdownMap.entries())
            .map(([action, count]) => ({ action, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)

        const resourceBreakdown7d = Array.from(resourceBreakdownMap.entries())
            .map(([resource_type, count]) => ({ resource_type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)

        const activityTimeline7d = Array.from(timelineMap.values())
            //Sort by date to ensure correct order
            .sort((a, b) => a.date.localeCompare(b.date))

        const activityTimeline24h = Array.from(timeline24hMap.values())
            // Sort by time
            .sort((a, b) => {
                // We can't easily sort by "10:00 PM" string crossing midnight.
                // We should rely on insertion order of Map (which preserves insertion order)
                // transforming map to array preserves that order.
                // Since we inserted from 23 hours ago to now, it is already sorted.
                return 0
            })


        const stats: AdminStats = {
            total_users: totalUsers || 0,
            total_sessions: totalSessions || 0,
            recent_activity_24h: recentActivity || 0,
            total_logins_24h: totalLogins24h,
            total_logouts_24h: totalLogouts24h,
            most_active_users: mostActiveUsers,
            most_used_agents: mostUsedAgents,
            agent_usage_distribution: agentUsageDistribution,
            action_breakdown_7d: actionBreakdown7d,
            resource_breakdown_7d: resourceBreakdown7d,
            activity_timeline_7d: activityTimeline7d,
            activity_timeline_24h: activityTimeline24h,
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
