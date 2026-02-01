import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Default intake questions
const DEFAULT_QUESTIONS = [
  {
    key: 'aircraft_type',
    question: 'What type of aircraft do you have?',
    placeholder: 'e.g., Cessna 172, Gulfstream G550',
    required: true,
    order: 1,
  },
  {
    key: 'tail_number',
    question: 'What is your tail number?',
    placeholder: 'e.g., N12345',
    required: false,
    order: 2,
  },
  {
    key: 'location',
    question: 'Where is your aircraft located?',
    placeholder: 'Airport code or hangar location',
    required: true,
    order: 3,
  },
  {
    key: 'services',
    question: 'What services are you interested in?',
    placeholder: 'e.g., Full detail, exterior wash, interior cleaning',
    required: true,
    order: 4,
  },
  {
    key: 'preferred_date',
    question: 'When would you like the service?',
    placeholder: 'e.g., Next week, March 15th, ASAP',
    required: false,
    order: 5,
  },
  {
    key: 'special_concerns',
    question: 'Any damage or special concerns we should know about?',
    placeholder: 'e.g., Bug damage, oil stains, scratches',
    required: false,
    order: 6,
  },
];

// GET - Get intake questions for detailer
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get custom questions
    const { data: questions, error } = await supabase
      .from('intake_questions')
      .select('*')
      .eq('detailer_id', user.id)
      .order('display_order', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist, return defaults
        return Response.json({ questions: DEFAULT_QUESTIONS, isDefault: true });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // If no custom questions, return defaults
    if (!questions?.length) {
      return Response.json({ questions: DEFAULT_QUESTIONS, isDefault: true });
    }

    return Response.json({ questions, isDefault: false });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST - Create or update intake questions
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { action, question, questions } = await request.json();

    if (action === 'add') {
      // Add single question
      const { data: newQuestion, error } = await supabase
        .from('intake_questions')
        .insert({
          detailer_id: user.id,
          question_key: question.key || `custom_${Date.now()}`,
          question_text: question.question,
          placeholder: question.placeholder || '',
          required: question.required || false,
          display_order: question.order || 999,
          question_type: question.type || 'text',
          options: question.options || null,
        })
        .select()
        .single();

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ success: true, question: newQuestion });
    }

    if (action === 'save_all') {
      // Delete existing and insert all
      await supabase
        .from('intake_questions')
        .delete()
        .eq('detailer_id', user.id);

      if (questions?.length) {
        const toInsert = questions.map((q, idx) => ({
          detailer_id: user.id,
          question_key: q.key || `custom_${idx}`,
          question_text: q.question,
          placeholder: q.placeholder || '',
          required: q.required || false,
          display_order: idx,
          question_type: q.type || 'text',
          options: q.options || null,
        }));

        const { error } = await supabase
          .from('intake_questions')
          .insert(toInsert);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'reset_defaults') {
      // Delete custom and return to defaults
      await supabase
        .from('intake_questions')
        .delete()
        .eq('detailer_id', user.id);

      return Response.json({ success: true, questions: DEFAULT_QUESTIONS });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE - Delete a question
export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return Response.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('id');

    if (!questionId) {
      return Response.json({ error: 'Question ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('intake_questions')
      .delete()
      .eq('id', questionId)
      .eq('detailer_id', user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
