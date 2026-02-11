import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getAuditLogs } from '@/lib/audit'
import { AuditAction } from '@/types'

export async function GET(request: NextRequest) {
    try {
        // Verify admin access
        await requireAdmin()

        // Get query parameters
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get('user_id') || undefined
        const action = searchParams.get('action') as AuditAction | undefined
        const resourceType = searchParams.get('resource_type') || undefined
        const startDate = searchParams.get('start_date') || undefined
        const endDate = searchParams.get('end_date') || undefined
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Fetch audit logs
        const { data, count } = await getAuditLogs({
            userId,
            action,
            resourceType,
            startDate,
            endDate,
            limit,
            offset,
        })

        return NextResponse.json({
            data,
            count,
            limit,
            offset,
        })
    } catch (error: any) {
        console.error('Admin audit logs API error:', error)

        if (error.message === 'Unauthorized: Admin access required') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to fetch audit logs' },
            { status: 500 }
        )
    }
}
