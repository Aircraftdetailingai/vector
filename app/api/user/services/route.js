import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.error('Missing Supabase env vars:', { hasUrl: !!url, hasKey: !!key });
    return null;
  }
  return createClient(url, key);
}

const STANDARD_SERVICES = [
  { service_key: 'ext_wash', service_name: 'Exterior Wash', category: 'exterior', default_hours: 2, hourly_rate: 75 },
  { service_key: 'int_detail', service_name: 'Interior Detail', category: 'interior', default_hours: 2, hourly_rate: 75 },
  { service_key: 'leather', service_name: 'Leather Conditioning', category: 'leather', default_hours: 1, hourly_rate: 85 },
  { service_key: 'carpet', service_name: 'Carpet Shampoo', category: 'carpet', default_hours: 1, hourly_rate: 75 },
  { service_key: 'wax', service_name: 'Wax & Seal', category: 'exterior', default_hours: 3, hourly_rate: 75 },
];

export async function GET(request) {
  console.log('=== GET /api/user/services ===');

  try {
    const user = await getAuthUser(request);
    console.log('User:', user?.id || 'none');

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Try to get services - table might not exist
    const { data: services, error } = await supabase
      .from('detailer_services')
      .select('*')
      .eq('detailer_id', user.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Services query error:', error.message, error.code);
      // If table doesn't exist, return empty array with message
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return Response.json({
          services: STANDARD_SERVICES,
          message: 'Using default services - table not created yet'
        }, { status: 200 });
      }
      return Response.json({ error: 'Database error: ' + error.message }, { status: 500 });
    }

    // If no services, return defaults
    if (!services || services.length === 0) {
      return Response.json({ services: STANDARD_SERVICES }, { status: 200 });
    }

    return Response.json({ services }, { status: 200 });

  } catch (err) {
    console.error('Unhandled error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  console.log('=== POST /api/user/services ===');

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
    const { service_name, category, hourly_rate, default_hours } = body;

    if (!service_name || !hourly_rate) {
      return Response.json({ error: 'Service name and hourly rate required' }, { status: 400 });
    }

    const service_key = `custom_${Date.now()}`;

    const { data: service, error } = await supabase
      .from('detailer_services')
      .insert({
        detailer_id: user.id,
        service_key,
        service_name,
        category: category || 'general',
        hourly_rate: parseFloat(hourly_rate),
        default_hours: parseFloat(default_hours) || 1,
        is_custom: true,
        enabled: true,
        display_order: 99,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return Response.json({ error: 'Failed to add service: ' + error.message }, { status: 500 });
    }

    return Response.json({ service }, { status: 201 });

  } catch (err) {
    console.error('Unhandled error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
