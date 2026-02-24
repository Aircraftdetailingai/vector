import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }

  const supabase = getSupabase();
  const pattern = `%${q}%`;

  // Run all three searches in parallel
  const [quotesRes, customersRes, aircraftRes] = await Promise.all([
    // Search quotes
    supabase
      .from('quotes')
      .select('id, client_name, client_email, aircraft_model, aircraft_type, total_price, status, share_link, created_at')
      .eq('detailer_id', user.id)
      .or(`client_name.ilike.${pattern},client_email.ilike.${pattern},aircraft_model.ilike.${pattern},aircraft_type.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(5),

    // Search customers
    supabase
      .from('customers')
      .select('id, name, email, phone, company_name')
      .eq('detailer_id', user.id)
      .or(`name.ilike.${pattern},email.ilike.${pattern},company_name.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(5),

    // Search aircraft
    supabase
      .from('aircraft')
      .select('id, manufacturer, model, category')
      .or(`model.ilike.${pattern},manufacturer.ilike.${pattern}`)
      .order('manufacturer', { ascending: true })
      .limit(5),
  ]);

  const results = [];

  // Format quotes
  for (const quote of quotesRes.data || []) {
    results.push({
      type: 'quote',
      id: quote.id,
      title: quote.client_name || 'Unnamed Quote',
      subtitle: `${quote.aircraft_model || quote.aircraft_type || 'Aircraft'} - $${(quote.total_price || 0).toLocaleString()}`,
      status: quote.status,
      link: '/quotes',
    });
  }

  // Format customers
  for (const c of customersRes.data || []) {
    results.push({
      type: 'customer',
      id: c.id,
      title: c.name || c.email || 'Unknown',
      subtitle: [c.company_name, c.email, c.phone].filter(Boolean).join(' · '),
      link: '/quotes',
    });
  }

  // Format aircraft
  for (const a of aircraftRes.data || []) {
    results.push({
      type: 'aircraft',
      id: a.id,
      title: `${a.manufacturer} ${a.model}`,
      subtitle: (a.category || '').replace(/_/g, ' '),
      link: '/dashboard',
    });
  }

  return Response.json({ results });
}
