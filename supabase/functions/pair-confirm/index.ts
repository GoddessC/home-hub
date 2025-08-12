import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { code, displayName } = await req.json();
    if (!code) throw new Error("Pairing code is required.");

    // Fetch admin's household
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('household_id')
      .eq('user_id', user.id)
      .in('role', ['OWNER', 'ADULT'])
      .single();

    if (memberError || !memberData) throw new Error("Admin user not found in any household.");
    const householdId = memberData.household_id;

    // Use service role client for the transaction part
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Fetch the pairing request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('pairing_requests')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (requestError || !request) throw new Error("Invalid or expired pairing code.");
    if (request.status !== 'PENDING') throw new Error("Pairing code has already been used.");
    if (new Date(request.expires_at) < new Date()) {
        // Optionally update status to EXPIRED
        await supabaseAdmin.from('pairing_requests').update({ status: 'EXPIRED' }).eq('code', request.code);
        throw new Error("Pairing code has expired.");
    }

    // Create the device record
    const { data: newDevice, error: deviceError } = await supabaseAdmin
      .from('devices')
      .insert({
        kiosk_user_id: request.kiosk_user_id,
        household_id: householdId,
        display_name: displayName || 'New Kiosk',
      })
      .select()
      .single();

    if (deviceError) throw deviceError;

    // Update the pairing request to APPROVED
    const { error: updateError } = await supabaseAdmin
      .from('pairing_requests')
      .update({
        status: 'APPROVED',
        approved_by: user.id,
        household_id: householdId,
      })
      .eq('code', request.code);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ device_id: newDevice.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});