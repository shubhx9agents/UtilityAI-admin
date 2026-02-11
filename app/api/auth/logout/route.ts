import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Sign out
        const { error } = await supabase.auth.signOut()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Logout API error:', error)
        return NextResponse.json(
            { error: error.message || 'Logout failed' },
            { status: 500 }
        )
    }
}
