import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'brett@aircraftdetailing.ai',
  'admin@aircraftdetailing.ai',
  'brett@shinyjets.com',
];

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

// GET - Return fresh user data for the authenticated user
export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('detailers')
    .select('id, email, name, phone, company, plan, status, rates, notification_settings, price_reminder_months, quote_display_preference, efficiency_factor, default_labor_rate, sms_enabled, preferred_currency, terms_accepted_version')
    .eq('id', user.id)
    .single();

  // Column-stripping retry if terms_accepted_version doesn't exist yet
  if (error && error.message?.includes('column')) {
    const retry = await supabase
      .from('detailers')
      .select('id, email, name, phone, company, plan, status, rates, notification_settings, price_reminder_months, quote_display_preference, efficiency_factor, default_labor_rate, sms_enabled, preferred_currency')
      .eq('id', user.id)
      .single();
    if (retry.error || !retry.data) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    retry.data.terms_accepted_version = null;
    const isAdmin = ADMIN_EMAILS.includes(retry.data.email?.toLowerCase());
    return Response.json({
      user: {
        id: retry.data.id,
        email: retry.data.email,
        name: retry.data.name,
        phone: retry.data.phone,
        company: retry.data.company,
        plan: isAdmin ? 'enterprise' : (retry.data.plan || 'free'),
        is_admin: isAdmin,
        status: retry.data.status,
        rates: retry.data.rates || {},
        notification_settings: retry.data.notification_settings || {},
        price_reminder_months: retry.data.price_reminder_months || 6,
        quote_display_preference: retry.data.quote_display_preference || 'package',
        efficiency_factor: retry.data.efficiency_factor || 1.0,
        default_labor_rate: retry.data.default_labor_rate || 25,
        sms_enabled: isAdmin ? true : (retry.data.sms_enabled !== false),
        currency: retry.data.preferred_currency || 'USD',
        terms_accepted_version: null,
      },
    });
  }

  if (error || !data) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const isAdmin = ADMIN_EMAILS.includes(data.email?.toLowerCase());

  return Response.json({
    user: {
      id: data.id,
      email: data.email,
      name: data.name,
      phone: data.phone,
      company: data.company,
      plan: isAdmin ? 'enterprise' : (data.plan || 'free'),
      is_admin: isAdmin,
      status: data.status,
      rates: data.rates || {},
      notification_settings: data.notification_settings || {},
      price_reminder_months: data.price_reminder_months || 6,
      quote_display_preference: data.quote_display_preference || 'package',
      efficiency_factor: data.efficiency_factor || 1.0,
      default_labor_rate: data.default_labor_rate || 25,
      sms_enabled: isAdmin ? true : (data.sms_enabled !== false),
      currency: data.preferred_currency || 'USD',
      terms_accepted_version: data.terms_accepted_version || null,
    },
  });
}
