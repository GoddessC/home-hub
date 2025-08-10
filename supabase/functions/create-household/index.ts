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
    const { 
      householdName, 
      adminFullName, adminEmail, adminPassword,
      familyEmail, familyPassword,
      members 
    } = await req.json()

    if (!householdName || !adminFullName || !adminEmail || !adminPassword || !familyEmail || !familyPassword) {
      return new Response(JSON.stringify({ error: 'Missing required fields for household, admin, or family accounts.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Create the household
    const { data: householdData, error: householdError } = await supabaseAdmin
      .from('households')
      .insert({ name: householdName })
      .select()
      .single()
    if (householdError) throw new Error(`Failed to create household: ${householdError.message}`)
    if (!householdData) throw new Error('Household created but no data was returned.')

    // 2. Create the admin user
    const { data: adminAuthData, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })
    if (adminAuthError) throw new Error(`Failed to create admin user: ${adminAuthError.message}`)
    const adminUser = adminAuthData.user

    // 3. Create the admin's profile
    const { error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: adminUser.id,
        full_name: adminFullName,
        role: 'admin',
        household_id: householdData.id,
      })
    if (adminProfileError) throw new Error(`Failed to create admin profile: ${adminProfileError.message}`)

    // 4. Create the shared family dashboard user
    const { data: familyAuthData, error: familyAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: familyEmail,
        password: familyPassword,
        email_confirm: true,
    })
    if (familyAuthError) throw new Error(`Failed to create family user: ${familyAuthError.message}`)
    const familyUser = familyAuthData.user

    // 5. Create the family dashboard's profile
    const { error: familyProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: familyUser.id,
        full_name: `${householdName} Family`,
        role: 'dashboard',
        household_id: householdData.id,
      })
    if (familyProfileError) throw new Error(`Failed to create family profile: ${familyProfileError.message}`)

    // 6. Create non-user member profiles
    if (members && Array.isArray(members) && members.length > 0) {
      const memberInserts = members
        .filter(member => member.name && member.name.trim() !== '')
        .map(member => ({
          household_id: householdData.id,
          full_name: member.name,
        }));

      if (memberInserts.length > 0) {
        const { error: membersError } = await supabaseAdmin
          .from('members')
          .insert(memberInserts)
        if (membersError) throw new Error(`Failed to create members: ${membersError.message}`)
      }
    }

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