import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars:', {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// Service categories
const SERVICE_CATEGORIES = ['exterior', 'interior', 'carpet', 'leather', 'engine', 'specialty', 'general', 'other'];

// Standard services template - used to seed new detailers
// db_field maps to actual columns in the aircraft table: exterior_hours, interior_hours
const STANDARD_SERVICES = [
  { service_key: 'ext_wash', service_name: 'Exterior Wash', category: 'exterior', db_field: 'exterior_hours', default_hours: 2, hourly_rate: 75 },
  { service_key: 'int_detail', service_name: 'Interior Detail', category: 'interior', db_field: 'interior_hours', default_hours: 2, hourly_rate: 75 },
  { service_key: 'leather', service_name: 'Leather Conditioning', category: 'leather', db_field: null, default_hours: 1, hourly_rate: 85 },
  { service_key: 'carpet', service_name: 'Carpet Shampoo', category: 'carpet', db_field: null, default_hours: 1, hourly_rate: 75 },
  { service_key: 'wax', service_name: 'Wax & Seal', category: 'exterior', db_field: null, default_hours: 3, hourly_rate: 75 },
  { service_key: 'polish', service_name: 'Polish & Compound', category: 'exterior', db_field: null, default_hours: 4, hourly_rate: 85 },
  { service_key: 'ceramic', service_name: 'Ceramic Coating', category: 'exterior', db_field: null, default_hours: 6, hourly_rate: 125 },
  { service_key: 'brightwork', service_name: 'Brightwork Polish', category: 'specialty', db_field: null, default_hours: 1, hourly_rate: 95 },
];

// GET - Fetch detailer's services
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();

  // Get detailer's services
  let { data: services, error } = await supabase
    .from('detailer_services')
    .select('*')
    .eq('detailer_id', user.id)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Failed to fetch services:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch services' }), { status: 500 });
  }

  // If no services exist, seed with standard services
  if (!services || services.length === 0) {
    const servicesToInsert = STANDARD_SERVICES.map((svc, idx) => ({
      detailer_id: user.id,
      ...svc,
      enabled: true,
      is_custom: false,
      display_order: idx,
    }));

    const { data: newServices, error: insertError } = await supabase
      .from('detailer_services')
      .insert(servicesToInsert)
      .select();

    if (insertError) {
      console.error('Failed to seed services:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to initialize services' }), { status: 500 });
    }

    services = newServices;
  }

  return new Response(JSON.stringify({ services }), { status: 200 });
}

// POST - Add a new service
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const { service_name, category, hourly_rate, default_hours, description, requires_return_trip } = body;

  if (!service_name || !hourly_rate) {
    return new Response(JSON.stringify({ error: 'Service name and hourly rate are required' }), { status: 400 });
  }

  // Validate category
  const validCategory = SERVICE_CATEGORIES.includes(category) ? category : 'general';

  const supabase = getSupabase();

  // Generate a unique key for custom service
  const service_key = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get max display order
  const { data: maxOrder } = await supabase
    .from('detailer_services')
    .select('display_order')
    .eq('detailer_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single();

  const display_order = (maxOrder?.display_order || 0) + 1;

  const { data: service, error } = await supabase
    .from('detailer_services')
    .insert({
      detailer_id: user.id,
      service_key,
      service_name,
      category: validCategory,
      hourly_rate: parseFloat(hourly_rate),
      default_hours: parseFloat(default_hours) || 1,
      description: description || null,
      requires_return_trip: requires_return_trip || false,
      is_custom: true,
      db_field: null, // Custom services don't map to aircraft database
      enabled: true,
      display_order,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to add service:', error);
    return new Response(JSON.stringify({ error: 'Failed to add service' }), { status: 500 });
  }

  return new Response(JSON.stringify({ service }), { status: 201 });
}
