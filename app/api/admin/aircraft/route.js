import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - List all aircraft (admin only)
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
    const category = searchParams.get('category');
    const manufacturer = searchParams.get('manufacturer');

    let query = supabase
      .from('aircraft')
      .select('*')
      .order('manufacturer')
      .order('model');

    if (category) {
      query = query.eq('category', category);
    }
    if (manufacturer) {
      query = query.eq('manufacturer', manufacturer);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ aircraft: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Add new aircraft (admin only)
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

    // Handle bulk import
    if (Array.isArray(body.aircraft)) {
      const aircraftToInsert = body.aircraft.map(a => ({
        manufacturer: a.manufacturer,
        model: a.model,
        category: a.category || 'piston',
        seats: a.seats || 0,
        wingspan_ft: a.wingspan_ft || 0,
        length_ft: a.length_ft || 0,
        height_ft: a.height_ft || 0,
        surface_area_sqft: a.surface_area_sqft || 0,
        exterior_hours: a.exterior_hours || 0,
        interior_hours: a.interior_hours || 0,
      }));

      const { data, error } = await supabase
        .from('aircraft')
        .upsert(aircraftToInsert, {
          onConflict: 'manufacturer,model',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ success: true, count: data?.length || 0 });
    }

    // Single aircraft insert
    const {
      manufacturer,
      model,
      category,
      seats,
      wingspan_ft,
      length_ft,
      height_ft,
      surface_area_sqft,
      exterior_hours,
      interior_hours,
    } = body;

    if (!manufacturer || !model) {
      return Response.json({ error: 'Manufacturer and model required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aircraft')
      .insert({
        manufacturer,
        model,
        category: category || 'piston',
        seats: seats || 0,
        wingspan_ft: wingspan_ft || 0,
        length_ft: length_ft || 0,
        height_ft: height_ft || 0,
        surface_area_sqft: surface_area_sqft || 0,
        exterior_hours: exterior_hours || 0,
        interior_hours: interior_hours || 0,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, aircraft: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update aircraft
export async function PUT(request) {
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
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: 'Aircraft ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aircraft')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, aircraft: data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Remove aircraft
export async function DELETE(request) {
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
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Aircraft ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('aircraft')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
