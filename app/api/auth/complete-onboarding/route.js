import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../../../../lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { userId, newPassword, company, phone, rates, priceReminderMonths } = await request.json();
    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ error: 'userId and newPassword are required' }), { status: 400 });
    }
    const hashedPassword = await hashPassword(newPassword);
    const updatePayload = {
      password_hash: hashedPassword,
      must_change_password: false,
    };
    if (company !== undefined) updatePayload.company = company;
    if (phone !== undefined) updatePayload.phone = phone;
    if (rates !== undefined) updatePayload.rates = rates;
    if (priceReminderMonths !== undefined) updatePayload.price_reminder_months = priceReminderMonths;

    const { data, error } = await supabase
      .from('detailers')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: (error && error.message) || 'Update failed' }),
        { status: 400 }
      );
    }

    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      company: data.company,
      phone: data.phone,
      plan: data.plan,
      status: data.status,
    };
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
