import { createClient } from '@supabase/supabase-js';
import { getVendorUser } from '@/lib/vendorAuth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Get vendor settings
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

    const { data: vendorData, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendor.id)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Remove password
    const { password: _, ...settings } = vendorData;

    return Response.json({ settings });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update vendor settings
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
    const {
      company_name,
      contact_name,
      website,
      logo,
      description,
      address,
      phone,
      payout_email,
      payout_method,
    } = body;

    const updates = {};
    if (company_name) updates.company_name = company_name;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (website !== undefined) updates.website = website;
    if (logo !== undefined) updates.logo = logo;
    if (description !== undefined) updates.description = description;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (payout_email !== undefined) updates.payout_email = payout_email;
    if (payout_method !== undefined) updates.payout_method = payout_method;

    const { data: vendorData, error } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', vendor.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const { password: _, ...settings } = vendorData;

    return Response.json({ settings });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Request tier upgrade
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

    const { tier } = await request.json();

    if (!['basic', 'pro', 'partner'].includes(tier)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // For now, just update directly (in production, this would create a request)
    const { data: vendorData, error } = await supabase
      .from('vendors')
      .update({ commission_tier: tier })
      .eq('id', vendor.id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      tier: vendorData.commission_tier,
      message: `Upgraded to ${tier} tier`,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
