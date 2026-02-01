import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Get change order by approval token (public)
export async function GET(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Get change order with quote info
    const { data: changeOrder, error } = await supabase
      .from('change_orders')
      .select(`
        *,
        quotes (
          id,
          aircraft_type,
          aircraft_model,
          tail_number,
          client_name,
          client_email,
          total_price,
          line_items,
          detailers (
            id,
            company_name,
            email
          )
        )
      `)
      .eq('approval_token', token)
      .single();

    if (error || !changeOrder) {
      return Response.json({ error: 'Change order not found' }, { status: 404 });
    }

    return Response.json({
      changeOrder: {
        id: changeOrder.id,
        services: changeOrder.services,
        amount: changeOrder.amount,
        reason: changeOrder.reason,
        status: changeOrder.status,
        created_at: changeOrder.created_at,
      },
      quote: changeOrder.quotes,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
