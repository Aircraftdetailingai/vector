import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { fcmToken } = await request.json();
  if (!fcmToken) {
    return new Response(JSON.stringify({ error: 'FCM token required' }), { status: 400 });
  }

  const supabase = getSupabase();

  // Update detailer's FCM token
  const { error } = await supabase
    .from('detailers')
    .update({ fcm_token: fcmToken })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to save FCM token:', error);
    return new Response(JSON.stringify({ error: 'Failed to save token' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
