import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendPaymentReceivedEmail, sendPaymentConfirmedEmail } from '@/lib/email';
import { notifyQuotePaid } from '@/lib/push';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim());

  const supabase = getSupabase();

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
      const isChangeOrder = session.metadata?.type === 'change_order';

      // Handle change order payment
      if (isChangeOrder && session.metadata?.change_order_id) {
        const changeOrderId = session.metadata.change_order_id;
        const approvalToken = session.metadata.approval_token;

        // Get change order with quote details
        const { data: changeOrder, error: coError } = await supabase
          .from('change_orders')
          .select('*, quotes (*, detailers (company_name, email))')
          .eq('id', changeOrderId)
          .single();

        if (changeOrder && changeOrder.status === 'pending') {
          // Update change order as approved
          await supabase
            .from('change_orders')
            .update({
              status: 'approved',
              payment_intent_id: session.payment_intent,
              processed_at: new Date().toISOString(),
            })
            .eq('id', changeOrderId);

          // Update quote total and line items
          const newTotal = (changeOrder.quotes.total_price || 0) + changeOrder.amount;
          const existingItems = changeOrder.quotes.line_items || [];
          const newItems = changeOrder.services.map(s => ({
            service: s.name || s.description,
            description: s.description || s.name,
            amount: s.amount || s.price || 0,
            isChangeOrder: true,
            changeOrderId: changeOrder.id,
          }));

          await supabase
            .from('quotes')
            .update({
              total_price: newTotal,
              line_items: [...existingItems, ...newItems],
            })
            .eq('id', changeOrder.quote_id);

          // Notify detailer
          if (changeOrder.quotes?.detailers?.email && process.env.RESEND_API_KEY) {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);

            await resend.emails.send({
              from: 'Vector <noreply@aircraftdetailing.ai>',
              to: changeOrder.quotes.detailers.email,
              subject: `Change Order Approved! - ${changeOrder.quotes.client_name || 'Customer'}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                  <h2 style="color: #22c55e;">Change Order Approved & Paid!</h2>
                  <p><strong>Customer:</strong> ${changeOrder.quotes.client_name || 'Unknown'}</p>
                  <p><strong>Aircraft:</strong> ${changeOrder.quotes.aircraft_model || changeOrder.quotes.aircraft_type}</p>
                  <p><strong>Additional Amount:</strong> $${changeOrder.amount.toFixed(2)}</p>
                  <p><strong>New Total:</strong> $${newTotal.toFixed(2)}</p>
                  <p style="color: #22c55e; font-weight: bold;">
                    The customer has approved and paid for the additional services. You can proceed with the work!
                  </p>
                </div>
              `,
            });
            console.log('Change order approval email sent to detailer');
          }
        }
        break;
      }

      // Handle regular quote payment
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
          const detailer = quote.detailers;

          // Send payment received notification to detailer (email)
          if (detailer?.email) {
            try {
              await sendPaymentReceivedEmail({ quote, detailer });
              console.log('Payment received email sent to detailer');
            } catch (e) {
              console.error('Failed to send detailer email:', e);
            }
          }

          // Send push notification to detailer
          if (detailer?.fcm_token) {
            notifyQuotePaid({ fcmToken: detailer.fcm_token, quote }).catch(console.error);
          }

          // Send payment confirmation to customer
          if (quote.client_email) {
            try {
              await sendPaymentConfirmedEmail({ quote, detailer });
              console.log('Payment confirmed email sent to customer');
            } catch (e) {
              console.error('Failed to send customer confirmation:', e);
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

    // Subscription events for tier upgrades
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const detailerId = subscription.metadata?.detailer_id;
      const tier = subscription.metadata?.tier;

      if (detailerId && tier && subscription.status === 'active') {
        await supabase
          .from('detailers')
          .update({
            plan: tier,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', detailerId);

        console.log(`Updated detailer ${detailerId} to ${tier} plan`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const detailerId = subscription.metadata?.detailer_id;

      if (detailerId) {
        // Downgrade to free tier when subscription is cancelled
        await supabase
          .from('detailers')
          .update({
            plan: 'free',
            subscription_status: 'cancelled',
            subscription_updated_at: new Date().toISOString(),
          })
          .eq('id', detailerId);

        console.log(`Downgraded detailer ${detailerId} to free plan`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (subscriptionId) {
        // Get subscription to find detailer
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const detailerId = subscription.metadata?.detailer_id;

        if (detailerId) {
          await supabase
            .from('detailers')
            .update({
              subscription_status: 'past_due',
              subscription_updated_at: new Date().toISOString(),
            })
            .eq('id', detailerId);

          console.log(`Marked detailer ${detailerId} subscription as past_due`);
        }
      }
      break;
    }

    default:
      // Unexpected event type
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
