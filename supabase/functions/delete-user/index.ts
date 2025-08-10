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

    // 2. Get the admin user's data to verify their role
    const { data: { user: adminUser } } = await supabaseClient.auth.getUser()
    if (!adminUser) throw new Error('User not authenticated')

    const { data: adminProfile, error: adminProfileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminProfileError) throw adminProfileError
    if (adminProfile.role !== 'admin') throw new Error('Permission denied: User is not an admin.')

    // 3. Get the user ID to delete from the request body
    const { userIdToDelete } = await req.json()
    if (!userIdToDelete) {
      return new Response(JSON.stringify({ error: 'User ID to delete is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    if (userIdToDelete === adminUser.id) {
      return new Response(JSON.stringify({ error: 'Admins cannot delete themselves' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 4. Use the service role client to perform the deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Check if the user to be deleted is also an admin
    const { data: userToDeleteProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userIdToDelete)
      .single()

    if (userToDeleteProfile && userToDeleteProfile.role === 'admin') {
      return new Response(JSON.stringify({ error: 'Cannot delete another admin' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // 5. Delete the user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete)
    if (deleteError) throw deleteError
    
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})