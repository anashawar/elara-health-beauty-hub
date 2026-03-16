import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { OrderConfirmationEmail } from '../_shared/email-templates/order-confirmation.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SENDER_DOMAIN = 'notify.elarastore.co'
const FROM_ADDRESS = 'ELARA <orders@elarastore.co>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claimsData.claims.sub as string

    const {
      order_id,
      items,
      subtotal,
      delivery_fee,
      discount,
      total,
      delivery_address,
      payment_method,
    } = await req.json()

    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user email and profile
    const serviceClient = createClient(supabaseUrl, serviceKey)

    const { data: userData } = await serviceClient.auth.admin.getUserById(userId)
    const email = userData?.user?.email
    if (!email) {
      return new Response(JSON.stringify({ error: 'No email found for user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle()

    const paymentLabels: Record<string, string> = {
      cod: 'Cash on Delivery',
      fib: 'FIB (First Iraqi Bank)',
      qicard: 'Qi Card',
    }

    const templateProps = {
      orderId: order_id,
      customerName: profile?.full_name || '',
      items: items || [],
      subtotal: subtotal || 0,
      deliveryFee: delivery_fee || 0,
      discount: discount || 0,
      total: total || 0,
      deliveryAddress: delivery_address || 'Not specified',
      paymentMethod: paymentLabels[payment_method] || payment_method || 'Cash on Delivery',
      orderDate: new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    }

    // Render email
    const html = await renderAsync(React.createElement(OrderConfirmationEmail, templateProps))
    const text = await renderAsync(React.createElement(OrderConfirmationEmail, templateProps), {
      plainText: true,
    })

    // Enqueue via the transactional email queue
    const messageId = crypto.randomUUID()

    await serviceClient.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'order-confirmation',
      recipient_email: email,
      status: 'pending',
    })

    const { error: enqueueError } = await serviceClient.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: email,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject: `Your ELARA order #${order_id.slice(0, 8).toUpperCase()} is confirmed! ✨`,
        html,
        text,
        purpose: 'transactional',
        label: 'order-confirmation',
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue order email', { error: enqueueError })
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-order-email error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
