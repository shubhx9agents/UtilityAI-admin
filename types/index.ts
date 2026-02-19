// Database Types
export interface Profile {
    id: string
    email: string
    name: string
    role: 'user' | 'mod' | 'admin'
    account_type: 'basic' | 'premium' | 'enterprise'
    must_change_password: boolean
    api_keys?: Record<string, string>
    created_at: string
    last_login?: string
    updated_at: string
}

// Admin & Audit Types
export type UserRoleType = 'user' | 'mod' | 'admin'

export interface UserRole {
    id: string
    user_id: string
    role: UserRoleType
    created_at: string
    updated_at: string
}

export type AuditAction =
    | 'user.login'
    | 'user.logout'
    | 'user.signup'
    | 'user.password_reset'
    | 'session.created'
    | 'session.updated'
    | 'session.deleted'
    | 'session.restored'
    | 'role.updated'
    | 'subscription.revoked'

export interface AuditLog {
    id: string
    user_id: string | null
    user_email: string | null
    action: AuditAction
    resource_type: string | null
    resource_id: string | null
    details: Record<string, any> | null
    ip_address: string | null
    user_agent: string | null
    created_at: string
}

export interface AuditLogFilters {
    user_id?: string
    action?: AuditAction
    resource_type?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
}

export interface AdminStats {
    total_users: number
    total_sessions: number
    recent_activity_24h: number
    total_logins_24h: number
    total_logouts_24h: number
    most_active_users: Array<{
        user_email: string
        action_count: number
    }>
    most_used_agents: Array<{
        agent_type: string
        usage_count: number
    }>
    agent_usage_distribution: Array<{
        agent_type: string
        usage_count: number
        percentage: number
    }>
    action_breakdown_7d: Array<{
        action: string
        count: number
    }>
    resource_breakdown_7d: Array<{
        resource_type: string
        count: number
    }>
    activity_timeline_7d: Array<{
        date: string
        actions: number
        sessions_created: number
        user_logins: number
        user_logouts: number
    }>
    activity_timeline_24h: Array<{
        hour: string
        actions: number
        sessions_created: number
        user_logins: number
        user_logouts: number
    }>
}

export interface AdminUser {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string | null
    role: UserRoleType
    session_count: number
    subscription_type: 'free' | 'premium'
}

// API Response Types
export interface ApiResponse<T = any> {
    data?: T
    error?: string
    message?: string
}
