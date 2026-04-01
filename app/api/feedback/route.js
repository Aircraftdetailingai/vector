import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import { logActivity, ACTIVITY } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

// GET - Load quote info by feedback token (public, no auth needed)
export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Find quote by feedback_token
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, client_name, client_email, aircraft_model, aircraft_type, total_price, detailer_id, feedback_token, completed_at')
    .eq('feedback_token', token)
    .single();

  if (error || !quote) {
    return Response.json({ error: 'Invalid or expired feedback link' }, { status: 404 });
  }

  // Check if already submitted
  const { data: existing } = await supabase
    .from('feedback')
    .select('id')
    .eq('quote_id', quote.id)
    .single();

  if (existing) {
    return Response.json({ error: 'Feedback already submitted', alreadySubmitted: true }, { status: 400 });
  }

  // Get detailer info with branding
  const { data: detailer } = await supabase
    .from('detailers')
    .select('id, name, company, plan, theme_primary, theme_accent, theme_bg, theme_surface, theme_logo_url, logo_url, font_heading, font_body, font_embed_url')
    .eq('id', quote.detailer_id)
    .single();

  return Response.json({
    quote: {
      id: quote.id,
      clientName: quote.client_name,
      aircraft: quote.aircraft_model || quote.aircraft_type || 'Aircraft',
      completedAt: quote.completed_at || null,
    },
    detailer: {
      name: detailer?.name,
      company: detailer?.company || detailer?.name || 'your detailing professional',
      theme_primary: detailer?.theme_primary || null,
      theme_accent: detailer?.theme_accent || null,
      theme_bg: detailer?.theme_bg || null,
      theme_surface: detailer?.theme_surface || null,
      logo_url: detailer?.theme_logo_url || detailer?.logo_url || null,
      font_heading: detailer?.font_heading || null,
      font_body: detailer?.font_body || null,
      font_embed_url: detailer?.font_embed_url || null,
    },
  });
}

// POST - Submit feedback (public, no auth needed)
export async function POST(request) {
  const body = await request.json();
  const { token, rating, comment } = body;

  if (!token) {
    return Response.json({ error: 'Token required' }, { status: 400 });
  }

  if (!rating || rating < 1 || rating > 5) {
    return Response.json({ error: 'Rating must be 1-5' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Find quote
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, detailer_id, client_name, client_email')
    .eq('feedback_token', token)
    .single();

  if (error || !quote) {
    return Response.json({ error: 'Invalid feedback link' }, { status: 404 });
  }

  // Check if already submitted
  const { data: existing } = await supabase
    .from('feedback')
    .select('id')
    .eq('quote_id', quote.id)
    .single();

  if (existing) {
    return Response.json({ error: 'Feedback already submitted' }, { status: 400 });
  }

  // Insert feedback
  const { data: feedback, error: insertError } = await supabase
    .from('feedback')
    .insert({
      quote_id: quote.id,
      detailer_id: quote.detailer_id,
      customer_email: quote.client_email,
      customer_name: quote.client_name,
      rating: parseInt(rating),
      comment: (comment || '').trim().slice(0, 1000),
      is_public: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Feedback insert error:', insertError);
    return Response.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  // Log activity
  if (quote.client_email) {
    logActivity({
      detailer_id: quote.detailer_id,
      customer_email: quote.client_email,
      activity_type: ACTIVITY.FEEDBACK_RECEIVED,
      summary: `Feedback received: ${parseInt(rating)} star${parseInt(rating) !== 1 ? 's' : ''}${comment ? ' with comment' : ''}`,
      details: { rating: parseInt(rating), has_comment: !!comment },
      quote_id: quote.id,
    });
  }

  return Response.json({ success: true, id: feedback.id });
}
