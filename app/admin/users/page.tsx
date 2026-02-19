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
import { Users, Search, ChevronLeft, Shield, Crown, User, Sparkles, Ban } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function UserManagementPage() {
    const router = useRouter()
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // Role update state
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
    const [newRole, setNewRole] = useState<UserRoleType>('user')
    const [updating, setUpdating] = useState(false)

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

    const filteredUsers = searchQuery
        ? users.filter(user =>
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : users

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

            {/* Search */}
            <Card className="border-warm-border bg-warm-surface">
                <CardHeader>
                    <CardTitle className="text-foreground">Search Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
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
        </div>
    )
}
