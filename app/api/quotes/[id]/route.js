import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

export async function GET(request, { params }) {
  const supabase = getSupabase();
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { id } = params;
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }
  if (data.detailer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function PUT(request, { params }) {
  const supabase = getSupabase();
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { id } = params;
  const body = await request.json();
  const { data: quote, error: fetchError } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (fetchError || !quote) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }
  if (quote.detailer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  const { data, error } = await supabase.from('quotes').update(body).eq('id', id).select().single();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify(data), { status: 200 });
}

export async function DELETE(request, { params }) {
  const supabase = getSupabase();
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { id } = params;
  const { data: quote, error: fetchError } = await supabase.from('quotes').select('detailer_id').eq('id', id).single();
  if (fetchError || !quote) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }
  if (quote.detailer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
