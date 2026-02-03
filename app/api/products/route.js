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

const PRODUCT_CATEGORIES = [
  'compound',
  'polish',
  'wax',
  'ceramic',
  'cleaner',
  'degreaser',
  'brightwork',
  'leather',
  'towels',
  'applicators',
  'other',
];

const UNITS = ['oz', 'ml', 'gallon', 'liter', 'each', 'pack', 'bottle'];

// GET - Get user's products with inventory status
export async function GET(request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('detailer_id', user.id)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  // Calculate inventory alerts
  const lowStock = (products || []).filter(p =>
    p.reorder_threshold > 0 && p.current_quantity <= p.reorder_threshold
  );

  // Calculate inventory value
  const totalValue = (products || []).reduce((sum, p) =>
    sum + ((p.current_quantity || 0) * (p.cost_per_unit || 0)), 0
  );

  return Response.json({
    products: products || [],
    categories: PRODUCT_CATEGORIES,
    units: UNITS,
    lowStock,
    totalValue,
  });
}

// POST - Add a new product
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
    unit,
    costPerUnit,
    currentQuantity,
    reorderThreshold,
    supplier,
    notes
  } = body;

  if (!name) {
    return Response.json({ error: 'Product name required' }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      detailer_id: user.id,
      name,
      category: category || 'other',
      unit: unit || 'oz',
      cost_per_unit: parseFloat(costPerUnit) || 0,
      current_quantity: parseFloat(currentQuantity) || 0,
      reorder_threshold: parseFloat(reorderThreshold) || 0,
      supplier: supplier || '',
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
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const {
    id,
    name,
    category,
    unit,
    costPerUnit,
    currentQuantity,
    reorderThreshold,
    supplier,
    notes
  } = body;

  if (!id) {
    return Response.json({ error: 'Product ID required' }, { status: 400 });
  }

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (unit !== undefined) updates.unit = unit;
  if (costPerUnit !== undefined) updates.cost_per_unit = parseFloat(costPerUnit) || 0;
  if (currentQuantity !== undefined) updates.current_quantity = parseFloat(currentQuantity) || 0;
  if (reorderThreshold !== undefined) updates.reorder_threshold = parseFloat(reorderThreshold) || 0;
  if (supplier !== undefined) updates.supplier = supplier;
  if (notes !== undefined) updates.notes = notes;

  const { data: product, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .eq('detailer_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ product });
}

// PATCH - Adjust inventory (add or subtract quantity)
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
  const { id, adjustment, reason } = body;

  if (!id || adjustment === undefined) {
    return Response.json({ error: 'Product ID and adjustment required' }, { status: 400 });
  }

  // Get current quantity
  const { data: product } = await supabase
    .from('products')
    .select('current_quantity')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 });
  }

  const newQuantity = Math.max(0, (product.current_quantity || 0) + parseFloat(adjustment));

  const { data: updated, error } = await supabase
    .from('products')
    .update({
      current_quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('detailer_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ product: updated });
}

// DELETE - Remove a product
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
