import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const SUPPORT_INBOX = 'brett@shinyjets.com';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  );
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const subject = (body?.subject || '').toString().trim();
  const message = (body?.message || '').toString().trim();
  if (!subject || !message) {
    return Response.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const detailerId = user.detailer_id || user.id;
  const supabase = getSupabase();
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id, email, name, company, phone, plan')
    .eq('id', detailerId)
    .maybeSingle();

  const senderName = detailer?.name || user.name || detailer?.company || 'Unknown';
  const senderEmail = detailer?.email || user.email || '';
  const senderCompany = detailer?.company || '—';
  const senderPhone = detailer?.phone || '';
  const plan = detailer?.plan || 'free';

  const emailSubject = `Support request from ${senderCompany}: ${subject}`;

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1f2937;max-width:640px;margin:24px auto;padding:16px;">
  <h2 style="margin:0 0 12px">Support request</h2>
  <table style="border-collapse:collapse;font-size:13px;margin-bottom:16px">
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280">From</td><td><strong>${escapeHtml(senderName)}</strong> &lt;${escapeHtml(senderEmail)}&gt;</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Company</td><td>${escapeHtml(senderCompany)}</td></tr>
    ${senderPhone ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Phone</td><td>${escapeHtml(senderPhone)}</td></tr>` : ''}
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Plan</td><td>${escapeHtml(plan)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Detailer ID</td><td style="font-family:monospace;font-size:12px;color:#6b7280">${escapeHtml(detailerId)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Subject</td><td><strong>${escapeHtml(subject)}</strong></td></tr>
  </table>
  <div style="padding:16px;background:#f9fafb;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHtml(message)}</div>
</body></html>`.trim();

  const text = [
    'Support request',
    '',
    `From:      ${senderName} <${senderEmail}>`,
    `Company:   ${senderCompany}`,
    senderPhone ? `Phone:     ${senderPhone}` : null,
    `Plan:      ${plan}`,
    `Detailer:  ${detailerId}`,
    `Subject:   ${subject}`,
    '',
    '--- message ---',
    message,
  ].filter(Boolean).join('\n');

  try {
    await sendEmail({
      to: SUPPORT_INBOX,
      subject: emailSubject,
      html,
      text,
      replyTo: senderEmail || undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[support] sendEmail failed:', err?.message || err);
    return Response.json({ error: 'Failed to send support request' }, { status: 500 });
  }
}
