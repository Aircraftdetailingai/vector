import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function generateToken(length = 48) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { email } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }
    const { data, error } = await supabase
      .from('detailers')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'No user found' }), { status: 404 });
    }
    const token = generateToken(48);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await supabase
      .from('detailers')
      .update({ reset_token: token, reset_token_expires: expires.toISOString() })
      .eq('id', data.id);
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || ''}/reset-password?token=${token}`;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'no-reply@aircraftdetailing.ai',
          to: email,
          subject: 'Reset your password',
          text: `Click the following link to reset your password: ${resetLink}`
        })
      });
    } catch (e) {
      // ignore email errors for now
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
