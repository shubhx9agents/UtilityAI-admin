'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertCircle, Mail } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const { signIn, signInWithGoogle } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: signInError } = await signIn(email, password)

            if (signInError) {
                setError(signInError.message)
                setLoading(false)
                return
            }

            // Check if user is admin
            const res = await fetch('/api/admin/check')
            const data = await res.json()

            if (!data.isAdmin) {
                setError('Access denied. Admin privileges required.')
                // Sign out non-admin user
                await fetch('/api/auth/logout', { method: 'POST' })
                setLoading(false)
                return
            }

            router.push('/admin')
        } catch (err: any) {
            setError(err.message || 'Login failed')
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError('')
        setLoading(true)

        try {
            const { error: signInError } = await signInWithGoogle()

            if (signInError) {
                setError(signInError.message)
                setLoading(false)
            }
            // Note: Admin check will happen after redirect
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4 relative overflow-hidden">
            {/* Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 w-full max-w-md">
                {/* Back to Home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
                >
                    <Shield className="h-4 w-4" />
                    <span>Back to Home</span>
                </Link>

                <Card className="border-zinc-800 bg-zinc-900/80 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-4 text-center pb-6">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/50">
                            <Shield className="h-8 w-8 text-zinc-900" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-white">Admin Sign In</CardTitle>
                            <CardDescription className="text-zinc-400 mt-2">
                                Access the admin control panel
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-amber-500 text-zinc-900 hover:bg-amber-600 font-semibold shadow-lg shadow-amber-500/30"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent"></div>
                                        <span>Signing in...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Sign In with Email
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-700"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-700 hover:text-white"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Sign In with Google
                        </Button>

                        <p className="text-center text-xs text-zinc-500 mt-4">
                            Admin access only. Unauthorized access is prohibited.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
