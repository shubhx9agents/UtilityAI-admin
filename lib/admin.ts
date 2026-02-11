import { createClient } from '@/lib/supabase/server'
import { UserRoleType } from '@/types'

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return false
        }

        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (error || !data) {
            return false
        }

        return data.role === 'admin'
    } catch (error) {
        console.error('Error checking admin status:', error)
        return false
    }
}

/**
 * Get the role of the current user
 */
export async function getUserRole(): Promise<UserRoleType> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return 'user'
        }

        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (error || !data) {
            return 'user'
        }

        return data.role as UserRoleType
    } catch (error) {
        console.error('Error getting user role:', error)
        return 'user'
    }
}

/**
 * Ensure user has admin role, throw error if not
 * Use this in API routes that require admin access
 */
export async function requireAdmin(): Promise<void> {
    const adminStatus = await isAdmin()

    if (!adminStatus) {
        throw new Error('Unauthorized: Admin access required')
    }
}

/**
 * Get user role for a specific user ID
 * Only admins can call this
 */
export async function getUserRoleById(userId: string): Promise<UserRoleType> {
    await requireAdmin()

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

    if (error || !data) {
        return 'user'
    }

    return data.role as UserRoleType
}

/**
 * Check if the current user is a moderator
 */
export async function isMod(): Promise<boolean> {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return false
        }

        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (error || !data) {
            return false
        }

        return data.role === 'mod' || data.role === 'admin'
    } catch (error) {
        console.error('Error checking mod status:', error)
        return false
    }
}

/**
 * Check if user has a role at or above the specified level
 * Role hierarchy: user < mod < admin
 */
export async function hasRoleLevel(requiredRole: UserRoleType): Promise<boolean> {
    const roleHierarchy: Record<UserRoleType, number> = {
        user: 1,
        mod: 2,
        admin: 3,
    }

    const currentRole = await getUserRole()
    return roleHierarchy[currentRole] >= roleHierarchy[requiredRole]
}

/**
 * Ensure user has mod role or higher, throw error if not
 */
export async function requireMod(): Promise<void> {
    const modStatus = await isMod()

    if (!modStatus) {
        throw new Error('Unauthorized: Moderator access required')
    }
}

/**
 * Update user role
 * Only admins can call this
 */
export async function updateUserRole(
    userId: string,
    role: UserRoleType
): Promise<void> {
    await requireAdmin()

    const supabase = await createClient()

    // Check if role exists
    const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single()

    if (existing) {
        // Update existing role
        const { error } = await supabase
            .from('user_roles')
            .update({ role })
            .eq('user_id', userId)

        if (error) {
            throw new Error(`Failed to update user role: ${error.message}`)
        }
    } else {
        // Insert new role
        const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role })

        if (error) {
            throw new Error(`Failed to create user role: ${error.message}`)
        }
    }
}
