import { createClient } from 'npm:@supabase/supabase-js@2'

// Public endpoint (verify_jwt = false) — called by DB trigger via pg_net.
// Forwards report data to send-transactional-email.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'config' }), { status: 500, headers: corsHeaders })
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: corsHeaders })
  }

  if (!payload.report_id) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'report-admin-alert',
        recipientEmail: 'clemensschuth@outlook.de',
        idempotencyKey: `report-${payload.report_id}`,
        templateData: {
          reportId: payload.report_id,
          reportType: payload.report_type,
          reason: payload.reason,
          description: payload.description,
          reportedBy: payload.reported_by,
          reportedUserId: payload.reported_user_id,
          messageId: payload.message_id,
          createdAt: payload.created_at,
        },
      },
    })

    if (error) {
      console.error('send-transactional-email failed', error)
      return new Response(JSON.stringify({ error: 'send_failed' }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-report error', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
