import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function getStripe() {
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const supabase = getSupabase();
  const stripe = await getStripe();

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const quoteId = session.metadata?.quote_id;

      if (quoteId) {
        // Update quote as paid
        await supabase
          .from('quotes')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq('id', quoteId);

        // Fetch quote and detailer for notification
        const { data: quote } = await supabase
          .from('quotes')
          .select('*, detailers(*)')
          .eq('id', quoteId)
          .single();

        if (quote) {
          // Send notification to detailer (email)
          const detailer = quote.detailers;
          if (detailer?.email) {
            try {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'no-reply@aircraftdetailing.ai',
                  to: detailer.email,
                  subject: 'Quote Approved & Paid!',
                  text: `Great news! Your quote for ${quote.aircraft_model || quote.aircraft_type} has been approved and paid.\n\nAmount: $${quote.total_price}\nCustomer: ${quote.client_name || 'Customer'}\n\nLog in to Vector to view details.`
                })
              });
            } catch (e) {
              console.error('Failed to send notification email:', e);
            }
          }
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      const error = paymentIntent.last_payment_error;

      // Log the failure for debugging but don't update quote status
      // This keeps the quote as 'sent' so customer can retry
      console.log('Payment failed:', {
        quoteId: paymentIntent.metadata?.quote_id,
        errorCode: error?.code,
        declineCode: error?.decline_code,
        message: error?.message
      });
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      const paymentIntentId = charge.payment_intent;

      // Find and update the quote
      const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (quote) {
        const isFullRefund = charge.amount_refunded >= charge.amount;
        await supabase
          .from('quotes')
          .update({
            status: isFullRefund ? 'refunded' : 'partial_refund',
            refunded_at: new Date().toISOString(),
            refund_amount: charge.amount_refunded / 100,
          })
          .eq('id', quote.id);
      }
      break;
    }

    default:
      // Unexpected event type
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
