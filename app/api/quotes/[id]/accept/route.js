import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// POST - Accept quote without online payment (request invoice / pay by check)
export async function POST(request, { params }) {
  const supabase = getSupabase();

  try {
    const { shareLink } = await request.json();
    const { id } = params;

    if (!id || !shareLink) {
      return Response.json({ error: 'Quote ID and share link required' }, { status: 400 });
    }

    // Fetch quote — require share_link match for security
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, detailer_id, total_price, aircraft_model, aircraft_type, status, client_name, client_email, share_link')
      .eq('id', id)
      .eq('share_link', shareLink)
      .single();

    if (quoteError || !quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === 'paid' || quote.status === 'approved' || quote.status === 'accepted') {
      return Response.json({ error: 'Quote already accepted or paid' }, { status: 400 });
    }

    // Update quote status to accepted
    await supabase
      .from('quotes')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', id);

    // Fetch detailer for notification
    const { data: detailer } = await supabase
      .from('detailers')
      .select('email, company, name')
      .eq('id', quote.detailer_id)
      .single();

    // Send notification email to detailer
    if (detailer?.email) {
      try {
        const sgKey = process.env.SENDGRID_API_KEY;
        if (sgKey) {
          await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: detailer.email }] }],
              from: { email: 'notifications@vectorav.ai', name: 'Vector Aviation' },
              subject: `Invoice Requested — ${quote.aircraft_model || quote.aircraft_type || 'Quote'}`,
              content: [{
                type: 'text/html',
                value: `<p>Hi ${detailer.name || detailer.company || ''},</p>
<p><strong>${quote.client_name || 'A customer'}</strong> accepted your quote for <strong>${quote.aircraft_model || quote.aircraft_type || 'aircraft detail'}</strong> and requested an invoice.</p>
<p>They chose to pay by check/ACH instead of credit card. Please send them an invoice directly.</p>
<p>Quote total: <strong>$${(quote.total_price || 0).toLocaleString()}</strong></p>
${quote.client_email ? `<p>Customer email: <a href="mailto:${quote.client_email}">${quote.client_email}</a></p>` : ''}
<p style="color:#999;font-size:12px;">— Vector Aviation</p>`,
              }],
            }),
          });
        }
      } catch (emailErr) {
        console.error('Failed to send invoice request notification:', emailErr);
      }
    }

    // Create in-app notification
    try {
      await supabase.from('notifications').insert({
        detailer_id: quote.detailer_id,
        type: 'invoice_requested',
        title: 'Invoice Requested',
        message: `${quote.client_name || 'Customer'} accepted quote for ${quote.aircraft_model || quote.aircraft_type || 'detail'} — send invoice`,
        metadata: { quote_id: id },
      });
    } catch {}

    return Response.json({ success: true, status: 'accepted' });
  } catch (err) {
    console.error('Accept quote error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
