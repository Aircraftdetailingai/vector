import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const BUCKET = 'documents';

// GET - Download / get signed URL for a document
export async function GET(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const { id } = await params;

    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !doc) return Response.json({ error: 'Document not found' }, { status: 404 });
    if (doc.detailer_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Generate signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 3600);

    if (urlError) {
      console.error('Signed URL error:', urlError);
      return Response.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return Response.json({ document: doc, url: urlData.signedUrl });
  } catch (err) {
    console.error('Document GET error:', err);
    return Response.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

// PUT - Update document metadata
export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const { id } = await params;
    const body = await request.json();

    const { data: doc } = await supabase
      .from('documents')
      .select('detailer_id')
      .eq('id', id)
      .single();

    if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });
    if (doc.detailer_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.category !== undefined) updates.category = body.category;
    if (body.expires_at !== undefined) updates.expires_at = body.expires_at || null;
    if (body.notes !== undefined) updates.notes = body.notes;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ document: data });
  } catch (err) {
    console.error('Document PUT error:', err);
    return Response.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

// DELETE - Remove document and file
export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const { id } = await params;

    const { data: doc } = await supabase
      .from('documents')
      .select('detailer_id, storage_path')
      .eq('id', id)
      .single();

    if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });
    if (doc.detailer_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Delete from storage
    if (doc.storage_path) {
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    }

    // Delete DB record
    await supabase.from('documents').delete().eq('id', id);

    return Response.json({ success: true });
  } catch (err) {
    console.error('Document DELETE error:', err);
    return Response.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
