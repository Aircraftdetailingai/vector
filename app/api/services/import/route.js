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

// POST - Import multiple services at once
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
    const { services } = body;

    if (!services || !Array.isArray(services) || services.length === 0) {
      return Response.json({ error: 'No services provided' }, { status: 400 });
    }

    // Prepare services for insertion
    const toInsert = services.map(svc => ({
      detailer_id: user.id,
      name: svc.name,
      description: svc.description || '',
      service_type: svc.service_type || 'exterior',
      hourly_rate: parseFloat(svc.hourly_rate) || 0,
    }));

    const { data: insertedServices, error } = await supabase
      .from('services')
      .insert(toInsert)
      .select();

    if (error) {
      console.error('Failed to import services:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ services: insertedServices || [] }, { status: 201 });

  } catch (err) {
    console.error('Services import error:', err);
    return Response.json({ error: 'Failed to import services' }, { status: 500 });
  }
}
