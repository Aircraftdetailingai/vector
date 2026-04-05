import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_QUESTIONS } from '@/lib/default-intake-flow';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// GET — fetch detailer's intake flow (or default)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const detailerId = searchParams.get('detailer_id');

  // Public access for quote request form (by detailer_id)
  if (detailerId) {
    const supabase = getSupabase();
    const { data } = await supabase.from('intake_flows').select('questions').eq('detailer_id', detailerId).single();
    return Response.json({ questions: data?.questions || DEFAULT_QUESTIONS });
  }

  // Authenticated access for settings
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data } = await supabase.from('intake_flows').select('questions, updated_at').eq('detailer_id', user.id).single();

  return Response.json({
    questions: data?.questions || DEFAULT_QUESTIONS,
    isDefault: !data,
    updatedAt: data?.updated_at || null,
  });
}

// POST — save detailer's intake flow
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { questions } = await request.json();
  if (!Array.isArray(questions)) return Response.json({ error: 'Invalid questions' }, { status: 400 });

  const supabase = getSupabase();

  // Check plan for feature gating
  const { data: detailer } = await supabase.from('detailers').select('plan').eq('id', user.id).single();
  const plan = detailer?.plan || 'free';

  // Validate against plan limits
  if (plan === 'free') {
    // Free: can only reorder, not add/edit
    if (questions.length > DEFAULT_QUESTIONS.length) {
      return Response.json({ error: 'Free plan can only reorder default questions. Upgrade to add custom questions.' }, { status: 403 });
    }
  }

  const { error } = await supabase.from('intake_flows').upsert({
    detailer_id: user.id,
    questions,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'detailer_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}

// DELETE — reset to default
export async function DELETE(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  await supabase.from('intake_flows').delete().eq('detailer_id', user.id);

  return Response.json({ success: true, questions: DEFAULT_QUESTIONS });
}
