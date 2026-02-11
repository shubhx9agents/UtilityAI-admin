'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AuditLog, AuditAction } from '@/types'
import {
    Clock,
    Filter,
    ChevronLeft,
    ChevronRight,
    Search,
    Shield,
    Trash2,
    LogIn,
    LogOut,
    Database,
    Activity,
} from 'lucide-react'
import Link from 'next/link'

const AUDIT_ACTIONS: AuditAction[] = [
    'user.login',
    'user.logout',
    'user.signup',
    'user.password_reset',
    'session.created',
    'session.updated',
    'session.deleted',
    'session.restored',
    'role.updated',
]

function formatActionLabel(action: string) {
    return action.replace('.', ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getActionColor(action: string) {
    if (action.startsWith('user.')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    if (action.startsWith('session.')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    if (action.startsWith('role.')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

function describeLog(log: AuditLog) {
    const details = log.details || {}
    if (log.action === 'session.created') {
        const sessionName = typeof details.session_name === 'string' ? details.session_name : null
        const agentType = typeof details.agent_type === 'string' ? details.agent_type.replace(/_/g, ' ') : 'agent session'
        return sessionName ? `Created session "${sessionName}" (${agentType})` : `Created ${agentType} session`
    }
    if (log.action === 'session.updated') {
        return 'Updated session'
    }
    if (log.action === 'session.deleted') {
        return 'Deleted session'
    }
    if (log.action === 'session.restored') {
        return 'Restored session'
    }
    if (log.action === 'role.updated') {
        const target = typeof details.target_user_email === 'string' ? details.target_user_email : 'a user'
        const role = typeof details.new_role === 'string' ? details.new_role : 'user'
        return `Changed ${target} role to ${role}`
    }
    if (log.action === 'user.login') {
        return 'User logged in'
    }
    if (log.action === 'user.logout') {
        return 'User logged out'
    }
    if (log.action === 'user.signup') {
        return 'User signed up'
    }
    if (log.action === 'user.password_reset') {
        return 'User reset password'
    }
    return formatActionLabel(log.action)
}

function detailsPreview(log: AuditLog) {
    if (!log.details) return 'No metadata'
    const json = JSON.stringify(log.details)
    if (!json) return 'No metadata'
    if (json.length <= 100) return json
    return `${json.slice(0, 100)}...`
}

export default function AuditLogsPage() {
    const router = useRouter()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [totalCount, setTotalCount] = useState(0)
    const [showClearDialog, setShowClearDialog] = useState(false)
    const [clearing, setClearing] = useState(false)

    const [actionFilter, setActionFilter] = useState<string>('all')
    const [searchEmail, setSearchEmail] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const logsPerPage = 50

    useEffect(() => {
        fetchAuditLogs()
    }, [actionFilter, currentPage])

    const fetchAuditLogs = async () => {
        try {
            setLoading(true)

            const params = new URLSearchParams({
                limit: logsPerPage.toString(),
                offset: ((currentPage - 1) * logsPerPage).toString(),
            })

            if (actionFilter !== 'all') {
                params.append('action', actionFilter)
            }

            const res = await fetch(`/api/admin/audit-logs?${params}`)

            if (!res.ok) {
                if (res.status === 403) {
                    router.push('/dashboard')
                    return
                }
                throw new Error('Failed to fetch audit logs')
            }

            const data = await res.json()
            setLogs(data.data || [])
            setTotalCount(data.count || 0)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleClearLogs = async () => {
        try {
            setClearing(true)
            const res = await fetch('/api/admin/audit-logs/clear', {
                method: 'DELETE',
            })

            if (!res.ok) {
                throw new Error('Failed to clear audit logs')
            }

            await fetchAuditLogs()
            setShowClearDialog(false)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setClearing(false)
        }
    }

    const filteredLogs = searchEmail
        ? logs.filter((log) => log.user_email?.toLowerCase().includes(searchEmail.toLowerCase()))
        : logs

    const totalPages = Math.ceil(totalCount / logsPerPage)

    const pageMetrics = useMemo(() => {
        const loginCount = filteredLogs.filter((l) => l.action === 'user.login').length
        const logoutCount = filteredLogs.filter((l) => l.action === 'user.logout').length
        const sessionCreatedCount = filteredLogs.filter((l) => l.action === 'session.created').length
        return { loginCount, logoutCount, sessionCreatedCount }
    }, [filteredLogs])

    return (
        <div className="space-y-6">
            <div>
                <Link href="/admin">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Admin
                    </Button>
                </Link>
                <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-6 w-6 text-amber-500" />
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Audit Logs</h1>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Full event trail: logins, logouts, session activity, role changes, and action metadata.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4 text-amber-500" />
                            Visible Events
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{filteredLogs.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-emerald-500" />
                            Logins
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{pageMetrics.loginCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-rose-500" />
                            Logouts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{pageMetrics.logoutCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4 text-sky-500" />
                            Sessions Created
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{pageMetrics.sessionCreatedCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-warm-border bg-warm-surface">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Filter className="h-5 w-5 text-amber-500" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Action Type</label>
                            <Select
                                value={actionFilter}
                                onValueChange={(value) => {
                                    setCurrentPage(1)
                                    setActionFilter(value)
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    {AUDIT_ACTIONS.map((action) => (
                                        <SelectItem key={action} value={action}>
                                            {formatActionLabel(action)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search by Email</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="user@example.com"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-warm-border bg-warm-surface">
                <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-foreground">Activity Log</CardTitle>
                            <CardDescription>Showing {filteredLogs.length} of {totalCount} entries</CardDescription>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => setShowClearDialog(true)}
                            disabled={totalCount === 0}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Logs
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-500" />
                            <p className="text-muted-foreground">Loading audit logs...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive px-6">
                            <p>{error}</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground px-6">
                            <p>No audit logs found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-warm-border hover:bg-warm-muted/50">
                                        <TableHead className="text-foreground">Action</TableHead>
                                        <TableHead className="text-foreground">Description</TableHead>
                                        <TableHead className="text-foreground">User</TableHead>
                                        <TableHead className="text-foreground">Resource</TableHead>
                                        <TableHead className="text-foreground">Details</TableHead>
                                        <TableHead className="text-foreground">IP</TableHead>
                                        <TableHead className="text-foreground">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="border-warm-border hover:bg-warm-muted/50 align-top">
                                            <TableCell>
                                                <span className={`text-xs font-mono px-2 py-1 rounded ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-foreground min-w-[220px]">{describeLog(log)}</TableCell>
                                            <TableCell className="font-medium text-foreground">{log.user_email || 'System'}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {log.resource_type || 'N/A'}
                                                {log.resource_id ? (
                                                    <div className="text-xs font-mono mt-1 text-muted-foreground/80">{log.resource_id}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                                                <code className="whitespace-pre-wrap break-all">{detailsPreview(log)}</code>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">{log.ip_address || 'N/A'}</TableCell>
                                            <TableCell className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-warm-border px-6 pb-6">
                            <p className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear All Audit Logs?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This permanently deletes every audit trail entry.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowClearDialog(false)} disabled={clearing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleClearLogs} disabled={clearing}>
                            {clearing ? 'Clearing...' : 'Clear All Logs'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
