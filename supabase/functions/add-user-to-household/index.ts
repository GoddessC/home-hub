import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Create a Supabase client with the user's auth token to verify permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Get the admin user's data to verify their role and get their household_id
    const { data: { user: adminUser } } = await supabaseClient.auth.getUser()
    if (!adminUser) throw new Error('User not authenticated')

    const { data: adminProfile, error: adminProfileError } = await supabaseClient
      .from('profiles')
      .select('role, household_id')
      .eq('id', adminUser.id)
      .single()

    if (adminProfileError) throw adminProfileError
    if (adminProfile.role !== 'admin') throw new Error('Permission denied: User is not an admin.')
    if (!adminProfile.household_id) throw new Error('Admin is not associated with a household.')

    // 3. Get the new user's details from the request body
    const { full_name, email, password } = await req.json()
    if (!full_name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 4. Use the service role client to perform the creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newUserAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the user
    })

    if (authError) throw authError

    // 5. Create the user's profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserAuth.user.id,
        full_name,
        household_id: adminProfile.household_id,
        role: 'dashboard', // New users are always assigned the 'dashboard' role
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ message: 'User added successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in add-user-to-household function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})