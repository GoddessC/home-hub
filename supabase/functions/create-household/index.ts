import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { householdName, adminFullName, adminEmail, adminPassword } = await req.json()

    if (!householdName || !adminFullName || !adminEmail || !adminPassword) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Use the service role key to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Create the admin user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm user for simplicity in this flow
    })

    if (authError) throw authError
    const adminUser = authData.user

    // 2. Create the new household
    const { data: householdData, error: householdError } = await supabaseAdmin
      .from('households')
      .insert({ name: householdName })
      .select()
      .single()

    if (householdError) throw householdError

    // 3. Create the admin's profile, linking the user and household
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: adminUser.id,
        full_name: adminFullName,
        role: 'admin',
        household_id: householdData.id,
      })

    if (profileError) throw profileError

    return new Response(JSON.stringify({ message: 'Household created successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in create-household function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})