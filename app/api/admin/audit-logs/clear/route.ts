import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
    try {
        // Verify admin access
        await requireAdmin()

        const supabase = await createClient()

        // Delete all audit logs (using a condition that matches all rows)
        const { error, count } = await supabase
            .from('audit_logs')
            .delete({ count: 'exact' })
            .gt('created_at', '1970-01-01') // Matches all rows (all timestamps are after 1970)

        if (error) {
            console.error('Delete error:', error)
            throw new Error(`Failed to clear audit logs: ${error.message}`)
        }

        return NextResponse.json({
            success: true,
            message: 'All audit logs cleared successfully'
        })
    } catch (error: any) {
        console.error('Clear audit logs API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to clear audit logs' },
            { status: 500 }
        )
    }
}
