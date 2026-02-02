import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// Get user from either cookie or Authorization header
async function getUser(request) {
  // Try cookie first (browser requests)
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_token')?.value;
    if (authCookie) {
      const user = await verifyToken(authCookie);
      if (user) return user;
    }
  } catch (e) {
    // cookies() might fail in some contexts
  }

  // Try Authorization header (API requests)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }

  return null;
}

// PUT - Update a service
export async function PUT(request, { params }) {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  const body = await request.json();
  const { service_name, category, hourly_rate, default_hours, description, requires_return_trip, enabled } = body;

  const supabase = getSupabase();

  // Valid categories
  const SERVICE_CATEGORIES = ['exterior', 'interior', 'carpet', 'leather', 'engine', 'specialty', 'general', 'other'];

  // Verify ownership
  const { data: existing } = await supabase
    .from('detailer_services')
    .select('id')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Service not found' }), { status: 404 });
  }

  // Build update object
  const updates = { updated_at: new Date().toISOString() };
  if (service_name !== undefined) updates.service_name = service_name;
  if (category !== undefined && SERVICE_CATEGORIES.includes(category)) updates.category = category;
  if (hourly_rate !== undefined) updates.hourly_rate = parseFloat(hourly_rate);
  if (default_hours !== undefined) updates.default_hours = parseFloat(default_hours);
  if (description !== undefined) updates.description = description;
  if (requires_return_trip !== undefined) updates.requires_return_trip = requires_return_trip;
  if (enabled !== undefined) updates.enabled = enabled;

  const { data: service, error } = await supabase
    .from('detailer_services')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update service:', error);
    return new Response(JSON.stringify({ error: 'Failed to update service' }), { status: 500 });
  }

  return new Response(JSON.stringify({ service }), { status: 200 });
}

// DELETE - Remove a custom service
export async function DELETE(request, { params }) {
  const user = await getUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
  const supabase = getSupabase();

  // Verify ownership and that it's a custom service
  const { data: existing } = await supabase
    .from('detailer_services')
    .select('id, is_custom')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Service not found' }), { status: 404 });
  }

  // Only allow deleting custom services, standard ones can be disabled
  if (!existing.is_custom) {
    return new Response(JSON.stringify({ error: 'Cannot delete standard services. Disable them instead.' }), { status: 400 });
  }

  const { error } = await supabase
    .from('detailer_services')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete service:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete service' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
