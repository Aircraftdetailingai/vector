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

// GET - Fetch raw hours_log entries for admin review
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
    const manufacturer = searchParams.get('manufacturer') || '';
    const hoursField = searchParams.get('hours_field') || '';
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = parseInt(searchParams.get('offset')) || 0;

    let query = supabase
      .from('hours_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (manufacturer) {
      query = query.eq('aircraft_manufacturer', manufacturer);
    }
    if (hoursField) {
      query = query.eq('hours_field', hoursField);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Failed to fetch hours logs:', error);
      return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Get detailer names
    const detailerIds = [...new Set((logs || []).map(l => l.detailer_id).filter(Boolean))];
    let detailerMap = {};

    if (detailerIds.length > 0) {
      const { data: detailers } = await supabase
        .from('detailers')
        .select('id, business_name, first_name, last_name')
        .in('id', detailerIds);

      if (detailers) {
        detailers.forEach(d => {
          detailerMap[d.id] = d.business_name || `${d.first_name || ''} ${d.last_name || ''}`.trim() || 'Unknown';
        });
      }
    }

    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      detailer_name: detailerMap[log.detailer_id] || 'Unknown',
      hours_field_label: HOURS_FIELD_LABELS[log.hours_field] || log.hours_field,
      variance_hours: parseFloat(log.actual_hours) - parseFloat(log.quoted_hours),
      variance_percent: parseFloat(log.quoted_hours) > 0
        ? Math.round(((parseFloat(log.actual_hours) - parseFloat(log.quoted_hours)) / parseFloat(log.quoted_hours)) * 1000) / 10
        : 0,
    }));

    // Get unique manufacturers for filter dropdown
    const { data: allManufacturers } = await supabase
      .from('hours_log')
      .select('aircraft_manufacturer');

    const uniqueManufacturers = [...new Set((allManufacturers || []).map(m => m.aircraft_manufacturer).filter(Boolean))].sort();

    return Response.json({
      logs: enrichedLogs,
      total: enrichedLogs.length,
      manufacturers: uniqueManufacturers,
    });
  } catch (err) {
    console.error('Admin hours log error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
