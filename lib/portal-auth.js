import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// Resolve customer from portal share_link token
// Returns { customer, quote, detailerId } or null
export async function resolvePortalCustomer(token) {
  if (!token) return null;

  const supabase = getSupabase();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, detailer_id, client_name, client_email, client_phone, customer_email, customer_name, customer_company, share_link')
    .eq('share_link', token)
    .single();

  if (error || !quote) return null;

  const email = (quote.customer_email || quote.client_email || '').toLowerCase().trim();
  if (!email) return null;

  // Find existing customer
  let selectCols = 'id, name, email, company_name';
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select(selectCols)
      .eq('detailer_id', quote.detailer_id)
      .eq('email', email)
      .maybeSingle();

    if (!custErr && customer) {
      return { customer, quote, detailerId: quote.detailer_id };
    }

    if (custErr && custErr.message?.includes('column')) {
      selectCols = selectCols.split(', ').filter(c => !custErr.message.includes(c)).join(', ');
      continue;
    }

    // No customer found — create one
    const { data: newCustomer, error: insertErr } = await supabase
      .from('customers')
      .insert({
        detailer_id: quote.detailer_id,
        email,
        name: quote.client_name || quote.customer_name || '',
        phone: quote.client_phone || '',
        company_name: quote.customer_company || '',
      })
      .select('id, name, email')
      .single();

    if (newCustomer) {
      return { customer: newCustomer, quote, detailerId: quote.detailer_id };
    }

    // Insert may fail if customer was created concurrently — retry lookup
    if (insertErr) {
      const { data: retryCustomer } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('detailer_id', quote.detailer_id)
        .eq('email', email)
        .maybeSingle();
      if (retryCustomer) {
        return { customer: retryCustomer, quote, detailerId: quote.detailer_id };
      }
    }

    return null;
  }

  return null;
}
