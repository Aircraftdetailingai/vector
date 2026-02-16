import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Search customers for this detailer
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit')) || 20;

    // Try to fetch from customers table
    let customers = [];
    try {
      let query = supabase
        .from('customers')
        .select('id, name, email, phone, company_name, notes, created_at, updated_at')
        .eq('detailer_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (q) {
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,company_name.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) {
        // Table doesn't exist yet - fall back to quotes-based customer list
        if (error.code === '42P01') {
          customers = await getCustomersFromQuotes(supabase, user.id, q, limit);
        } else {
          console.error('Customers fetch error:', error);
          return Response.json({ error: error.message }, { status: 500 });
        }
      } else {
        customers = data || [];
      }
    } catch (e) {
      console.error('Customers query failed:', e);
      customers = await getCustomersFromQuotes(supabase, user.id, q, limit);
    }

    // Enrich with quote history
    const enriched = await Promise.all(customers.map(async (c) => {
      try {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id, status, created_at')
          .eq('detailer_id', user.id)
          .eq('customer_email', c.email)
          .order('created_at', { ascending: false });

        const allQuotes = quotes || [];
        const completedQuotes = allQuotes.filter(q => q.status === 'completed' || q.status === 'paid');

        return {
          ...c,
          quote_count: allQuotes.length,
          last_service_date: completedQuotes.length > 0 ? completedQuotes[0].created_at : null,
        };
      } catch {
        return { ...c, quote_count: 0, last_service_date: null };
      }
    }));

    return Response.json({ customers: enriched });

  } catch (err) {
    console.error('Customers API error:', err);
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// Fallback: build customer list from existing quotes
async function getCustomersFromQuotes(supabase, detailerId, q, limit) {
  try {
    let query = supabase
      .from('quotes')
      .select('customer_name, customer_email')
      .eq('detailer_id', detailerId)
      .not('customer_email', 'is', null);

    if (q) {
      query = query.or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%`);
    }

    const { data } = await query;
    if (!data) return [];

    // Deduplicate by email
    const seen = new Map();
    for (const row of data) {
      if (row.customer_email && !seen.has(row.customer_email.toLowerCase())) {
        seen.set(row.customer_email.toLowerCase(), {
          id: null,
          name: row.customer_name || '',
          email: row.customer_email,
          phone: null,
          company_name: null,
          notes: null,
        });
      }
    }

    return Array.from(seen.values()).slice(0, limit);
  } catch {
    return [];
  }
}

// POST - Create or upsert a customer
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { name, email, phone, company_name, notes } = body;

    if (!name || !email) {
      return Response.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Check if customer already exists
    try {
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('detailer_id', user.id)
        .eq('email', email.toLowerCase().trim())
        .single();

      if (existing) {
        // Update existing customer
        const updates = { updated_at: new Date().toISOString() };
        if (name) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (company_name !== undefined) updates.company_name = company_name;
        if (notes !== undefined) updates.notes = notes;

        const { data: updated } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        return Response.json({ customer: updated || existing, created: false });
      }
    } catch {
      // Table might not exist or no match - continue to create
    }

    // Create new customer
    const row = {
      detailer_id: user.id,
      name,
      email: email.toLowerCase().trim(),
      phone: phone || null,
      company_name: company_name || null,
      notes: notes || '',
    };

    // Column-stripping retry pattern
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabase
        .from('customers')
        .insert(row)
        .select()
        .single();

      if (!error) {
        return Response.json({ customer: data, created: true }, { status: 201 });
      }

      const colMatch = error.message?.match(/column "([^"]+)" of relation "customers" does not exist/);
      if (colMatch) {
        delete row[colMatch[1]];
        continue;
      }

      // Table doesn't exist
      if (error.code === '42P01') {
        console.error('Customers table does not exist. Run the migration.');
        return Response.json({ error: 'Customers table not set up yet', customer: null, created: false }, { status: 200 });
      }

      console.error('Customer create error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ error: 'Failed to create customer' }, { status: 500 });

  } catch (err) {
    console.error('Customers POST error:', err);
    return Response.json({ error: 'Failed to save customer' }, { status: 500 });
  }
}
