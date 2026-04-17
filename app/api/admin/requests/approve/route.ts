import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerClient()
    const { data: { user } } = await serverSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }

    const body = await req.json()
    const { requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the request details
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('account_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'Request is already processed' }, { status: 400 })
    }

    // Determine the user app URL (fallback to localhost:3000 if not specified)
    const userAppUrl = process.env.NEXT_PUBLIC_USER_APP_URL || 'http://localhost:3000'
    const normalizedEmail = request.email.trim().toLowerCase()
    const resetRedirectUrl = `${userAppUrl}/reset-password`

    // Invite the user via email. This creates the user and triggers the welcome/magic link email.
    // Redirect directly to reset-password so Supabase hash tokens are preserved in the browser URL.
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(request.email, {
      data: {
        name: request.name,
        must_change_password: true,
      },
      redirectTo: resetRedirectUrl
    })

    if (inviteError) {
      const inviteMessage = inviteError.message.toLowerCase()
      const isAlreadyRegistered =
        inviteMessage.includes('already') &&
        (inviteMessage.includes('registered') || inviteMessage.includes('exists'))

      // Fallback path: user already exists (e.g., attempted Google OAuth before approval).
      // Convert approval into a password-reset onboarding flow instead of failing.
      if (!isAlreadyRegistered) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }

      const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle()

      if (existingProfileError || !existingProfile?.id) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }

      const { data: existingUserData, error: existingUserError } =
        await supabaseAdmin.auth.admin.getUserById(existingProfile.id)

      if (existingUserError) {
        return NextResponse.json({ error: existingUserError.message }, { status: 400 })
      }

      const existingMetadata = existingUserData.user?.user_metadata || {}
      const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
        existingProfile.id,
        {
          user_metadata: {
            ...existingMetadata,
            name: request.name,
            must_change_password: true,
          },
        }
      )

      if (updateUserError) {
        return NextResponse.json({ error: updateUserError.message }, { status: 400 })
      }

      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true, name: request.name })
        .eq('id', existingProfile.id)

      if (updateProfileError) {
        return NextResponse.json({ error: updateProfileError.message }, { status: 400 })
      }

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: resetRedirectUrl
      })

      if (resetError) {
        return NextResponse.json({ error: resetError.message }, { status: 400 })
      }

      await supabaseAdmin
        .from('account_requests')
        .update({ status: 'approved' })
        .eq('id', requestId)

      return NextResponse.json({ message: 'Existing user approved and reset email sent successfully' })
    }

    // The handler_new_user trigger in the DB creates the profile row synchronously but passes must_change_password as default false.
    // We update it to true.
    if (inviteData?.user?.id) {
      await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', inviteData.user.id)
    }

    // Mark request as approved
    await supabaseAdmin
      .from('account_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)

    return NextResponse.json({ message: 'User invited successfully' })
  } catch (error: unknown) {
    console.error('Error approving request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
