import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getUser(request) {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('auth_token')?.value;
    if (authCookie) {
      const user = await verifyToken(authCookie);
      if (user) return user;
    }
  } catch (e) {}
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return await verifyToken(authHeader.slice(7));
  }
  return null;
}

// GET - Get benchmark comparisons
export async function GET(request) {
  try {
    const user = await getUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get user's quotes for calculations
    const { data: userQuotes } = await supabase
      .from('quotes')
      .select('id, status, total_price, creation_seconds, sent_at')
      .eq('detailer_id', user.id);

    // Calculate user's metrics
    const userQuotesArr = userQuotes || [];
    const userQuotesSent = userQuotesArr.filter(q => q.sent_at).length;
    const userQuotesPaid = userQuotesArr.filter(q => ['paid', 'completed'].includes(q.status)).length;
    const userConversionRate = userQuotesSent > 0 ? Math.round((userQuotesPaid / userQuotesSent) * 100) : 0;

    const userQuotesWithTime = userQuotesArr.filter(q => q.creation_seconds);
    const userAvgQuoteTime = userQuotesWithTime.length > 0
      ? Math.round(userQuotesWithTime.reduce((sum, q) => sum + q.creation_seconds, 0) / userQuotesWithTime.length / 60)
      : null;

    const userPaidQuotes = userQuotesArr.filter(q => ['paid', 'completed'].includes(q.status));
    const userAvgTicket = userPaidQuotes.length > 0
      ? Math.round(userPaidQuotes.reduce((sum, q) => sum + (q.total_price || 0), 0) / userPaidQuotes.length)
      : 0;

    // Get aggregate stats from all detailers for benchmarks
    const { data: allQuotes } = await supabase
      .from('quotes')
      .select('status, total_price, creation_seconds, sent_at, detailer_id');

    // Calculate platform averages
    const allQuotesArr = allQuotes || [];
    const allQuotesSent = allQuotesArr.filter(q => q.sent_at).length;
    const allQuotesPaid = allQuotesArr.filter(q => ['paid', 'completed'].includes(q.status)).length;
    const avgConversionRate = allQuotesSent > 0 ? Math.round((allQuotesPaid / allQuotesSent) * 100) : 45;

    const allQuotesWithTime = allQuotesArr.filter(q => q.creation_seconds);
    const avgQuoteTime = allQuotesWithTime.length > 0
      ? Math.round(allQuotesWithTime.reduce((sum, q) => sum + q.creation_seconds, 0) / allQuotesWithTime.length / 60)
      : 8;

    const allPaidQuotes = allQuotesArr.filter(q => ['paid', 'completed'].includes(q.status));
    const avgTicket = allPaidQuotes.length > 0
      ? Math.round(allPaidQuotes.reduce((sum, q) => sum + (q.total_price || 0), 0) / allPaidQuotes.length)
      : 1200;

    // Calculate percentile rankings
    const getPercentile = (userValue, allValues, higherIsBetter = true) => {
      if (allValues.length === 0 || userValue === null) return null;
      const sorted = [...allValues].sort((a, b) => a - b);
      const position = sorted.filter(v => v < userValue).length;
      const percentile = Math.round((position / sorted.length) * 100);
      return higherIsBetter ? percentile : 100 - percentile;
    };

    // Get all detailer stats for percentile calculations
    const detailerStats = {};
    for (const q of allQuotesArr) {
      if (!detailerStats[q.detailer_id]) {
        detailerStats[q.detailer_id] = { sent: 0, paid: 0, revenue: 0, times: [] };
      }
      if (q.sent_at) detailerStats[q.detailer_id].sent++;
      if (['paid', 'completed'].includes(q.status)) {
        detailerStats[q.detailer_id].paid++;
        detailerStats[q.detailer_id].revenue += q.total_price || 0;
      }
      if (q.creation_seconds) {
        detailerStats[q.detailer_id].times.push(q.creation_seconds);
      }
    }

    const allConversionRates = Object.values(detailerStats)
      .filter(s => s.sent >= 3)
      .map(s => s.sent > 0 ? (s.paid / s.sent) * 100 : 0);

    const allAvgTickets = Object.values(detailerStats)
      .filter(s => s.paid >= 3)
      .map(s => s.paid > 0 ? s.revenue / s.paid : 0);

    const allAvgTimes = Object.values(detailerStats)
      .filter(s => s.times.length >= 3)
      .map(s => s.times.reduce((a, b) => a + b, 0) / s.times.length / 60);

    return Response.json({
      benchmarks: {
        closeRate: {
          yours: userConversionRate,
          average: avgConversionRate || 45,
          percentile: getPercentile(userConversionRate, allConversionRates, true),
          better: userConversionRate >= avgConversionRate,
          label: 'Close Rate',
          format: 'percent',
        },
        quoteSpeed: {
          yours: userAvgQuoteTime,
          average: avgQuoteTime || 8,
          percentile: getPercentile(userAvgQuoteTime, allAvgTimes, false),
          better: userAvgQuoteTime !== null && userAvgQuoteTime <= avgQuoteTime,
          label: 'Quote Speed',
          format: 'minutes',
        },
        avgTicket: {
          yours: userAvgTicket,
          average: avgTicket || 1200,
          percentile: getPercentile(userAvgTicket, allAvgTickets, true),
          better: userAvgTicket >= avgTicket,
          label: 'Avg Ticket',
          format: 'currency',
        },
      },
      sampleSize: {
        totalDetailers: Object.keys(detailerStats).length,
        totalQuotes: allQuotesArr.length,
      },
    });

  } catch (err) {
    console.error('Benchmarks error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
