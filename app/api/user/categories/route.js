import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Default categories with suggested services
const DEFAULT_CATEGORIES = [
  {
    name: 'Exterior',
    key: 'exterior',
    order: 1,
    services: [
      { name: 'Exterior Wash', hours: 2, rate: 75 },
      { name: 'Decontamination', hours: 1.5, rate: 85 },
      { name: 'Polish', hours: 4, rate: 95 },
      { name: 'Wax & Seal', hours: 2, rate: 85 },
      { name: 'Ceramic Coating', hours: 6, rate: 125 },
    ],
  },
  {
    name: 'Interior',
    key: 'interior',
    order: 2,
    services: [
      { name: 'Vacuum & Wipe Down', hours: 1.5, rate: 75 },
      { name: 'Full Interior Detail', hours: 3, rate: 85 },
      { name: 'Leather Conditioning', hours: 1, rate: 85 },
      { name: 'Carpet Shampoo', hours: 1.5, rate: 80 },
      { name: 'Windows (Interior)', hours: 0.5, rate: 75 },
    ],
  },
  {
    name: 'Brightwork',
    key: 'brightwork',
    order: 3,
    services: [
      { name: 'Brightwork Polish', hours: 3, rate: 95 },
      { name: 'Brightwork Protection', hours: 1, rate: 85 },
    ],
  },
  {
    name: 'Packages',
    key: 'packages',
    order: 4,
    services: [
      { name: 'Bronze Package', hours: 3, rate: 75 },
      { name: 'Silver Package', hours: 5, rate: 80 },
      { name: 'Gold Package', hours: 8, rate: 85 },
      { name: 'Platinum Package', hours: 12, rate: 90 },
    ],
  },
];

// GET - Get user's categories
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

    // Get categories
    const { data: categories, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('detailer_id', user.id)
      .order('display_order', { ascending: true });

    if (error) {
      // If table doesn't exist, return empty with defaults available
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return Response.json({
          categories: [],
          defaults: DEFAULT_CATEGORIES,
          tableNotCreated: true
        });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Return actual categories (empty array if none), plus defaults for importing
    return Response.json({
      categories: categories || [],
      defaults: DEFAULT_CATEGORIES
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create a new category
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

    const { name } = await request.json();
    if (!name) {
      return Response.json({ error: 'Category name required' }, { status: 400 });
    }

    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // Get max order
    const { data: existing } = await supabase
      .from('service_categories')
      .select('display_order')
      .eq('detailer_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { data: category, error } = await supabase
      .from('service_categories')
      .insert({
        detailer_id: user.id,
        name,
        key,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ category }, { status: 201 });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update a category
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

    const { id, name, display_order } = await request.json();
    if (!id) {
      return Response.json({ error: 'Category ID required' }, { status: 400 });
    }

    const updates = {};
    if (name) updates.name = name;
    if (display_order !== undefined) updates.display_order = display_order;

    const { data: category, error } = await supabase
      .from('service_categories')
      .update(updates)
      .eq('id', id)
      .eq('detailer_id', user.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ category });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Delete a category
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
      return Response.json({ error: 'Category ID required' }, { status: 400 });
    }

    // Delete category (services will need to be reassigned or deleted separately)
    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', id)
      .eq('detailer_id', user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
