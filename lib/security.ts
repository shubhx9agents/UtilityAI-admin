/**
 * Security Utilities
 * Rate limiting, IP blocking, request validation, and security helpers
 */

import { NextRequest, NextResponse } from 'next/server'

// ============================================================================
// RATE LIMITING
// ============================================================================

// In-memory rate limit store (for single instance deployments)
// For production with multiple instances, use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
    windowMs: number     // Time window in milliseconds
    maxRequests: number  // Max requests per window
}

// Default rate limit: 100 requests per minute
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000,
    maxRequests: 100,
}

// Stricter rate limit for auth endpoints
export const AUTH_RATE_LIMIT: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,           // 5 attempts
}

// Rate limit for API endpoints
export const API_RATE_LIMIT: RateLimitConfig = {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 100,        // 100 requests
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }

    const realIp = request.headers.get('x-real-ip')
    if (realIp) {
        return realIp
    }

    const cfIp = request.headers.get('cf-connecting-ip')
    if (cfIp) {
        return cfIp
    }

    return 'unknown'
}

/**
 * Check if request is rate limited
 * Returns true if rate limited, false if allowed
 */
export function isRateLimited(
    identifier: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = identifier

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key)

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
        }
        rateLimitStore.set(key, entry)
        return {
            limited: false,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
        }
    }

    // Increment count
    entry.count++
    rateLimitStore.set(key, entry)

    // Check if over limit
    const limited = entry.count > config.maxRequests
    const remaining = Math.max(0, config.maxRequests - entry.count)

    return { limited, remaining, resetTime: entry.resetTime }
}

/**
 * Rate limit middleware for API routes
 */
export function rateLimit(
    request: NextRequest,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; response?: NextResponse } {
    const ip = getClientIp(request)
    const path = request.nextUrl.pathname
    const identifier = `${ip}:${path}`

    const result = isRateLimited(identifier, config)

    if (result.limited) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
        return {
            allowed: false,
            response: NextResponse.json(
                {
                    error: 'Too many requests',
                    message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
                    retryAfter,
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfter),
                        'X-RateLimit-Limit': String(config.maxRequests),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(result.resetTime),
                    },
                }
            ),
        }
    }

    return { allowed: true }
}

// ============================================================================
// IP BLOCKING
// ============================================================================

// Blocked IPs (in production, use a database or Redis)
const blockedIps = new Set<string>()

/**
 * Block an IP address
 */
export function blockIp(ip: string): void {
    blockedIps.add(ip)
}

/**
 * Unblock an IP address
 */
export function unblockIp(ip: string): void {
    blockedIps.delete(ip)
}

/**
 * Check if IP is blocked
 */
export function isIpBlocked(ip: string): boolean {
    return blockedIps.has(ip)
}

// ============================================================================
// SUSPICIOUS ACTIVITY DETECTION
// ============================================================================

// Track failed login attempts
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number }>()

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(ip: string, email: string): void {
    const key = `${ip}:${email}`
    const now = Date.now()
    const entry = failedLoginAttempts.get(key)

    if (!entry || now - entry.lastAttempt > 15 * 60 * 1000) {
        // Reset after 15 minutes
        failedLoginAttempts.set(key, { count: 1, lastAttempt: now })
    } else {
        entry.count++
        entry.lastAttempt = now
        failedLoginAttempts.set(key, entry)

        // Auto-block after 10 failed attempts
        if (entry.count >= 10) {
            blockIp(ip)
            console.warn(`Auto-blocked IP ${ip} after 10 failed login attempts for ${email}`)
        }
    }
}

/**
 * Clear failed login attempts (call on successful login)
 */
export function clearFailedLogins(ip: string, email: string): void {
    const key = `${ip}:${email}`
    failedLoginAttempts.delete(key)
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate request origin (CSRF protection)
 */
export function validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    // Allow if no origin (same-origin requests)
    if (!origin) return true

    // Allow if origin matches host
    try {
        const originUrl = new URL(origin)
        const hostWithProtocol = `${originUrl.protocol}//${host}`
        return origin === hostWithProtocol || originUrl.host === host
    } catch {
        return false
    }
}

/**
 * Check for common attack patterns in URL
 */
export function hasAttackPatterns(url: string): boolean {
    const patterns = [
        /\.\.\//, // Path traversal
        /<script/i, // Script injection
        /javascript:/i, // JavaScript URLs
        /\0/, // Null bytes
        /exec\s*\(/i, // Code execution
        /eval\s*\(/i, // Eval
        /union\s+select/i, // SQL injection
    ]

    return patterns.some(pattern => pattern.test(url))
}

// ============================================================================
// SECURE HEADERS
// ============================================================================

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    return response
}

// ============================================================================
// CLEANUP
// ============================================================================

// Periodically clean up expired entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now()

        // Clean rate limit store
        for (const [key, entry] of rateLimitStore.entries()) {
            if (now > entry.resetTime) {
                rateLimitStore.delete(key)
            }
        }

        // Clean failed login attempts
        for (const [key, entry] of failedLoginAttempts.entries()) {
            if (now - entry.lastAttempt > 15 * 60 * 1000) {
                failedLoginAttempts.delete(key)
            }
        }
    }, 5 * 60 * 1000)
}
