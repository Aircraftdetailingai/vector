import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@vectorav.ai';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, message } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    await resend.emails.send({
      from: 'Vector Support <noreply@vectorav.ai>',
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject: `Support Request: ${subject}`,
      html: `
        <h3>Support Request from ${user.email}</h3>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>User ID: ${user.id}</small></p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send support request' }, { status: 500 });
  }
}
