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

// GET - Get all services for a detailer
export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('detailer_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch services:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ services: services || [] });

  } catch (err) {
    console.error('Services GET error:', err);
    return Response.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

// POST - Create a new service
export async function POST(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { name, description, hourly_rate } = body;

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        detailer_id: user.id,
        name,
        description: description || '',
        hourly_rate: parseFloat(hourly_rate) || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create service:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ service }, { status: 201 });

  } catch (err) {
    console.error('Services POST error:', err);
    return Response.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
