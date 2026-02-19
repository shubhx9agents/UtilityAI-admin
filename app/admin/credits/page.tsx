'use client'

import { useState, useEffect } from 'react'
import { Users, Zap, Layers, TrendingUp, AlertTriangle, CheckCircle2, Crown, RefreshCw } from 'lucide-react'

interface UserCreditInfo {
    id: string
    email: string
    plan: 'free' | 'premium'
    usage: {
        total_credits_used: number
        canvas_creations_used: number
        last_activity: string | null
    }
    limits: {
        outputs: number
        canvas: number
    }
    agent_exhausted: boolean
    canvas_exhausted: boolean
}

function UsageBar({ used, limit, colorClass }: { used: number; limit: number; colorClass: string }) {
    const pct = Math.min(Math.round((used / limit) * 100), 100)
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
                <span>{used} / {limit}</span>
                <span>{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorClass} transition-all`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

export default function CreditUsagePage() {
    const [users, setUsers] = useState<UserCreditInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'exhausted' | 'premium' | 'free'>('all')
    const [refreshing, setRefreshing] = useState(false)

    const fetchData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/admin/credit-usage')
            const { data } = await res.json()
            setUsers(data || [])
        } catch (e) {
            console.error('Failed to fetch credit usage', e)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const filtered = users.filter(u => {
        const matchSearch = u.email.toLowerCase().includes(search.toLowerCase())
        if (filter === 'exhausted') return matchSearch && (u.agent_exhausted || u.canvas_exhausted)
        if (filter === 'premium') return matchSearch && u.plan === 'premium'
        if (filter === 'free') return matchSearch && u.plan === 'free'
        return matchSearch
    })

    const totalExhausted = users.filter(u => u.agent_exhausted || u.canvas_exhausted).length
    const totalPremium = users.filter(u => u.plan === 'premium').length
    const avgCreditsUsed = users.length > 0
        ? Math.round(users.reduce((s, u) => s + u.usage.total_credits_used, 0) / users.length)
        : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Credit Usage</h1>
                    <p className="text-sm text-gray-400 mt-1">Monitor agent credits and canvas quota across all users</p>
                </div>
                <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { icon: Users, label: 'Total Users', value: users.length, color: 'text-blue-400' },
                    { icon: Crown, label: 'Premium', value: totalPremium, color: 'text-amber-400' },
                    { icon: AlertTriangle, label: 'Exhausted', value: totalExhausted, color: 'text-red-400' },
                    { icon: TrendingUp, label: 'Avg Credits Used', value: avgCreditsUsed, color: 'text-green-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-3">
                            <div className={`${color} rounded-lg bg-white/5 p-2`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">{label}</p>
                                <p className="text-lg font-bold text-white">{value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Search by email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-amber-500/50 transition-all"
                />
                <div className="flex gap-2">
                    {(['all', 'free', 'premium', 'exhausted'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-all ${filter === f
                                ? 'bg-amber-500 text-black'
                                : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {f === 'exhausted' ? '⚠ Exhausted' : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-white/10 bg-white/5">
                                <tr>
                                    {['User', 'Plan', 'Agent Credits', 'Canvas Creations', 'Last Activity', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : filtered.map(user => (
                                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-white truncate max-w-[200px]">{user.email}</div>
                                            <div className="text-xs text-gray-500 font-mono">{user.id.slice(0, 8)}…</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${user.plan === 'premium'
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-white/5 text-gray-400 border border-white/10'
                                                }`}>
                                                {user.plan === 'premium' && <Crown className="h-3 w-3" />}
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 min-w-[160px]">
                                            <UsageBar
                                                used={user.usage.total_credits_used}
                                                limit={user.limits.outputs}
                                                colorClass={user.agent_exhausted ? 'bg-red-500' : 'bg-amber-500'}
                                            />
                                        </td>
                                        <td className="px-4 py-4 min-w-[160px]">
                                            <UsageBar
                                                used={user.usage.canvas_creations_used}
                                                limit={user.limits.canvas}
                                                colorClass={user.canvas_exhausted ? 'bg-red-500' : 'bg-blue-500'}
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-xs text-gray-400">
                                            {user.usage.last_activity
                                                ? new Date(user.usage.last_activity).toLocaleDateString('en-GB', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })
                                                : '—'
                                            }
                                        </td>
                                        <td className="px-4 py-4">
                                            {user.agent_exhausted || user.canvas_exhausted ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Exhausted
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
