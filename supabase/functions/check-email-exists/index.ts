// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

// This function checks if an email exists using the Admin API.
// It requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set in the function environment.

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url)
    const email = url.searchParams.get('email')?.trim().toLowerCase()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const { data, error } = await admin.auth.admin.getUserByEmail(email)
    if (error) {
      // If user not found, Supabase returns an error with status 400; treat as not exists
      // But different versions may return null data without error; handle both
      if ((error as any).status === 400) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      // Unexpected error
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const exists = !!data?.user
    return new Response(JSON.stringify({ exists }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Deno.serve for edge runtime
// biome-ignore lint/suspicious/noAssignInExpressions: deno serve pattern
;(globalThis as any).Deno?.serve?.(handler)


