import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - Fetch notifications for current user
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '30', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const typeFilter = url.searchParams.get('type');

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('detailer_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  if (typeFilter) {
    const types = typeFilter.split(',').map(t => t.trim()).filter(Boolean);
    if (types.length > 0) {
      query = query.in('type', types);
    }
  }

  const { data: notifications, error, count: total } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Get unread count (always unfiltered)
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('detailer_id', user.id)
    .eq('read', false);

  return Response.json({
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    total: total || 0,
    hasMore: (offset + limit) < (total || 0),
  });
}

// PATCH - Mark notifications as read
export async function PATCH(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const body = await request.json();
  const { id, markAll } = body;

  if (markAll) {
    // Mark all as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('detailer_id', user.id)
      .eq('read', false);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ success: true });
  }

  if (id) {
    // Mark single notification as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('detailer_id', user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Provide id or markAll' }, { status: 400 });
}

// DELETE - Delete all read notifications
export async function DELETE(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('detailer_id', user.id)
    .eq('read', true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
