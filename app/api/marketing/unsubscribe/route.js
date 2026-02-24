import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Unsubscribe via link click (no auth needed - public endpoint)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const detailerId = searchParams.get('detailer');
    const email = searchParams.get('email');

    const supabase = getSupabase();
    if (!supabase) {
      return new Response(unsubscribePage('error', 'Service unavailable'), {
        headers: { 'Content-Type': 'text/html' },
        status: 500,
      });
    }

    // Verify the campaign token exists
    if (token) {
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('id, detailer_id')
        .eq('unsubscribe_token', token)
        .single();

      if (!campaign) {
        return new Response(unsubscribePage('invalid', ''), {
          headers: { 'Content-Type': 'text/html' },
        });
      }
    }

    // Show unsubscribe form
    return new Response(unsubscribePage('form', '', detailerId, token), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('Unsubscribe GET error:', err);
    return new Response(unsubscribePage('error', 'Something went wrong'), {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
}

// POST - Process unsubscribe
export async function POST(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return new Response(unsubscribePage('error', 'Service unavailable'), {
        headers: { 'Content-Type': 'text/html' },
        status: 500,
      });
    }

    const formData = await request.formData();
    const email = formData.get('email')?.toString().toLowerCase().trim();
    const detailerId = formData.get('detailer_id');
    const token = formData.get('token');

    if (!email) {
      return new Response(unsubscribePage('error', 'Email is required'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Resolve detailer_id from token if needed
    let resolvedDetailerId = detailerId;
    if (token && !resolvedDetailerId) {
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('detailer_id')
        .eq('unsubscribe_token', token)
        .single();
      if (campaign) resolvedDetailerId = campaign.detailer_id;
    }

    if (!resolvedDetailerId) {
      return new Response(unsubscribePage('error', 'Invalid unsubscribe link'), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Insert unsubscribe record (ignore duplicates)
    const { error } = await supabase
      .from('marketing_unsubscribes')
      .upsert(
        { detailer_id: resolvedDetailerId, email },
        { onConflict: 'detailer_id,email', ignoreDuplicates: true }
      );

    if (error) {
      console.error('Unsubscribe error:', error);
      // Try simple insert if upsert fails
      await supabase
        .from('marketing_unsubscribes')
        .insert({ detailer_id: resolvedDetailerId, email })
        .select();
    }

    return new Response(unsubscribePage('success', email), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('Unsubscribe POST error:', err);
    return new Response(unsubscribePage('error', 'Something went wrong'), {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
}

function unsubscribePage(status, detail, detailerId, token) {
  const bodyContent = {
    form: `
      <h1 style="color:#1e3a5f;margin:0 0 8px;">Unsubscribe</h1>
      <p style="color:#6b7280;margin:0 0 24px;">Enter your email to unsubscribe from marketing emails.</p>
      <form method="POST" action="/api/marketing/unsubscribe">
        <input type="hidden" name="detailer_id" value="${detailerId || ''}">
        <input type="hidden" name="token" value="${token || ''}">
        <input type="email" name="email" required placeholder="your@email.com"
          style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;margin-bottom:12px;box-sizing:border-box;">
        <button type="submit"
          style="width:100%;padding:12px;background:#1e3a5f;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">
          Unsubscribe
        </button>
      </form>
    `,
    success: `
      <div style="text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">&#10003;</div>
        <h1 style="color:#059669;margin:0 0 8px;">Unsubscribed</h1>
        <p style="color:#6b7280;">You have been removed from marketing emails.</p>
        <p style="color:#9ca3af;font-size:14px;margin-top:16px;">You will still receive transactional emails (quotes, invoices, payment confirmations).</p>
      </div>
    `,
    invalid: `
      <div style="text-align:center;">
        <h1 style="color:#d97706;margin:0 0 8px;">Invalid Link</h1>
        <p style="color:#6b7280;">This unsubscribe link is not valid or has expired.</p>
      </div>
    `,
    error: `
      <div style="text-align:center;">
        <h1 style="color:#dc2626;margin:0 0 8px;">Error</h1>
        <p style="color:#6b7280;">${detail || 'Something went wrong. Please try again.'}</p>
      </div>
    `,
  };

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribe - Vector</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:40px 20px;">
  <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    ${bodyContent[status] || bodyContent.error}
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:20px;">Powered by Vector - Aircraft Detailing Software</p>
</body></html>`;
}
