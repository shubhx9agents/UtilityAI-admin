'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock, ShieldCheck, Mail, User } from 'lucide-react'

type AccountRequest = {
  id: string
  name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AccountRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('account_requests')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) {
      setRequests(data as AccountRequest[])
    }
    setLoading(false)
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve')
    try {
      const res = await fetch('/api/admin/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id })
      })
      
      if (res.ok) {
        await fetchRequests()
      } else {
        const errorData = await res.json()
        console.error('Failed to approve:', errorData)
        alert('Failed to approve request: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error approving request:', error)
      alert('An unexpected error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject')
    try {
      const { error } = await supabase
        .from('account_requests')
        .update({ status: 'rejected' })
        .eq('id', id)
        
      if (error) throw error
      await fetchRequests()
    } catch (error) {
      console.error('Failed to reject:', error)
      alert('Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">Access Requests</h1>
        <p className="text-zinc-400">Review and approve new user account registrations.</p>
      </div>

      <Card className="border-white/10 bg-zinc-950/50 backdrop-blur-xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Pending Approvals</CardTitle>
              <CardDescription className="text-zinc-400">
                Grant access to new users
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p>No access requests found.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {requests.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-white/[0.02] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{request.name}</span>
                      <Badge 
                        variant="outline" 
                        className={`
                          ${request.status === 'pending' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : ''}
                          ${request.status === 'approved' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : ''}
                          ${request.status === 'rejected' ? 'border-red-500/30 text-red-500 bg-red-500/10' : ''}
                        `}
                      >
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {request.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading !== null}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        {actionLoading === request.id + '-reject' ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            Rejecting...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Reject
                          </span>
                        )}
                      </Button>
                      
                      <Button 
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading !== null}
                        className="bg-emerald-500 text-zinc-900 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                      >
                        {actionLoading === request.id + '-approve' ? (
                          <span className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
                            Approving...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Approve & Invite
                          </span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
