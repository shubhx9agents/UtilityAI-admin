'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AdminStats, AuditLog } from '@/types'
import {
    Users,
    Activity,
    TrendingUp,
    Shield,
    Database,
    Clock,
    ChevronRight,
    LogIn,
    LogOut,
    PieChart as PieChartIcon,
    BarChart3,
    LineChart as LineChartIcon,
} from 'lucide-react'
import Link from 'next/link'
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Area,
    AreaChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

const PIE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#f97316', '#6366f1', '#ef4444']

function formatActionLabel(action: string) {
    return action.replace('.', ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getLogSummary(log: AuditLog) {
    const details = log.details || {}
    if (log.action === 'session.created') {
        const agent = typeof details.agent_type === 'string' ? details.agent_type.replace(/_/g, ' ') : 'session'
        return `Created ${agent}`
    }
    if (log.action === 'session.updated') {
        return 'Updated a session'
    }
    if (log.action === 'session.deleted') {
        return 'Deleted a session'
    }
    if (log.action === 'role.updated') {
        const role = details.new_role ? String(details.new_role) : 'user'
        const target = details.target_user_email ? String(details.target_user_email) : 'a user'
        return `Changed role to ${role} for ${target}`
    }
    if (log.action === 'user.login') return 'User logged in'
    if (log.action === 'user.logout') return 'User logged out'
    return formatActionLabel(log.action)
}

export default function AdminDashboard() {
    const router = useRouter()
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [timeRange, setTimeRange] = useState<'7d' | '24h'>('7d')

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            const statsRes = await fetch('/api/admin/stats')
            if (!statsRes.ok) {
                if (statsRes.status === 403) {
                    router.push('/dashboard')
                    return
                }
                throw new Error('Failed to fetch stats')
            }
            const statsData = await statsRes.json()
            setStats(statsData.data)

            const logsRes = await fetch('/api/admin/audit-logs?limit=10')
            if (logsRes.ok) {
                const logsData = await logsRes.json()
                setRecentLogs(logsData.data || [])
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const timelineData = useMemo(
        () =>
            (stats?.activity_timeline_7d || []).map((item) => ({
                ...item,
                day: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            })),
        [stats]
    )

    const timeline24hData = useMemo(
        () => stats?.activity_timeline_24h || [],
        [stats]
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Shield className="h-12 w-12 animate-spin mx-auto mb-4 text-amber-500" />
                    <p className="text-muted-foreground">Loading admin dashboard...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-warm-border bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-8">
                <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-6 w-6 text-amber-400" />
                        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Admin Control Center</h1>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-300">
                        Visual analytics for agent usage and complete user activity tracking.
                    </p>
                </div>
            </div>

            <div className="bento-grid bento-grid-4 gap-4">
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_users || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_sessions || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Agent sessions created</p>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Activity (24h)</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{stats?.recent_activity_24h || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Audit events in last 24h</p>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Most Used Agent</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-lg font-bold capitalize text-foreground">
                            {stats?.most_used_agents[0]?.agent_type.replace(/_/g, ' ') || 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{stats?.most_used_agents[0]?.usage_count || 0} sessions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-emerald-500" />
                            Logins (24h)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_logins_24h || 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-rose-500" />
                            Logouts (24h)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_logouts_24h || 0}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <PieChartIcon className="h-4 w-4 text-amber-500" />
                            Agent Types
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">
                            {stats?.agent_usage_distribution.length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Tracked categories</p>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-sky-500" />
                            Actions (7d)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">
                            {(stats?.action_breakdown_7d || []).reduce((sum, item) => sum + item.count, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Audited actions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="border-warm-border bg-warm-surface xl:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-foreground">Most Used Agents</CardTitle>
                        <CardDescription>Session share by agent type</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {(stats?.agent_usage_distribution.length || 0) === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No session data yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.agent_usage_distribution || []}
                                        dataKey="usage_count"
                                        nameKey="agent_type"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={2}
                                    >
                                        {(stats?.agent_usage_distribution || []).map((entry, index) => (
                                            <Cell key={entry.agent_type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`${value ?? 0} sessions`, 'Usage']}
                                        labelFormatter={(label) => formatActionLabel(String(label || ''))}
                                    />
                                    <Legend formatter={(value: string) => formatActionLabel(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-warm-border bg-warm-surface xl:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-foreground">Activity Trend</CardTitle>
                                <CardDescription>
                                    {timeRange === '7d' ? 'Audit actions and sessions per day' : 'Audit actions and sessions per hour'}
                                </CardDescription>
                            </div>
                            <div className="flex bg-warm-muted/50 p-1 rounded-lg border border-warm-border/50">
                                <button
                                    onClick={() => setTimeRange('7d')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === '7d'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    7 Days
                                </button>
                                <button
                                    onClick={() => setTimeRange('24h')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === '24h'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    24 Hours
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeRange === '7d' ? timelineData : timeline24hData}>
                                <defs>
                                    <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey={timeRange === '7d' ? 'day' : 'hour'}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={20}
                                />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="actions"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorActions)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sessions_created"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorSessions)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="user_logins"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorLogins)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="border-warm-border bg-warm-surface xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-foreground">Top Action Types (7 days)</CardTitle>
                        <CardDescription>What users and admins did most frequently</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {(stats?.action_breakdown_7d.length || 0) === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No actions recorded yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.action_breakdown_7d || []} margin={{ left: 8, right: 8 }}>
                                    <XAxis
                                        dataKey="action"
                                        tickFormatter={(value) => formatActionLabel(value)}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={(value) => formatActionLabel(String(value))} />
                                    <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader>
                        <CardTitle className="text-foreground">Resource Mix (7 days)</CardTitle>
                        <CardDescription>Which resource types changed most</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(stats?.resource_breakdown_7d || []).map((item) => (
                            <div key={item.resource_type} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground">{formatActionLabel(item.resource_type)}</span>
                                    <span className="text-muted-foreground">{item.count}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-warm-muted">
                                    <div
                                        className="h-2 rounded-full bg-amber-500"
                                        style={{
                                            width: `${Math.max(
                                                8,
                                                (item.count /
                                                    Math.max(...(stats?.resource_breakdown_7d || []).map((x) => x.count), 1)) *
                                                100
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        {(stats?.resource_breakdown_7d.length || 0) === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No resource activity yet</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/admin/audit-logs">
                    <Card className="border-warm-border bg-warm-surface hover:border-amber-500/40 transition-colors cursor-pointer group">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/15">
                                        <Clock className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg text-foreground">Audit Logs</CardTitle>
                                        <CardDescription>View login/logout, sessions, and full action details</CardDescription>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/admin/users">
                    <Card className="border-warm-border bg-warm-surface hover:border-amber-500/40 transition-colors cursor-pointer group">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/15">
                                        <Users className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg text-foreground">User Management</CardTitle>
                                        <CardDescription>Manage user roles and permissions</CardDescription>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

            <Card className="border-warm-border bg-warm-surface">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-foreground">Recent Audit Events</CardTitle>
                            <CardDescription>Latest user actions with context</CardDescription>
                        </div>
                        <Link href="/admin/audit-logs">
                            <Button variant="outline" size="sm" className="rounded-lg border-warm-border">
                                View All
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent>
                    {recentLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {recentLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border border-warm-border bg-warm-muted/50 hover:bg-warm-muted transition-colors"
                                >
                                    <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-foreground">{log.user_email || 'System'}</span>
                                            <span className="text-xs font-mono bg-warm-muted px-2 py-0.5 rounded text-foreground">
                                                {log.action}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{getLogSummary(log)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(log.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {stats && stats.most_active_users.length > 0 && (
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader>
                        <CardTitle className="text-foreground">Most Active Users (24h)</CardTitle>
                        <CardDescription>Users with the most actions in the last day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.most_active_users.map((user, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-warm-muted">
                                    <span className="text-sm font-medium text-foreground">{user.user_email}</span>
                                    <span className="text-sm text-muted-foreground">{user.action_count} actions</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
