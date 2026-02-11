'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Shield, Users, Clock, BarChart3, Lock, Zap } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
    const router = useRouter()
    const { user, loading } = useAuth()

    useEffect(() => {
        if (!loading && user) {
            router.push('/admin')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Gradient Orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-16">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 shadow-lg shadow-amber-500/50">
                                <Shield className="h-7 w-7 text-zinc-900" />
                            </div>
                            <span className="font-heading text-2xl font-bold text-white">
                                UtilityAI Admin
                            </span>
                        </div>
                        <Link href="/login">
                            <Button
                                variant="outline"
                                className="border-zinc-700 bg-zinc-800/50 text-zinc-100 hover:bg-zinc-700 hover:text-white"
                            >
                                Sign In
                            </Button>
                        </Link>
                    </div>

                    {/* Hero Content */}
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-8">
                            <Lock className="h-4 w-4" />
                            <span>Secure Admin Portal</span>
                        </div>

                        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            Powerful Admin
                            <br />
                            <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                                Control Center
                            </span>
                        </h1>

                        <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                            Manage users, monitor activity, and control your UtilityAI platform with ease.
                            A comprehensive admin dashboard built for efficiency.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/login">
                                <Button
                                    size="lg"
                                    className="bg-amber-500 text-zinc-900 hover:bg-amber-600 shadow-lg shadow-amber-500/30 px-8 py-6 text-lg font-semibold"
                                >
                                    <Shield className="mr-2 h-5 w-5" />
                                    Access Admin Panel
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<Users className="h-6 w-6" />}
                            title="User Management"
                            description="Manage user roles, permissions, and account settings with granular control."
                        />
                        <FeatureCard
                            icon={<Clock className="h-6 w-6" />}
                            title="Audit Logs"
                            description="Track all system activities with comprehensive audit logging and monitoring."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="h-6 w-6" />}
                            title="Analytics Dashboard"
                            description="View real-time statistics and insights about your platform's performance."
                        />
                    </div>

                    {/* Stats Section */}
                    <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8">
                        <StatCard number="99.9%" label="Uptime" />
                        <StatCard number="<100ms" label="Response Time" />
                        <StatCard number="256-bit" label="Encryption" />
                        <StatCard number="24/7" label="Monitoring" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-zinc-500">
                            © 2026 UtilityAI Admin. All rights reserved.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                            <Lock className="h-4 w-4" />
                            <span>Secured with enterprise-grade encryption</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
            <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-4 group-hover:bg-amber-500/20 transition-colors">
                    {icon}
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
            </div>
        </div>
    )
}

function StatCard({ number, label }: { number: string; label: string }) {
    return (
        <div className="text-center">
            <div className="font-heading text-3xl font-bold text-white mb-1">{number}</div>
            <div className="text-sm text-zinc-500">{label}</div>
        </div>
    )
}
