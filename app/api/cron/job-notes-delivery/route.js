import { createClient } from '@supabase/supabase-js';
import { sendCrewNotes } from '@/app/api/jobs/[id]/send-notes/route';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  );
}

function verifyCron(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') === process.env.CRON_SECRET) return true;
  return false;
}

export async function GET(request) {
  return handleCron(request);
}

export async function POST(request) {
  return handleCron(request);
}

async function handleCron(request) {
  if (!verifyCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Tomorrow's date
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  let processed = 0;

  // 1. Jobs with note_delivery = '1h_before', scheduled today, within 1 hour
  const { data: oneHourJobs } = await supabase
    .from('jobs')
    .select('id, scheduled_date, scheduled_time')
    .eq('note_delivery', '1h_before')
    .eq('scheduled_date', today)
    .is('notes_sent_at', null);

  if (oneHourJobs && oneHourJobs.length > 0) {
    for (const job of oneHourJobs) {
      // Check if scheduled_time is within the next hour
      if (job.scheduled_time) {
        const [hours, minutes] = job.scheduled_time.split(':').map(Number);
        const jobTime = new Date(now);
        jobTime.setHours(hours, minutes, 0, 0);

        const diffMs = jobTime - now;
        // Send if job is within the next 60 minutes (and not already past)
        if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
          const result = await sendCrewNotes(supabase, job.id);
          if (result.success) processed++;
        }
      } else {
        // No time set, send it since it's today
        const result = await sendCrewNotes(supabase, job.id);
        if (result.success) processed++;
      }
    }
  }

  // 2. Jobs with note_delivery = 'day_before', scheduled tomorrow
  const { data: dayBeforeJobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('note_delivery', 'day_before')
    .eq('scheduled_date', tomorrowStr)
    .is('notes_sent_at', null);

  if (dayBeforeJobs && dayBeforeJobs.length > 0) {
    // Only send at/after 6pm (18:00) local — cron runs hourly
    const currentHour = now.getHours();
    if (currentHour >= 18) {
      for (const job of dayBeforeJobs) {
        const result = await sendCrewNotes(supabase, job.id);
        if (result.success) processed++;
      }
    }
  }

  return Response.json({ success: true, processed });
}
