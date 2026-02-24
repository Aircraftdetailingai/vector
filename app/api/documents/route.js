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

async function ensureBucket(supabase) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

// GET - List all documents for the detailer
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('documents')
      .select('*')
      .eq('detailer_id', user.id)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Documents fetch error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ documents: data || [] });
  } catch (err) {
    console.error('Documents GET error:', err);
    return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST - Upload a document
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    if (!supabase) return Response.json({ error: 'Database not configured' }, { status: 500 });

    const formData = await request.formData();
    const file = formData.get('file');
    const name = formData.get('name') || file?.name || 'Untitled';
    const category = formData.get('category') || 'other';
    const expiresAt = formData.get('expires_at') || null;
    const notes = formData.get('notes') || '';

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return Response.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    await ensureBucket(supabase);

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return Response.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Insert document record
    const docRow = {
      detailer_id: user.id,
      name,
      category,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: storagePath,
      expires_at: expiresAt || null,
      notes,
    };

    // Insert with retry for missing columns
    let row = { ...docRow };
    let data, error;

    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabase.from('documents').insert(row).select().single();
      data = result.data;
      error = result.error;

      if (!error) break;

      const colMatch = error.message?.match(/column "([^"]+)" of relation "documents" does not exist/)
        || error.message?.match(/Could not find the '([^']+)' column of 'documents'/);
      if (colMatch) {
        delete row[colMatch[1]];
        continue;
      }
      break;
    }

    if (error) {
      // Clean up uploaded file on DB error
      await supabase.storage.from(BUCKET).remove([storagePath]);
      console.error('Document insert error:', JSON.stringify(error));
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ document: data }, { status: 201 });
  } catch (err) {
    console.error('Documents POST error:', err);
    return Response.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
