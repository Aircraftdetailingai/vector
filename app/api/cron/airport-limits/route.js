import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { airportLimitWarningTemplate, airportLimitEnforcedTemplate } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

function isCronAuthed(request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return token === process.env.CRON_SECRET;
}

// Vercel cron fires GET; manual triggers via curl can use either. Both paths
// route through the same handler so the cron + ops debugging line up.
export async function GET(request) { return run(request); }
export async function POST(request) { return run(request); }

async function run(request) {
  if (!isCronAuthed(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const summary = { checked: 0, warned: 0, enforced: 0, cleared: 0, skipped_no_plan: 0, errors: [] };

  // Pull plan_limits once into a map. Avoids a per-detailer round trip and
  // means a missing plan row surfaces as "skip + log" rather than blocking
  // the whole cron run.
  const { data: limitRows, error: limitsErr } = await supabase
    .from('plan_limits')
    .select('plan, airport_limit');
  if (limitsErr) {
    console.error('[airport-limits-cron] plan_limits read failed:', limitsErr.message);
    return Response.json({ error: 'plan_limits read failed' }, { status: 500 });
  }
  const limitByPlan = Object.fromEntries((limitRows || []).map(r => [r.plan, r.airport_limit]));

  const { data: detailers, error: dErr } = await supabase
    .from('detailers')
    .select('id, plan, email, company');
  if (dErr) {
    console.error('[airport-limits-cron] detailers read failed:', dErr.message);
    return Response.json({ error: 'detailers read failed' }, { status: 500 });
  }

  for (const detailer of detailers || []) {
    summary.checked += 1;
    const plan = detailer.plan;
    if (!plan || typeof limitByPlan[plan] !== 'number') {
      console.warn('[airport-limits-cron] skipping detailer', detailer.id, '— plan not in plan_limits:', plan);
      summary.skipped_no_plan += 1;
      continue;
    }
    const limit = limitByPlan[plan];

    const { count: activeCount } = await supabase
      .from('detailer_locations')
      .select('id', { count: 'exact', head: true })
      .eq('detailer_id', detailer.id)
      .eq('active', true);

    const current = activeCount || 0;
    const over = current - limit;

    const { data: existingWarning } = await supabase
      .from('airport_limit_warnings')
      .select('*')
      .eq('detailer_id', detailer.id)
      .maybeSingle();

    if (over <= 0) {
      if (existingWarning) {
        // Trimmed down or upgraded — wipe the warning state so a future
        // over-limit event starts a fresh 30-day clock.
        await supabase.from('airport_limit_warnings').delete().eq('detailer_id', detailer.id);
        summary.cleared += 1;
        console.log('[airport-limits-cron] cleared warning for', detailer.id, '— now under limit');
      }
      continue;
    }

    if (!existingWarning) {
      const nowIso = new Date().toISOString();
      const deadlineIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: insertErr } = await supabase.from('airport_limit_warnings').insert({
        detailer_id: detailer.id,
        plan_at_warning: plan,
        airport_count_at_warning: current,
        airport_limit_at_warning: limit,
        notice_sent_at: nowIso,
        deadline_at: deadlineIso,
      });
      if (insertErr) {
        console.error('[airport-limits-cron] insert warning failed for', detailer.id, insertErr.message);
        summary.errors.push({ detailer_id: detailer.id, step: 'insert_warning', error: insertErr.message });
        continue;
      }

      if (detailer.email) {
        const tmpl = airportLimitWarningTemplate({
          company: detailer.company || 'there',
          plan,
          current,
          limit,
          deadlineIso,
        });
        try {
          await sendEmail({
            to: detailer.email,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
          });
        } catch (err) {
          console.error('[airport-limits-cron] warning email send failed for', detailer.id, err.message);
          summary.errors.push({ detailer_id: detailer.id, step: 'warning_email', error: err.message });
        }
      }
      summary.warned += 1;
      console.log('[airport-limits-cron] warned', detailer.id, 'plan', plan, 'count', current, 'limit', limit, 'deadline', deadlineIso);
      continue;
    }

    // Existing warning row — check whether the deadline has passed and we
    // haven't yet enforced. enforced_at is the single-write idempotency
    // guard; once set, we never re-enforce on the same warning row.
    if (existingWarning.enforced_at) continue;
    if (new Date(existingWarning.deadline_at).getTime() > Date.now()) continue;

    // Deactivate the newest excess rows, keep the oldest `limit` active.
    // Tie-break by id so the result is deterministic if created_at matches.
    const { data: orderedActive } = await supabase
      .from('detailer_locations')
      .select('id, name, airport_icao, created_at')
      .eq('detailer_id', detailer.id)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    const toDeactivate = (orderedActive || []).slice(limit);
    if (toDeactivate.length === 0) continue;

    const { error: deacErr } = await supabase
      .from('detailer_locations')
      .update({ active: false })
      .in('id', toDeactivate.map(r => r.id));
    if (deacErr) {
      console.error('[airport-limits-cron] deactivation failed for', detailer.id, deacErr.message);
      summary.errors.push({ detailer_id: detailer.id, step: 'deactivate', error: deacErr.message });
      continue;
    }

    await supabase
      .from('airport_limit_warnings')
      .update({ enforced_at: new Date().toISOString(), airports_deactivated: toDeactivate.length })
      .eq('detailer_id', detailer.id);

    if (detailer.email) {
      const tmpl = airportLimitEnforcedTemplate({
        company: detailer.company || 'there',
        plan,
        limit,
        deactivated: toDeactivate.map(r => ({ name: r.name, icao: r.airport_icao })),
      });
      try {
        await sendEmail({
          to: detailer.email,
          subject: tmpl.subject,
          html: tmpl.html,
          text: tmpl.text,
        });
      } catch (err) {
        console.error('[airport-limits-cron] enforced email send failed for', detailer.id, err.message);
        summary.errors.push({ detailer_id: detailer.id, step: 'enforced_email', error: err.message });
      }
    }
    summary.enforced += 1;
    console.log('[airport-limits-cron] enforced', detailer.id, 'deactivated', toDeactivate.length);
  }

  console.log('[airport-limits-cron] run complete', JSON.stringify(summary));
  return Response.json({ ok: true, ...summary });
}
