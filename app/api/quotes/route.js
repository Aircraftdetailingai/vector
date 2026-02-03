import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 100;
    const sortField = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('quotes')
      .select('id, aircraft_type, aircraft_model, customer_name, customer_email, total_price, status, created_at, valid_until, share_link')
      .eq('detailer_id', user.id)
      .order(sortField, { ascending: order === 'asc' })
      .limit(limit);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Quotes fetch error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Transform data to include aircraft_name for display
    const quotes = (data || []).map(q => ({
      ...q,
      aircraft_name: q.aircraft_model
        ? `${q.aircraft_type || ''} ${q.aircraft_model}`.trim()
        : q.aircraft_type || 'Unknown Aircraft',
    }));

    return Response.json({ quotes });

  } catch (err) {
    console.error('Quotes API error:', err);
    return Response.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      aircraft_type,
      aircraft_model,
      aircraft_id,
      surface_area_sqft,
      services,
      base_hours,
      total_hours,
      total_price,
      notes,
      line_items,
      labor_total,
      products_total,
      efficiency_factor,
      access_difficulty,
      job_location,
      minimum_fee_applied,
      calculated_price
    } = body;

    if (!aircraft_type || !services) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const shareLink = nanoid(8);
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .insert({
        detailer_id: user.id,
        aircraft_type,
        aircraft_model,
        aircraft_id: aircraft_id || null,
        surface_area_sqft: surface_area_sqft || null,
        services,
        base_hours: base_hours || 0,
        total_hours,
        total_price,
        notes,
        share_link: shareLink,
        valid_until: validUntil,
        line_items: line_items || [],
        labor_total: labor_total || 0,
        products_total: products_total || 0,
        efficiency_factor: efficiency_factor || 1.0,
        access_difficulty: access_difficulty || 1.0,
        job_location: job_location || null,
        minimum_fee_applied: minimum_fee_applied || false,
        calculated_price: calculated_price || total_price,
      })
      .select()
      .single();

    if (error) {
      console.error('Quote create error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });

  } catch (err) {
    console.error('Quote POST error:', err);
    return Response.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
