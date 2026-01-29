import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function getUser(request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_token')?.value;
  if (authCookie) {
    const user = await verifyToken(authCookie);
    if (user) return user;
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }
  return null;
}

const PRODUCT_CATEGORIES = [
  'heavy_cut',
  'medium_polish',
  'finish_polish',
  'wax',
  'ceramic',
  'cleaner',
  'degreaser',
  'brightwork',
  'leather',
  'other',
];

// GET - Get user's products
export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('detailer_id', user.id)
    .order('category', { ascending: true });

  return Response.json({
    products: products || [],
    categories: PRODUCT_CATEGORIES,
  });
}

// POST - Add a new product
export async function POST(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { name, category, costPerOz, notes } = await request.json();

  if (!name) {
    return Response.json({ error: 'Product name required' }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      detailer_id: user.id,
      name,
      category: category || 'other',
      cost_per_oz: costPerOz || 0,
      notes: notes || '',
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ product });
}

// PUT - Update a product
export async function PUT(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { id, name, category, costPerOz, notes } = await request.json();

  if (!id) {
    return Response.json({ error: 'Product ID required' }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from('products')
    .update({
      name,
      category,
      cost_per_oz: costPerOz,
      notes,
    })
    .eq('id', id)
    .eq('detailer_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ product });
}

// DELETE - Remove a product
export async function DELETE(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return Response.json({ error: 'Product ID required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('detailer_id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
