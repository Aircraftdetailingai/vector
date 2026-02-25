import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { logActivity, ACTIVITY } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - List notes for a customer
export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  const { data: notes, error } = await supabase
    .from('customer_notes')
    .select('*')
    .eq('customer_id', id)
    .eq('detailer_id', user.id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return Response.json({ notes: [] });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notes: notes || [] });
}

// POST - Create a new note
export async function POST(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { content, pinned } = body;

  if (!content || !content.trim()) {
    return Response.json({ error: 'Note content is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get customer email for activity logging
  const { data: customer } = await supabase
    .from('customers')
    .select('email')
    .eq('id', id)
    .eq('detailer_id', user.id)
    .single();

  const row = {
    customer_id: id,
    detailer_id: user.id,
    content: content.trim(),
    pinned: pinned || false,
  };

  const { data: note, error } = await supabase
    .from('customer_notes')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('Note create error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Log activity
  if (customer?.email) {
    logActivity({
      detailer_id: user.id,
      customer_email: customer.email,
      activity_type: ACTIVITY.NOTE_ADDED,
      summary: `Note added: ${content.trim().slice(0, 80)}${content.trim().length > 80 ? '...' : ''}`,
      details: { note_id: note.id, pinned: pinned || false },
    });
  }

  return Response.json({ note }, { status: 201 });
}

// PATCH - Update a note (pin/unpin or edit content)
export async function PATCH(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { note_id, content, pinned } = body;

  if (!note_id) {
    return Response.json({ error: 'note_id required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const updates = { updated_at: new Date().toISOString() };
  if (content !== undefined) updates.content = content.trim();
  if (pinned !== undefined) updates.pinned = pinned;

  const { data: note, error } = await supabase
    .from('customer_notes')
    .update(updates)
    .eq('id', note_id)
    .eq('detailer_id', user.id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ note });
}

// DELETE - Remove a note
export async function DELETE(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get('note_id');

  if (!noteId) {
    return Response.json({ error: 'note_id required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('customer_notes')
    .delete()
    .eq('id', noteId)
    .eq('detailer_id', user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
