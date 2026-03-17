import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'brett@vectorav.ai',
  'admin@vectorav.ai',
  '',
];

function buildUserResponse(data, isAdmin) {
  return {
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
    created_at: data.created_at || null,
    onboarding_completed: data.onboarding_completed || null,
  };
}

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
    .select('id, email, name, phone, company, plan, status, rates, notification_settings, price_reminder_months, quote_display_preference, efficiency_factor, default_labor_rate, sms_enabled, preferred_currency, country, terms_accepted_version, created_at, onboarding_completed')
    .eq('id', user.id)
    .single();

  // Column-stripping retry if new columns don't exist yet
  if (error && error.message?.includes('column')) {
    // Try without onboarding_completed
    const retry1 = await supabase
      .from('detailers')
      .select('id, email, name, phone, company, plan, status, rates, notification_settings, price_reminder_months, quote_display_preference, efficiency_factor, default_labor_rate, sms_enabled, preferred_currency, terms_accepted_version, created_at')
      .eq('id', user.id)
      .single();

    if (retry1.error && retry1.error.message?.includes('column')) {
      // Try without both new columns
      const retry2 = await supabase
        .from('detailers')
        .select('id, email, name, phone, company, plan, status, rates, notification_settings, price_reminder_months, quote_display_preference, efficiency_factor, default_labor_rate, sms_enabled, preferred_currency')
        .eq('id', user.id)
        .single();
      if (retry2.error || !retry2.data) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      retry2.data.terms_accepted_version = null;
      retry2.data.created_at = null;
      retry2.data.onboarding_completed = null;
      const isAdmin = ADMIN_EMAILS.includes(retry2.data.email?.toLowerCase());
      return Response.json({
        user: buildUserResponse(retry2.data, isAdmin),
      });
    }

    if (retry1.error || !retry1.data) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    retry1.data.onboarding_completed = null;
    const isAdmin = ADMIN_EMAILS.includes(retry1.data.email?.toLowerCase());
    return Response.json({
      user: buildUserResponse(retry1.data, isAdmin),
    });
  }

  if (error || !data) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const isAdmin = ADMIN_EMAILS.includes(data.email?.toLowerCase());

  return Response.json({
    user: buildUserResponse(data, isAdmin),
  });
}
