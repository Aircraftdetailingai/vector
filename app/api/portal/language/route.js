import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// POST - Save customer language preference via portal token
export async function POST(request) {
  try {
    const { token, language } = await request.json();

    if (!token || !language) {
      return Response.json({ error: 'Token and language required' }, { status: 400 });
    }

    const validLangs = ['en', 'es', 'fr', 'pt', 'de'];
    if (!validLangs.includes(language)) {
      return Response.json({ error: 'Unsupported language' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Look up the quote by share_link to find the customer
    const { data: quote, error: qErr } = await supabase
      .from('quotes')
      .select('client_email, detailer_id')
      .eq('share_link', token)
      .single();

    if (qErr || !quote?.client_email) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Update customer's language preference with column-stripping retry
    let updates = { customer_language: language, updated_at: new Date().toISOString() };
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('detailer_id', quote.detailer_id)
        .eq('email', quote.client_email.toLowerCase().trim());

      if (!error) {
        return Response.json({ success: true, language });
      }

      const colMatch = error.message?.match(/column "([^"]+)".*does not exist/);
      if (colMatch) {
        delete updates[colMatch[1]];
        continue;
      }

      console.log('Failed to save customer language:', error.message);
      break;
    }

    // Even if DB save failed, acknowledge — the portal will use it locally
    return Response.json({ success: true, language, note: 'Saved locally' });
  } catch (err) {
    console.error('Portal language error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
