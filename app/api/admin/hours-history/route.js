import { getAuthUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'brett@aircraftdetailing.ai',
  'admin@aircraftdetailing.ai',
  'brett@shinyjets.com',
];

const HOURS_FIELD_LABELS = {
  ext_wash_hours: 'Exterior Wash',
  int_detail_hours: 'Interior Detail',
  leather_hours: 'Leather Treatment',
  carpet_hours: 'Carpet Cleaning',
  wax_hours: 'Wax Application',
  polish_hours: 'Polish',
  ceramic_hours: 'Ceramic Coating',
  brightwork_hours: 'Brightwork',
  decon_hours: 'Decontamination',
  spray_ceramic_hours: 'Spray Ceramic',
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function isAdmin(request) {
  const user = await getAuthUser(request);
  if (!user) return null;
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase())) return null;
  return user;
}

// GET - Fetch update history
export async function GET(request) {
  try {
    const user = await isAdmin(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    // Query default_hours_updates with structured columns
    const { data: updates, error } = await supabase
      .from('default_hours_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch history:', error);
      return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Get aircraft names for display
    const aircraftIds = [...new Set((updates || []).map(u => u.aircraft_id).filter(Boolean))];
    let aircraftMap = {};
    if (aircraftIds.length > 0) {
      const { data: aircraftList } = await supabase
        .from('aircraft')
        .select('id, manufacturer, model')
        .in('id', aircraftIds);
      if (aircraftList) {
        aircraftList.forEach(a => { aircraftMap[a.id] = a; });
      }
    }

    const history = (updates || []).map(u => {
      const aircraft = aircraftMap[u.aircraft_id];
      return {
        id: u.id,
        aircraft_id: u.aircraft_id,
        aircraft_name: aircraft ? `${aircraft.manufacturer} ${aircraft.model}` : 'Unknown',
        service_type: u.service_type,
        hours_field_label: HOURS_FIELD_LABELS[u.service_type] || u.service_type,
        old_value: u.old_value,
        new_value: u.new_value,
        reason: u.reason || '',
        updated_by: u.updated_by || '',
        created_at: u.created_at,
      };
    });

    return Response.json({ history, total: history.length });
  } catch (err) {
    console.error('Hours history error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
