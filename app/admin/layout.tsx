'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
    LayoutDashboard,
    Users,
    Clock,
    LogOut,
    Shield,
    Menu,
    X,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: Clock },
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, signOut } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleSignOut = async () => {
        await signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden
                />
            )}

            {/* Dark sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 transform border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-5">
                        <Link href="/admin" className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-zinc-900">
                                <Shield className="h-5 w-5" />
                            </div>
                            <span className="font-heading text-lg font-semibold text-white">
                                Admin Panel
                            </span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100'
                                        }`}
                                    onClick={() => {
                                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                            setSidebarOpen(false)
                                        }
                                    }}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    <span>{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="border-t border-zinc-800 p-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                                    <span className="text-sm font-semibold">
                                        {user?.user_metadata?.name?.charAt(0).toUpperCase() ||
                                            user?.email?.charAt(0).toUpperCase() || 'A'}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-zinc-100">
                                        {user?.user_metadata?.name || user?.email?.split('@')[0]}
                                    </p>
                                    <p className="text-xs text-zinc-500">Admin</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            <ThemeToggle />
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                onClick={handleSignOut}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Warm main area */}
            <div className="dashboard-warm min-h-screen bg-warm-bg lg:pl-64">
                <header className="sticky top-0 z-30 flex h-14 items-center border-b border-warm-border bg-warm-surface/80 backdrop-blur sm:h-16">
                    <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className="rounded-lg p-2 text-stone-600 hover:bg-warm-muted lg:hidden"
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <div className="flex-1" />
                    </div>
                </header>

                <main className="p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    )
}
