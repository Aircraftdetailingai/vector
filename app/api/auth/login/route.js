import { createClient } from '@supabase/supabase-js';
import { comparePassword, createToken } from '../../../../lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
    }
    const { data, error } = await supabase
      .from('detailers')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
    }
    const valid = await comparePassword(password, data.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401 });
    }
    const token = await createToken({ id: data.id, email: data.email });
    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      company: data.company,
      plan: data.plan,
      status: data.status,
      rates: data.rates || {},
      notification_settings: data.notification_settings || {},
      price_reminder_months: data.price_reminder_months || 6,
    };
    return new Response(
      JSON.stringify({ token, user, must_change_password: data.must_change_password }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
