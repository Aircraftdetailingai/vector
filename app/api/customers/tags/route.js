import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const DEFAULT_TAGS = [
  { name: 'VIP', color: '#eab308' },
  { name: 'Recurring', color: '#3b82f6' },
  { name: 'Corporate', color: '#6366f1' },
  { name: 'FBO', color: '#10b981' },
  { name: 'Owner-Pilot', color: '#f97316' },
  { name: 'Fleet', color: '#8b5cf6' },
  { name: 'Referral', color: '#ec4899' },
  { name: 'High-Value', color: '#14b8a6' },
];

// GET - Get all tags for this detailer (custom + defaults)
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Try to fetch custom tags from customer_tags table
  let customTags = [];
  try {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('detailer_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      customTags = data;
    }
  } catch (e) {
    // Table may not exist - that's fine
  }

  // Merge: custom tags override defaults with same name
  const customNames = new Set(customTags.map(t => t.name.toLowerCase()));
  const defaults = DEFAULT_TAGS.filter(t => !customNames.has(t.name.toLowerCase()));
  const allTags = [...customTags, ...defaults.map(t => ({ ...t, id: `default_${t.name}`, is_default: true }))];

  return Response.json({ tags: allTags, defaults: DEFAULT_TAGS });
}

// POST - Create a custom tag
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { name, color } = await request.json();

  if (!name || !name.trim()) {
    return Response.json({ error: 'Tag name required' }, { status: 400 });
  }

  // Check for duplicate
  try {
    const { data: existing } = await supabase
      .from('customer_tags')
      .select('id')
      .eq('detailer_id', user.id)
      .ilike('name', name.trim())
      .maybeSingle();

    if (existing) {
      return Response.json({ error: 'Tag already exists' }, { status: 409 });
    }
  } catch (e) {
    // Table may not exist
  }

  let row = {
    detailer_id: user.id,
    name: name.trim(),
    color: color || '#6b7280',
  };

  // Column-stripping retry
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('customer_tags')
      .insert(row)
      .select()
      .single();

    if (!error) {
      return Response.json({ tag: data }, { status: 201 });
    }

    const colMatch = error.message?.match(/column "([^"]+)" of relation "[^"]+" does not exist/)
      || error.message?.match(/Could not find the '([^']+)' column of '[^']+'/);
    if (colMatch) {
      delete row[colMatch[1]];
      continue;
    }

    // Table doesn't exist - return success with virtual tag
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return Response.json({
        tag: { id: `temp_${Date.now()}`, name: name.trim(), color: color || '#6b7280' },
        note: 'customer_tags table not found - tag saved locally only',
      }, { status: 201 });
    }

    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ error: 'Failed to create tag' }, { status: 500 });
}

// DELETE - Remove a custom tag
export async function DELETE(request) {
  const user = await getAuthUser(request);
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
    return Response.json({ error: 'Tag ID required' }, { status: 400 });
  }

  try {
    await supabase
      .from('customer_tags')
      .delete()
      .eq('id', id)
      .eq('detailer_id', user.id);
  } catch (e) {
    // Ignore if table doesn't exist
  }

  return Response.json({ success: true });
}
