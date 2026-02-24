import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST - Bulk add/remove tags on multiple customers
export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { action, customerIds, tags } = await request.json();

  if (!action || !Array.isArray(customerIds) || customerIds.length === 0 || !Array.isArray(tags) || tags.length === 0) {
    return Response.json({ error: 'action, customerIds[], and tags[] required' }, { status: 400 });
  }

  if (!['add', 'remove', 'set'].includes(action)) {
    return Response.json({ error: 'action must be add, remove, or set' }, { status: 400 });
  }

  // Verify all customers belong to this detailer
  const { data: customers, error: fetchErr } = await supabase
    .from('customers')
    .select('id, tags')
    .in('id', customerIds)
    .eq('detailer_id', user.id);

  if (fetchErr) {
    return Response.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!customers || customers.length === 0) {
    return Response.json({ error: 'No matching customers found' }, { status: 404 });
  }

  let updated = 0;
  for (const customer of customers) {
    const currentTags = Array.isArray(customer.tags) ? customer.tags : [];
    let newTags;

    if (action === 'add') {
      const tagSet = new Set(currentTags);
      tags.forEach(t => tagSet.add(t));
      newTags = Array.from(tagSet);
    } else if (action === 'remove') {
      newTags = currentTags.filter(t => !tags.includes(t));
    } else {
      // set - replace entirely
      newTags = [...tags];
    }

    const { error: updateErr } = await supabase
      .from('customers')
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq('id', customer.id)
      .eq('detailer_id', user.id);

    if (!updateErr) updated++;
  }

  return Response.json({ success: true, updated });
}
