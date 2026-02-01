import { createClient } from '@supabase/supabase-js';
import { getVendorUser } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const PRODUCT_CATEGORIES = [
  'polish',
  'compound',
  'ceramic',
  'wax',
  'sealant',
  'cleaner',
  'degreaser',
  'glass',
  'leather',
  'interior',
  'microfiber',
  'pads',
  'tools',
  'machines',
  'accessories',
  'kits',
];

// GET - Get vendor's products
export async function GET(request) {
  try {
    const vendor = await getVendorUser(request);
    if (!vendor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: products, error } = await supabase
      .from('vendor_products')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return Response.json({ products: [], categories: PRODUCT_CATEGORIES, message: 'Table not created' });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      products: products || [],
      categories: PRODUCT_CATEGORIES,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Add new product
export async function POST(request) {
  try {
    const vendor = await getVendorUser(request);
    if (!vendor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      price,
      sku,
      inventory_count,
      unlimited_inventory,
      images,
      shipping_type,
    } = body;

    if (!name || !price) {
      return Response.json({ error: 'Name and price required' }, { status: 400 });
    }

    const { data: product, error } = await supabase
      .from('vendor_products')
      .insert({
        vendor_id: vendor.id,
        name,
        description: description || '',
        category: category || 'accessories',
        price: parseFloat(price),
        sku: sku || '',
        inventory_count: unlimited_inventory ? null : (parseInt(inventory_count) || 0),
        unlimited_inventory: unlimited_inventory || false,
        images: images || [],
        shipping_type: shipping_type || 'vendor', // 'vendor' or 'vector'
        status: 'pending', // Requires approval
        views: 0,
        clicks: 0,
        sales: 0,
      })
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ product }, { status: 201 });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update product
export async function PUT(request) {
  try {
    const vendor = await getVendorUser(request);
    if (!vendor) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Build update object
    const updateData = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category) updateData.category = updates.category;
    if (updates.price) updateData.price = parseFloat(updates.price);
    if (updates.sku !== undefined) updateData.sku = updates.sku;
    if (updates.inventory_count !== undefined) updateData.inventory_count = parseInt(updates.inventory_count);
    if (updates.unlimited_inventory !== undefined) updateData.unlimited_inventory = updates.unlimited_inventory;
    if (updates.images) updateData.images = updates.images;
    if (updates.shipping_type) updateData.shipping_type = updates.shipping_type;

    const { data: product, error } = await supabase
      .from('vendor_products')
      .update(updateData)
      .eq('id', id)
      .eq('vendor_id', vendor.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ product });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(request) {
  try {
    const vendor = await getVendorUser(request);
    if (!vendor) {
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
      .from('vendor_products')
      .delete()
      .eq('id', id)
      .eq('vendor_id', vendor.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
