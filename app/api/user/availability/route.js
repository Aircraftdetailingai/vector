import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('detailers')
    .select('availability')
    .eq('id', user.id)
    .single();

  if (error) return Response.json({ availability: null });
  return Response.json({ availability: data?.availability || null });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { availability } = body;

  // Validate shape
  if (availability !== null) {
    const { weeklySchedule, blockedDates, leadTimeDays, maxAdvanceDays } = availability || {};
    if (!weeklySchedule || typeof weeklySchedule !== 'object') {
      return Response.json({ error: 'weeklySchedule is required' }, { status: 400 });
    }
    for (const day of ['0', '1', '2', '3', '4', '5', '6']) {
      const val = weeklySchedule[day];
      if (val !== null && val !== undefined) {
        if (!val.start || !val.end) {
          return Response.json({ error: `Day ${day} must have start and end times` }, { status: 400 });
        }
        if (!/^\d{2}:\d{2}$/.test(val.start) || !/^\d{2}:\d{2}$/.test(val.end)) {
          return Response.json({ error: `Day ${day} times must be HH:MM format` }, { status: 400 });
        }
      }
    }
    if (blockedDates && !Array.isArray(blockedDates)) {
      return Response.json({ error: 'blockedDates must be an array' }, { status: 400 });
    }
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('detailers')
    .update({ availability })
    .eq('id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
