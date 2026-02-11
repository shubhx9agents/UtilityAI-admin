import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ isAdmin: false, error: 'Not authenticated' }, { status: 401 })
        }

        // Check user role
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        console.log('Admin check for user:', user.email)
        console.log('Role query result:', { data, error })

        if (error) {
            console.error('Error checking admin status:', error)
            return NextResponse.json({
                isAdmin: false,
                error: error.message,
                user_email: user.email
            })
        }

        const isAdmin = data?.role === 'admin'

        return NextResponse.json({
            isAdmin,
            role: data?.role || 'user',
            user_email: user.email
        })
    } catch (error: any) {
        console.error('Admin check API error:', error)
        return NextResponse.json(
            { isAdmin: false, error: error.message },
            { status: 500 }
        )
    }
}
