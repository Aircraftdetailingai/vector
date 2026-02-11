import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const JWT_SECRET = process.env.JWT_SECRET || 'customer-portal-secret-key';

function getCustomerFromToken(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'customer') return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET - Get customer dashboard data
export async function GET(request) {
  try {
    const customer = getCustomerFromToken(request);
    if (!customer) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview';

    // Get all quotes for this customer
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        *,
        detailers (id, company_name, email, phone, logo)
      `)
      .ilike('customer_email', customer.email)
      .order('created_at', { ascending: false });

    if (quotesError) {
      return Response.json({ error: quotesError.message }, { status: 500 });
    }

    if (view === 'quotes') {
      return Response.json({ quotes: quotes || [] });
    }

    // Categorize quotes
    const activeQuotes = quotes?.filter(q =>
      ['draft', 'sent', 'viewed'].includes(q.status)
    ) || [];

    const paidQuotes = quotes?.filter(q =>
      ['paid', 'scheduled', 'in_progress'].includes(q.status)
    ) || [];

    const completedQuotes = quotes?.filter(q =>
      ['completed'].includes(q.status)
    ) || [];

    // Get upcoming appointments (paid/scheduled jobs)
    const upcomingJobs = quotes?.filter(q =>
      ['paid', 'scheduled'].includes(q.status) && q.scheduled_date
    ).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date)) || [];

    // Get messages
    const { data: messages } = await supabase
      .from('customer_messages')
      .select('*')
      .eq('customer_email', customer.email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(20);

    // Get invoices/receipts (completed payments)
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .in('quote_id', quotes?.map(q => q.id) || [])
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false });

    // Get job media for completed jobs
    const completedJobIds = completedQuotes.map(q => q.id);
    let jobMedia = [];
    if (completedJobIds.length > 0) {
      const { data: media } = await supabase
        .from('job_media')
        .select('*')
        .in('quote_id', completedJobIds)
        .order('created_at', { ascending: true });
      jobMedia = media || [];
    }

    // Attach media to completed jobs
    const completedJobsWithMedia = completedQuotes.map(job => ({
      ...job,
      media: jobMedia.filter(m => m.quote_id === job.id),
    }));

    return Response.json({
      customer: {
        email: customer.email,
        name: customer.name,
      },
      stats: {
        totalQuotes: quotes?.length || 0,
        activeQuotes: activeQuotes.length,
        completedJobs: completedQuotes.length,
        upcomingAppointments: upcomingJobs.length,
      },
      activeQuotes,
      upcomingJobs,
      completedJobs: completedJobsWithMedia,
      recentMessages: messages || [],
      receipts: payments || [],
    });

  } catch (err) {
    console.error('Customer dashboard error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
