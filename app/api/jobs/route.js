import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// GET - Fetch job completions for profitability analysis
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // days

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  const { data: jobs, error } = await supabase
    .from('job_completions')
    .select(`
      *,
      quotes (
        aircraft_model,
        aircraft_type,
        client_name,
        services
      )
    `)
    .eq('detailer_id', user.id)
    .gte('completed_at', startDate.toISOString())
    .order('completed_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch jobs:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), { status: 500 });
  }

  // Calculate summary stats
  const stats = {
    totalJobs: jobs.length,
    totalRevenue: jobs.reduce((sum, j) => sum + parseFloat(j.revenue || 0), 0),
    totalProfit: jobs.reduce((sum, j) => sum + parseFloat(j.profit || 0), 0),
    totalHours: jobs.reduce((sum, j) => sum + parseFloat(j.actual_hours || 0), 0),
    avgMargin: jobs.length > 0
      ? jobs.reduce((sum, j) => sum + parseFloat(j.margin_percent || 0), 0) / jobs.length
      : 0,
  };

  return new Response(JSON.stringify({ jobs, stats }), { status: 200 });
}

// POST - Record a job completion
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const { quote_id, actual_hours, labor_rate, product_cost, service_breakdown, notes } = body;

  if (!quote_id || !actual_hours) {
    return new Response(JSON.stringify({ error: 'Quote ID and actual hours are required' }), { status: 400 });
  }

  const supabase = getSupabase();

  // Get the quote to verify ownership and get revenue
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, detailer_id, total_price, status')
    .eq('id', quote_id)
    .single();

  if (quoteError || !quote) {
    return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
  }

  if (quote.detailer_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  // Get detailer's default labor rate if not provided
  const { data: detailer } = await supabase
    .from('detailers')
    .select('default_labor_rate')
    .eq('id', user.id)
    .single();

  const effectiveLaborRate = labor_rate || detailer?.default_labor_rate || 25;

  // Insert job completion
  const { data: job, error } = await supabase
    .from('job_completions')
    .insert({
      quote_id,
      detailer_id: user.id,
      revenue: quote.total_price,
      actual_hours: parseFloat(actual_hours),
      labor_rate: parseFloat(effectiveLaborRate),
      product_cost: parseFloat(product_cost) || 0,
      service_breakdown: service_breakdown || [],
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record job:', error);
    return new Response(JSON.stringify({ error: 'Failed to record job completion' }), { status: 500 });
  }

  // Update quote status to completed
  await supabase
    .from('quotes')
    .update({ status: 'completed' })
    .eq('id', quote_id);

  return new Response(JSON.stringify({ job }), { status: 201 });
}
