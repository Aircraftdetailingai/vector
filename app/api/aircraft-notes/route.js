import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  );
}

// GET — list standing notes for a tail number
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tail_number = searchParams.get('tail_number');
  if (!tail_number) return Response.json({ error: 'tail_number required' }, { status: 400 });

  const detailerId = user.detailer_id || user.id;
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('aircraft_notes')
    .select('*')
    .eq('detailer_id', detailerId)
    .eq('tail_number', tail_number.toUpperCase())
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ notes: data || [] });
}

// POST — add a standing note
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const detailerId = user.detailer_id || user.id;
  const body = await request.json();
  const { tail_number, note } = body;

  if (!tail_number || !note?.trim()) {
    return Response.json({ error: 'tail_number and note required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('aircraft_notes')
    .insert({
      detailer_id: detailerId,
      tail_number: tail_number.toUpperCase(),
      note: note.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ note: data });
}

// DELETE — remove a standing note
export async function DELETE(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const detailerId = user.detailer_id || user.id;
  const supabase = getSupabase();

  const { error } = await supabase
    .from('aircraft_notes')
    .delete()
    .eq('id', id)
    .eq('detailer_id', detailerId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
