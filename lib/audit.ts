import { createClient } from '@/lib/supabase/server'
import { AuditAction, AuditLog } from '@/types'

/**
 * Log an audit event to the database
 * This function should be called from API routes to track user actions
 */
export async function logAuditEvent({
    userId,
    userEmail,
    action,
    resourceType,
    resourceId,
    details,
    request,
}: {
    userId?: string | null
    userEmail?: string | null
    action: AuditAction
    resourceType?: string
    resourceId?: string
    details?: Record<string, any>
    request?: Request
}): Promise<void> {
    try {
        const supabase = await createClient()

        // Extract IP address and user agent from request if provided
        let ipAddress: string | null = null
        let userAgent: string | null = null

        if (request) {
            // Get IP address from various headers (considering proxies)
            ipAddress =
                request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                request.headers.get('x-real-ip') ||
                request.headers.get('cf-connecting-ip') ||
                null

            userAgent = request.headers.get('user-agent') || null
        }

        // Insert audit log
        const { error } = await supabase.from('audit_logs').insert({
            user_id: userId || null,
            user_email: userEmail || null,
            action,
            resource_type: resourceType || null,
            resource_id: resourceId || null,
            details: details || null,
            ip_address: ipAddress,
            user_agent: userAgent,
        })

        if (error) {
            console.error('Failed to log audit event:', error)
            // Don't throw error - audit logging should not break the main flow
        }
    } catch (error) {
        console.error('Error in logAuditEvent:', error)
        // Silent fail - audit logging is important but not critical
    }
}

/**
 * Get audit logs with optional filters
 * This should only be called by admin users
 */
export async function getAuditLogs(filters?: {
    userId?: string
    action?: AuditAction
    resourceType?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
}): Promise<{ data: AuditLog[]; count: number }> {
    const supabase = await createClient()

    let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
    }

    if (filters?.action) {
        query = query.eq('action', filters.action)
    }

    if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType)
    }

    if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
    }

    if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
    }

    // Apply pagination
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
        console.error('Error fetching audit logs:', error)
        throw new Error('Failed to fetch audit logs')
    }

    return {
        data: (data as AuditLog[]) || [],
        count: count || 0,
    }
}

/**
 * Audit action constants for easy reference
 */
export const AUDIT_ACTIONS = {
    // User actions
    USER_LOGIN: 'user.login' as AuditAction,
    USER_LOGOUT: 'user.logout' as AuditAction,
    USER_SIGNUP: 'user.signup' as AuditAction,
    USER_PASSWORD_RESET: 'user.password_reset' as AuditAction,

    // Session actions
    SESSION_CREATED: 'session.created' as AuditAction,
    SESSION_UPDATED: 'session.updated' as AuditAction,
    SESSION_DELETED: 'session.deleted' as AuditAction,
    SESSION_RESTORED: 'session.restored' as AuditAction,

    // Admin actions
    ROLE_UPDATED: 'role.updated' as AuditAction,
} as const
