import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getUser(request) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_token')?.value;
    if (authCookie) {
      const user = await verifyToken(authCookie);
      if (user) return user;
    }
  } catch (e) {}
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }
  return null;
}

const EQUIPMENT_CATEGORIES = [
  'polisher',
  'extractor',
  'pressure_washer',
  'vacuum',
  'steamer',
  'lighting',
  'lift',
  'generator',
  'compressor',
  'other',
];

const CATEGORY_LABELS = {
  polisher: 'Polisher',
  extractor: 'Extractor',
  pressure_washer: 'Pressure Washer',
  vacuum: 'Vacuum',
  steamer: 'Steamer',
  lighting: 'Lighting',
  lift: 'Lift/Ladder',
  generator: 'Generator',
  compressor: 'Compressor',
  other: 'Other',
};

// GET - Get user's equipment with ROI calculations
export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data: equipment } = await supabase
    .from('equipment')
    .select('*')
    .eq('detailer_id', user.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  // Calculate ROI for each piece of equipment
  const equipmentWithROI = (equipment || []).map(item => {
    const costPerJob = item.jobs_completed > 0
      ? (item.purchase_price || 0) / item.jobs_completed
      : null;

    return {
      ...item,
      cost_per_job: costPerJob ? Math.round(costPerJob * 100) / 100 : null,
    };
  });

  // Calculate totals
  const totalInvestment = (equipment || []).reduce((sum, e) => sum + (e.purchase_price || 0), 0);
  const totalJobs = (equipment || []).reduce((sum, e) => sum + (e.jobs_completed || 0), 0);

  return Response.json({
    equipment: equipmentWithROI,
    categories: EQUIPMENT_CATEGORIES,
    categoryLabels: CATEGORY_LABELS,
    stats: {
      totalInvestment,
      totalJobs,
      avgCostPerJob: totalJobs > 0 ? Math.round((totalInvestment / totalJobs) * 100) / 100 : null,
    },
  });
}

// POST - Add new equipment
export async function POST(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const {
    name,
    category,
    purchasePrice,
    purchaseDate,
    maintenanceNotes,
  } = body;

  if (!name) {
    return Response.json({ error: 'Equipment name required' }, { status: 400 });
  }

  const { data: item, error } = await supabase
    .from('equipment')
    .insert({
      detailer_id: user.id,
      name,
      category: category || 'other',
      purchase_price: parseFloat(purchasePrice) || 0,
      purchase_date: purchaseDate || null,
      maintenance_notes: maintenanceNotes || '',
      jobs_completed: 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ equipment: item });
}

// PUT - Update equipment
export async function PUT(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const {
    id,
    name,
    category,
    purchasePrice,
    purchaseDate,
    jobsCompleted,
    maintenanceNotes,
    status,
  } = body;

  if (!id) {
    return Response.json({ error: 'Equipment ID required' }, { status: 400 });
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (purchasePrice !== undefined) updates.purchase_price = parseFloat(purchasePrice) || 0;
  if (purchaseDate !== undefined) updates.purchase_date = purchaseDate;
  if (jobsCompleted !== undefined) updates.jobs_completed = parseInt(jobsCompleted) || 0;
  if (maintenanceNotes !== undefined) updates.maintenance_notes = maintenanceNotes;
  if (status !== undefined) updates.status = status;

  const { data: item, error } = await supabase
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .eq('detailer_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ equipment: item });
}

// PATCH - Increment job count for equipment
export async function PATCH(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { id, increment = 1 } = body;

  if (!id) {
    return Response.json({ error: 'Equipment ID required' }, { status: 400 });
  }

  // Get current count
  const { data: current } = await supabase
    .from('equipment')
    .select('jobs_completed')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (!current) {
    return Response.json({ error: 'Equipment not found' }, { status: 404 });
  }

  const { data: item, error } = await supabase
    .from('equipment')
    .update({
      jobs_completed: (current.jobs_completed || 0) + increment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('detailer_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ equipment: item });
}

// DELETE - Remove equipment
export async function DELETE(request) {
  const user = await getUser(request);
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
    return Response.json({ error: 'Equipment ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id)
    .eq('detailer_id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
