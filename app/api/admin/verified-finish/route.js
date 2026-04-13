import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['brett@vectorav.ai', 'admin@vectorav.ai', 'brett@shinyjets.com'];

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

async function requireAdmin(request) {
  const user = await getAuthUser(request);
  if (!user || !ADMIN_EMAILS.includes(user.email)) return null;
  return user;
}

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('detailers')
    .select('id, company, email, verified_finish_status, verified_finish_applied_at, verified_finish_approved_at, verified_finish_expires_at, verified_finish_notes')
    .in('verified_finish_status', ['pending', 'approved', 'expired'])
    .order('verified_finish_applied_at', { ascending: false });

  if (error) {
    console.error('[admin/verified-finish] Query error:', error);
    return Response.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  return Response.json({ applications: data || [] });
}

export async function POST(request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { detailer_id, action } = await request.json();

  if (!detailer_id || !['approve', 'deny'].includes(action)) {
    return Response.json({ error: 'Invalid request. Provide detailer_id and action (approve|deny).' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Get detailer
  const { data: detailer, error: fetchErr } = await supabase
    .from('detailers')
    .select('id, company, email, verified_finish_status')
    .eq('id', detailer_id)
    .single();

  if (fetchErr || !detailer) {
    return Response.json({ error: 'Detailer not found' }, { status: 404 });
  }

  if (action === 'approve') {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const { error: updateErr } = await supabase
      .from('detailers')
      .update({
        verified_finish_status: 'approved',
        verified_finish: true,
        verified_finish_approved_at: now.toISOString(),
        verified_finish_expires_at: expiresAt.toISOString(),
      })
      .eq('id', detailer_id);

    if (updateErr) {
      console.error('[admin/verified-finish] Approve error:', updateErr);
      return Response.json({ error: 'Failed to approve' }, { status: 500 });
    }

    try {
      await sendEmail({
        to: detailer.email,
        subject: 'Verified Finish Application Approved',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C9A84C;">Congratulations!</h2>
            <p>Your Verified Finish application has been <strong>approved</strong>.</p>
            <p>Your certification is valid until <strong>${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
            <p>The Verified Finish badge will now appear on your directory listing and customer-facing documents.</p>
            <p style="margin-top: 24px;">
              <a href="https://app.vectorav.ai/settings/directory" style="background: #C9A84C; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Your Listing</a>
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[admin/verified-finish] Email error:', e);
    }

    return Response.json({ success: true, action: 'approved' });
  }

  if (action === 'deny') {
    const { error: updateErr } = await supabase
      .from('detailers')
      .update({
        verified_finish_status: 'none',
        verified_finish: false,
      })
      .eq('id', detailer_id);

    if (updateErr) {
      console.error('[admin/verified-finish] Deny error:', updateErr);
      return Response.json({ error: 'Failed to deny' }, { status: 500 });
    }

    try {
      await sendEmail({
        to: detailer.email,
        subject: 'Verified Finish Application Update',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verified Finish Application</h2>
            <p>Thank you for your interest in the Verified Finish program.</p>
            <p>Unfortunately, your application was not approved at this time. Please review the requirements and feel free to reapply when ready.</p>
            <p>If you have questions, reply to this email.</p>
          </div>
        `,
        replyTo: 'brett@vectorav.ai',
      });
    } catch (e) {
      console.error('[admin/verified-finish] Email error:', e);
    }

    return Response.json({ success: true, action: 'denied' });
  }
}
