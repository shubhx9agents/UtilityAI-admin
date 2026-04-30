'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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
    Download
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
import { startOfDay, startOfMonth, startOfYear, endOfDay, format } from 'date-fns'

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
    if (log.action === 'session.updated') return 'Updated a session'
    if (log.action === 'session.deleted') return 'Deleted a session'
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
    const contentRef = useRef<HTMLDivElement>(null)
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [generatingPdf, setGeneratingPdf] = useState(false)

    // Global Date Filter
    const [filterPeriod, setFilterPeriod] = useState<string>('month')
    const [customStart, setCustomStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

    useEffect(() => {
        fetchDashboardData()
    }, [filterPeriod, customStart, customEnd])

    const fetchDashboardData = async () => {
        try {
            if (!stats) setLoading(true)

            let startDate: Date
            let endDate: Date = endOfDay(new Date())
            const now = new Date()

            if (filterPeriod === 'day') {
                startDate = startOfDay(now)
            } else if (filterPeriod === 'month') {
                startDate = startOfMonth(now)
            } else if (filterPeriod === 'year') {
                startDate = startOfYear(now)
            } else if (filterPeriod === 'custom') {
                startDate = customStart ? startOfDay(new Date(customStart)) : startOfMonth(now)
                endDate = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now)
            } else {
                // fallback to 7 days
                startDate = new Date()
                startDate.setDate(startDate.getDate() - 6)
                startDate = startOfDay(startDate)
            }

            const queryParams = new URLSearchParams()
            if (startDate) queryParams.append('start_date', startDate.toISOString())
            if (endDate) queryParams.append('end_date', endDate.toISOString())

            const statsRes = await fetch(`/api/admin/stats?${queryParams.toString()}`)
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

    const downloadPdf = async () => {
        if (!contentRef.current) return
        setGeneratingPdf(true)

        try {
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ])

            // ── A4 Landscape ─────────────────────────────────────────────────
            const PAGE_W = 297   // mm landscape width
            const PAGE_H = 210   // mm landscape height
            const MARGIN = 10    // mm side/bottom margin
            const HDR_H = 12    // mm header bar
            const CONT_W = PAGE_W - MARGIN * 2        // 277mm
            const CONT_H = PAGE_H - HDR_H - MARGIN * 2 // 178mm
            const MM2PX = 3.7795                      // 1mm at 96dpi
            const SCALE = 2
            const CAP_W = Math.round(CONT_W * MM2PX)  // ~1047px at 1×

            const periodLabel =
                filterPeriod === 'custom' ? `${customStart} → ${customEnd}` :
                    filterPeriod === 'day' ? 'Today' :
                        filterPeriod === 'week' ? 'Past 7 Days' :
                            filterPeriod === 'month' ? 'This Month' : 'This Year'

            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

            const sections = Array.from(
                contentRef.current!.querySelectorAll<HTMLElement>('[data-pdf-section]')
            )
            const total = sections.length

            const drawHeader = (pageNum: number) => {
                pdf.setFillColor(18, 18, 20)
                pdf.rect(0, 0, PAGE_W, HDR_H, 'F')
                pdf.setFillColor(245, 158, 11)
                pdf.rect(0, HDR_H - 0.7, PAGE_W, 0.7, 'F')
                pdf.setFont('helvetica', 'bold')
                pdf.setFontSize(9)
                pdf.setTextColor(245, 158, 11)
                pdf.text('UtilityAI  ·  Admin Dashboard Report', MARGIN, 7.5)
                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(7)
                pdf.setTextColor(160, 160, 160)
                pdf.text(
                    `Period: ${periodLabel}   |   ${format(new Date(), 'dd MMM yyyy, hh:mm a')}   |   Page ${pageNum} of ${total}`,
                    PAGE_W - MARGIN, 7.5, { align: 'right' }
                )
            }

            for (let i = 0; i < sections.length; i++) {
                const section = sections[i]

                // Pin width to landscape content width so no overflow
                const savedW = section.style.width
                const savedMax = section.style.maxWidth
                const savedMin = section.style.minWidth
                section.style.width = `${CAP_W}px`
                section.style.maxWidth = `${CAP_W}px`
                section.style.minWidth = `${CAP_W}px`

                const canvas = await html2canvas(section, {
                    scale: SCALE,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#121214',
                    width: CAP_W,
                    windowWidth: CAP_W + 32,
                })

                section.style.width = savedW
                section.style.maxWidth = savedMax
                section.style.minWidth = savedMin

                if (i > 0) pdf.addPage()
                drawHeader(i + 1)

                const imgData = canvas.toDataURL('image/jpeg', 0.96)

                // Convert canvas size (at SCALE) to mm
                let imgW = (canvas.width / SCALE) / MM2PX
                let imgH = (canvas.height / SCALE) / MM2PX

                // Fit to content box maintaining aspect ratio
                if (imgW > CONT_W) { imgH *= CONT_W / imgW; imgW = CONT_W }
                if (imgH > CONT_H) { imgW *= CONT_H / imgH; imgH = CONT_H }

                // Center horizontally on page
                const x = MARGIN + (CONT_W - imgW) / 2
                const y = HDR_H + MARGIN

                pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH)
            }

            pdf.save(`admin-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        } catch (err) {
            console.error('PDF generation failed:', err)
            alert('PDF generation failed. See console for details.')
        } finally {
            setGeneratingPdf(false)
        }
    }

    const timelineData = useMemo(() => stats?.activity_timeline || [], [stats])


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
            <div className="relative overflow-hidden rounded-2xl border border-warm-border bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />

                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-6 w-6 text-amber-400" />
                        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Admin Control Center</h1>
                    </div>
                    <p className="text-sm sm:text-base text-zinc-300">
                        Visual analytics for agent usage and complete user activity tracking.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto items-end">
                    {filterPeriod === 'custom' && (
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="h-10 bg-zinc-900 text-white border-warm-border"
                            />
                            <span className="text-zinc-400 text-sm">to</span>
                            <Input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="h-10 bg-zinc-900 text-white border-warm-border"
                            />
                        </div>
                    )}

                    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                        <SelectTrigger className="w-[160px] h-10 bg-zinc-900 text-white border-warm-border">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">Today</SelectItem>
                            <SelectItem value="week">Past Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        onClick={downloadPdf}
                        disabled={generatingPdf}
                        variant="default"
                        className="h-10 bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {generatingPdf ? 'Generating...' : 'Export PDF'}
                    </Button>
                </div>
            </div>

            {/* This div is the top-level container */}
            <div ref={contentRef} className="space-y-4">

                {/* ── Page 1: All 8 KPI Cards ── */}
                <div data-pdf-section className="space-y-4">
                    {/* Row 1: Top Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl">
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_users || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">All time</p>
                            </CardContent>
                        </Card>
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Sessions</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_sessions_filtered || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">In selected period</p>
                            </CardContent>
                        </Card>
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Activity Events</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-2xl font-bold text-foreground">{stats?.activity_count_filtered || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">Audit actions</p>
                            </CardContent>
                        </Card>
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Top Agent</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-base font-bold capitalize text-foreground leading-tight break-words">
                                    {stats?.most_used_agents[0]?.agent_type.replace(/_/g, ' ') || 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{stats?.most_used_agents[0]?.usage_count || 0} uses</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Row 2: Login/Logout Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl">
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                    <LogIn className="h-4 w-4 text-emerald-500" />
                                    Period Logins
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_logins_filtered || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                    <LogOut className="h-4 w-4 text-rose-500" />
                                    Period Logouts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-2xl font-bold text-foreground">{stats?.total_logouts_filtered || 0}</div>
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
                                <div className="font-heading text-2xl font-bold text-foreground">{stats?.agent_usage_distribution.length || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">Unique active</p>
                            </CardContent>
                        </Card>
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-sky-500" />
                                    Total Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="font-heading text-2xl font-bold text-foreground">
                                    {(stats?.action_breakdown || []).reduce((sum, item) => sum + item.count, 0)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Audited events</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* ── Section 3: Pie Chart ── */}
                <div data-pdf-section>
                    <Card className="border-warm-border bg-warm-surface">
                        <CardHeader>
                            <CardTitle className="text-foreground">Agents Distribution</CardTitle>
                            <CardDescription>Session share by agent type in the selected period</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[360px] pb-8">
                            {(stats?.agent_usage_distribution.length || 0) === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No session data</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 10, bottom: 30, left: 0, right: 0 }}>
                                        <Pie
                                            data={stats?.agent_usage_distribution || []}
                                            dataKey="usage_count"
                                            nameKey="agent_type"
                                            innerRadius={80}
                                            outerRadius={130}
                                            cx="50%"
                                            cy="45%"
                                            paddingAngle={2}
                                            isAnimationActive={false}
                                        >
                                            {(stats?.agent_usage_distribution || []).map((entry, index) => (
                                                <Cell key={entry.agent_type} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${value ?? 0} sessions`, 'Usage']}
                                            labelFormatter={(label) => formatActionLabel(String(label || ''))}
                                        />
                                        <Legend
                                            formatter={(value: string) => formatActionLabel(value)}
                                            layout="horizontal"
                                            verticalAlign="bottom"
                                            align="center"
                                            wrapperStyle={{ paddingTop: '16px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Section 4: Activity Timeline ── */}
                <div data-pdf-section>
                    <Card className="border-warm-border bg-warm-surface">
                        <CardHeader>
                            <CardTitle className="text-foreground">Activity Timeline</CardTitle>
                            <CardDescription>Volume of actions and sessions over the selected period</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[340px] pb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                                    <defs>
                                        <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="displayLabel"
                                        tickLine={false}
                                        axisLine={false}
                                        minTickGap={20}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="actions" name="Actions" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorActions)" isAnimationActive={false} />
                                    <Area type="monotone" dataKey="sessions_created" name="Sessions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Page 4: Top Activity Action Chart & Resource Mix ── */}
                <div data-pdf-section className="grid md:grid-cols-2 gap-4">
                    {/* Top Action Types Bar Chart */}
                    <Card className="border-warm-border bg-warm-surface">
                        <CardHeader>
                            <CardTitle className="text-foreground">Top Action Types</CardTitle>
                            <CardDescription>Most frequently executed commands in the period</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            {(stats?.action_breakdown.length || 0) === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No actions recorded</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.action_breakdown || []} margin={{ left: 8, right: 8, bottom: 20 }}>
                                        <XAxis
                                            dataKey="action"
                                            tickFormatter={(v) => formatActionLabel(v)}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 11 }}
                                            interval={0}
                                            angle={-20}
                                            textAnchor="end"
                                        />
                                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                        <Tooltip labelFormatter={(v) => formatActionLabel(String(v))} />
                                        <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Resource Mix */}
                    <Card className="border-warm-border bg-warm-surface">
                        <CardHeader>
                            <CardTitle className="text-foreground">Resource Mix</CardTitle>
                            <CardDescription>Types of objects interacted with most</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-6">
                            {(stats?.resource_breakdown || []).map((item) => (
                                <div key={item.resource_type} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-foreground">{formatActionLabel(item.resource_type)}</span>
                                        <span className="text-muted-foreground tabular-nums">{item.count}</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-warm-muted">
                                        <div
                                            className="h-2 rounded-full bg-amber-500 transition-all"
                                            style={{
                                                width: `${Math.max(4, (item.count / Math.max(...(stats?.resource_breakdown || []).map((x) => x.count), 1)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(stats?.resource_breakdown.length || 0) === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-8">No resource activity in this period</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Section 7: Most Active Users ── */}
                {stats && stats.most_active_users && stats.most_active_users.length > 0 && (
                    <div data-pdf-section>
                        <Card className="border-warm-border bg-warm-surface">
                            <CardHeader>
                                <CardTitle className="text-foreground">Most Active Users</CardTitle>
                                <CardDescription>Top users by action volume in selected period</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {stats.most_active_users.map((user, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-warm-border/50 hover:bg-warm-muted">
                                            <span className="text-sm font-medium text-foreground">{user.user_email}</span>
                                            <span className="text-sm text-foreground bg-warm-muted px-3 py-1 rounded-full">{user.action_count} actions</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Quick nav links — hidden from PDF */}
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
                                            <CardDescription>View full action history</CardDescription>
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
                                            <CardDescription>Manage roles and permissions</CardDescription>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                </div>
                            </CardHeader>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    )
}


