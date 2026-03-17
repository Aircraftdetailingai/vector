import { getSupabase, resolvePortalCustomer } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

// GET - List fleet aircraft for this customer
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const resolved = await resolvePortalCustomer(token);
  if (!resolved) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: fleet, error } = await supabase
    .from('customer_fleet')
    .select('*')
    .eq('customer_id', resolved.customer.id)
    .eq('detailer_id', resolved.detailerId)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: 'Failed to fetch fleet' }, { status: 500 });
  }

  return Response.json({ fleet: fleet || [] });
}

// POST - Add aircraft to fleet
export async function POST(request) {
  const { token, tail_number, make, model, home_airport, nickname } = await request.json();

  const resolved = await resolvePortalCustomer(token);
  if (!resolved) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!tail_number) {
    return Response.json({ error: 'Tail number is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('customer_fleet')
    .insert({
      customer_id: resolved.customer.id,
      detailer_id: resolved.detailerId,
      tail_number: tail_number.toUpperCase().trim(),
      make: make || null,
      model: model || null,
      home_airport: home_airport ? home_airport.toUpperCase().trim() : null,
      nickname: nickname || null,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: 'Failed to add aircraft' }, { status: 500 });
  }

  return Response.json({ aircraft: data });
}

// PUT - Update fleet aircraft
export async function PUT(request) {
  const { token, id, tail_number, make, model, home_airport, nickname } = await request.json();

  const resolved = await resolvePortalCustomer(token);
  if (!resolved) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return Response.json({ error: 'Aircraft ID is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const updates = { updated_at: new Date().toISOString() };
  if (tail_number !== undefined) updates.tail_number = tail_number.toUpperCase().trim();
  if (make !== undefined) updates.make = make || null;
  if (model !== undefined) updates.model = model || null;
  if (home_airport !== undefined) updates.home_airport = home_airport ? home_airport.toUpperCase().trim() : null;
  if (nickname !== undefined) updates.nickname = nickname || null;

  const { data, error } = await supabase
    .from('customer_fleet')
    .update(updates)
    .eq('id', id)
    .eq('customer_id', resolved.customer.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: 'Failed to update aircraft' }, { status: 500 });
  }

  return Response.json({ aircraft: data });
}

// DELETE - Remove fleet aircraft
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const id = searchParams.get('id');

  const resolved = await resolvePortalCustomer(token);
  if (!resolved) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!id) {
    return Response.json({ error: 'Aircraft ID is required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('customer_fleet')
    .delete()
    .eq('id', id)
    .eq('customer_id', resolved.customer.id);

  if (error) {
    return Response.json({ error: 'Failed to delete aircraft' }, { status: 500 });
  }

  return Response.json({ success: true });
}
