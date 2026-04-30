'use client'

import { useEffect, useState } from 'react'
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
import { AdminUser, UserRoleType } from '@/types'
import { Users, Search, ChevronLeft, Shield, Crown, User, Sparkles, Ban, Download } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function UserManagementPage() {
    const router = useRouter()
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // Filter & Export state
    const [timeFilter, setTimeFilter] = useState('all')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')

    // Role update state
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
    const [newRole, setNewRole] = useState<UserRoleType>('user')
    const [updating, setUpdating] = useState(false)

    // Status update state
    const [statusTarget, setStatusTarget] = useState<{ user: AdminUser, newStatus: string } | null>(null)
    const [updatingStatus, setUpdatingStatus] = useState(false)

    // Revoke subscription state
    const [revokeTarget, setRevokeTarget] = useState<AdminUser | null>(null)
    const [revoking, setRevoking] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/admin/users')

            if (!res.ok) {
                if (res.status === 403) {
                    router.push('/dashboard')
                    return
                }
                throw new Error('Failed to fetch users')
            }

            const data = await res.json()
            setUsers(data.data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateRole = async () => {
        if (!selectedUser) return

        try {
            setUpdating(true)
            const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update role')
            }

            toast.success('User role updated successfully')
            setSelectedUser(null)
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleUpdateStatus = async () => {
        if (!statusTarget) return

        try {
            setUpdatingStatus(true)
            const res = await fetch(`/api/admin/users/${statusTarget.user.id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: statusTarget.newStatus }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update status')
            }

            toast.success(`User status updated to ${statusTarget.newStatus}`)
            setStatusTarget(null)
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setUpdatingStatus(false)
        }
    }

    const handleRevokeSubscription = async () => {
        if (!revokeTarget) return

        try {
            setRevoking(true)
            const res = await fetch(`/api/admin/users/${revokeTarget.id}/subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to revoke subscription')
            }

            toast.success(`Premium subscription revoked for ${revokeTarget.email}`)
            setRevokeTarget(null)
            fetchUsers()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setRevoking(false)
        }
    }

    const filteredUsers = users.filter((user) => {
        if (searchQuery && !user.email.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false
        }

        if (timeFilter !== 'all') {
            const userDate = new Date(user.created_at)
            const now = new Date()

            if (timeFilter === 'monthly') {
                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(now.getDate() - 30)
                if (userDate < thirtyDaysAgo) return false
            } else if (timeFilter === 'quarterly') {
                const ninetyDaysAgo = new Date()
                ninetyDaysAgo.setDate(now.getDate() - 90)
                if (userDate < ninetyDaysAgo) return false
            } else if (timeFilter === 'yearly') {
                const yearAgo = new Date()
                yearAgo.setFullYear(now.getFullYear() - 1)
                if (userDate < yearAgo) return false
            } else if (timeFilter === 'custom') {
                if (customStartDate) {
                    const start = new Date(customStartDate)
                    start.setHours(0, 0, 0, 0)
                    if (userDate < start) return false
                }
                if (customEndDate) {
                    const end = new Date(customEndDate)
                    end.setHours(23, 59, 59, 999)
                    if (userDate > end) return false
                }
            }
        }
        return true
    })

    const handleDownloadCSV = () => {
        if (filteredUsers.length === 0) {
            toast.error('No users to download')
            return
        }

        const headers = ['ID', 'Email', 'Role', 'Subscription', 'Status', 'Joined Date', 'Last Login', 'Sessions']
        const csvContent = [
            headers.join(','),
            ...filteredUsers.map(u => {
                return [
                    u.id,
                    `"${u.email}"`,
                    u.role,
                    u.subscription_type,
                    u.status || 'active',
                    new Date(u.created_at).toLocaleDateString(),
                    u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never',
                    u.session_count
                ].join(',')
            })
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `users_export_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const adminCount = users.filter(u => u.role === 'admin').length
    const userCount = users.filter(u => u.role === 'user').length
    const premiumCount = users.filter(u => u.subscription_type === 'premium').length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link href="/admin">
                    <Button variant="ghost" size="sm" className="mb-4">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back to Admin
                    </Button>
                </Link>
                <div className="flex items-center gap-2 mb-2">
                    <Users className="h-6 w-6 text-amber-500" />
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User Management</h1>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                    Manage user accounts, roles, and subscriptions
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{users.length}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
                        <Crown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{adminCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Regular Users</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-foreground">{userCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-warm-border bg-warm-surface">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Premium Users</CardTitle>
                        <Sparkles className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="font-heading text-2xl font-bold text-amber-500">{premiumCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Actions */}
            <Card className="border-warm-border bg-warm-surface">
                <CardHeader className="pb-3">
                    <CardTitle className="text-foreground">Filter & Export</CardTitle>
                    <CardDescription>Search by email, filter by joined date, and export to CSV</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 flex-wrap sm:items-end">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <label className="text-sm font-medium text-foreground">Search User</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-48 space-y-2">
                            <label className="text-sm font-medium text-foreground">Time Period (Joined)</label>
                            <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="monthly">Last 30 Days (Monthly)</SelectItem>
                                    <SelectItem value="quarterly">Last 90 Days (Quarterly)</SelectItem>
                                    <SelectItem value="yearly">Last 365 Days (Yearly)</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {timeFilter === 'custom' && (
                            <>
                                <div className="w-full sm:w-36 space-y-2">
                                    <label className="text-sm font-medium text-foreground">Start Date</label>
                                    <Input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        max={customEndDate || undefined}
                                        className="w-full"
                                    />
                                </div>
                                <div className="w-full sm:w-36 space-y-2">
                                    <label className="text-sm font-medium text-foreground">End Date</label>
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        min={customStartDate || undefined}
                                        className="w-full"
                                    />
                                </div>
                            </>
                        )}

                        <Button
                            onClick={handleDownloadCSV}
                            variant="outline"
                            className="w-full sm:w-auto border-warm-border hover:bg-warm-muted"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Users List - Table */}
            <Card className="border-warm-border bg-warm-surface">
                <CardHeader>
                    <CardTitle className="text-foreground">All Users</CardTitle>
                    <CardDescription>
                        Showing {filteredUsers.length} of {users.length} users
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">
                            <Shield className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-500" />
                            <p className="text-muted-foreground">Loading users...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive px-6">
                            <p>{error}</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground px-6">
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-warm-border hover:bg-warm-muted/50">
                                        <TableHead className="text-foreground">Email</TableHead>
                                        <TableHead className="text-foreground">Role</TableHead>
                                        <TableHead className="text-foreground">Subscription</TableHead>
                                        <TableHead className="text-foreground">Status</TableHead>
                                        <TableHead className="text-foreground">Joined</TableHead>
                                        <TableHead className="text-foreground">Last Login</TableHead>
                                        <TableHead className="text-foreground">Sessions</TableHead>
                                        <TableHead className="text-right text-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="border-warm-border hover:bg-warm-muted/50">
                                            <TableCell className="font-medium text-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                {user.role === 'admin' ? (
                                                    <span className="text-xs bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded inline-flex items-center gap-1">
                                                        <Crown className="h-3 w-3" /> Admin
                                                    </span>
                                                ) : user.role === 'mod' ? (
                                                    <span className="text-xs bg-sky-500/20 text-sky-600 dark:text-sky-400 px-2 py-1 rounded inline-flex items-center gap-1">
                                                        <Shield className="h-3 w-3" /> Mod
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded inline-flex items-center gap-1">
                                                        <User className="h-3 w-3" /> User
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.subscription_type === 'premium' ? (
                                                    <span className="text-xs bg-amber-500/15 text-amber-500 border border-amber-500/30 px-2 py-1 rounded-full inline-flex items-center gap-1 font-semibold">
                                                        <Sparkles className="h-3 w-3" /> Premium
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full inline-flex items-center gap-1">
                                                        Free
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'deleted' ? (
                                                    <span className="text-xs bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded inline-flex items-center gap-1">
                                                        <Ban className="h-3 w-3" /> Deleted
                                                    </span>
                                                ) : user.status === 'suspended' ? (
                                                    <span className="text-xs bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded inline-flex items-center gap-1">
                                                        <Ban className="h-3 w-3" /> Suspended
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-1 rounded inline-flex items-center gap-1">
                                                        <Sparkles className="h-3 w-3" /> Active
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{user.session_count}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-lg border-warm-border"
                                                        onClick={() => {
                                                            setSelectedUser(user)
                                                            setNewRole(user.role)
                                                        }}
                                                    >
                                                        Change Role
                                                    </Button>
                                                    {user.subscription_type === 'premium' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-lg border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                                                            onClick={() => setRevokeTarget(user)}
                                                        >
                                                            <Ban className="h-3 w-3 mr-1" />
                                                            Revoke
                                                        </Button>
                                                    )}

                                                    {user.status === 'suspended' || user.status === 'deleted' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-lg border-green-500/30 text-green-500 hover:bg-green-500/10 hover:border-green-500/50"
                                                            onClick={() => setStatusTarget({ user, newStatus: 'active' })}
                                                        >
                                                            Restore
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-lg border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500/50"
                                                            onClick={() => setStatusTarget({ user, newStatus: 'suspended' })}
                                                        >
                                                            Suspend
                                                        </Button>
                                                    )}

                                                    {(user.status === 'active' || user.status === 'suspended') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="rounded-lg border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
                                                            onClick={() => setStatusTarget({ user, newStatus: 'deleted' })}
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Update Role Dialog */}
            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update User Role</DialogTitle>
                        <DialogDescription>
                            Change the role for {selectedUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Role</label>
                            <Select value={newRole} onValueChange={(value) => setNewRole(value as UserRoleType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="mod">Moderator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {newRole === 'admin' ? (
                                <p>⚠️ Admins have full access to the admin panel and can manage other users.</p>
                            ) : newRole === 'mod' ? (
                                <p>🛡️ Moderators can view audit logs and all sessions for support purposes.</p>
                            ) : (
                                <p>Regular users have access to all agent features but cannot access the admin panel.</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedUser(null)} disabled={updating}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateRole} disabled={updating || newRole === selectedUser?.role}>
                            {updating ? 'Updating...' : 'Update Role'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Revoke Subscription Confirmation Dialog */}
            <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ban className="h-5 w-5 text-red-500" />
                            Revoke Premium Subscription
                        </DialogTitle>
                        <DialogDescription>
                            This will downgrade <strong>{revokeTarget?.email}</strong> from Premium back to the Free plan.
                            They will lose access to all premium features immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                            ⚠️ This action cannot be undone from the admin panel. The user will need to subscribe again through the normal upgrade flow to regain premium access.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRevokeSubscription}
                            disabled={revoking}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {revoking ? 'Revoking...' : 'Yes, Revoke Premium'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Update Status Confirmation Dialog */}
            <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {statusTarget?.newStatus === 'deleted' ? (
                                <><Ban className="h-5 w-5 text-red-500" /> Delete User Account</>
                            ) : statusTarget?.newStatus === 'suspended' ? (
                                <><Ban className="h-5 w-5 text-orange-500" /> Suspend User Account</>
                            ) : (
                                <><Sparkles className="h-5 w-5 text-green-500" /> Restore User Account</>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {statusTarget?.newStatus === 'deleted' ? (
                                <>This will permanently block <strong>{statusTarget?.user?.email}</strong> from accessing AI agents and canvas workflows. They can still log in, but all usage pathways will be revoked.</>
                            ) : statusTarget?.newStatus === 'suspended' ? (
                                <>This will suspend <strong>{statusTarget?.user?.email}</strong>. They will retain their existing data but cannot generate new tasks or access AI tools until restored.</>
                            ) : (
                                <>This will restore <strong>{statusTarget?.user?.email}</strong> giving them full access to the platform tools again without needing an access request.</>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {statusTarget?.newStatus === 'deleted' && (
                        <div className="py-4">
                            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                                ⚠️ Are you very sure you want to mark this account as deleted?
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusTarget(null)} disabled={updatingStatus}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateStatus}
                            disabled={updatingStatus}
                            className={
                                statusTarget?.newStatus === 'deleted'
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : statusTarget?.newStatus === 'suspended'
                                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                                        : "bg-green-600 hover:bg-green-700 text-white"
                            }
                        >
                            {updatingStatus ? 'Updating...' : `Yes, ${statusTarget?.newStatus === 'active' ? 'Restore' : statusTarget?.newStatus === 'deleted' ? 'Delete' : 'Suspend'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
