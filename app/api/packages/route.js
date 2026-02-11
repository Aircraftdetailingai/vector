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

// GET - Get all packages for a detailer
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

    const { data: packages, error } = await supabase
      .from('packages')
      .select('*')
      .eq('detailer_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch packages:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ packages: packages || [] });

  } catch (err) {
    console.error('Packages GET error:', err);
    return Response.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

// POST - Create a new package
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
    const { name, description, price, service_ids } = body;

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: pkg, error } = await supabase
      .from('packages')
      .insert({
        detailer_id: user.id,
        name,
        description: description || '',
        price: parseFloat(price) || 0,
        service_ids: service_ids || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create package:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ package: pkg }, { status: 201 });

  } catch (err) {
    console.error('Packages POST error:', err);
    return Response.json({ error: 'Failed to create package' }, { status: 500 });
  }
}
