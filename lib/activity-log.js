import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  );
}

/**
 * Log a customer activity event.
 * Call from any API route when a status change or notable event occurs.
 *
 * @param {object} params
 * @param {string} params.detailer_id - UUID of the detailer
 * @param {string} params.customer_email - Customer email (for linking)
 * @param {string} params.activity_type - One of the defined activity types
 * @param {string} params.summary - Human-readable one-line summary
 * @param {object} [params.details] - Additional structured data (amount, status, etc.)
 * @param {string} [params.quote_id] - Related quote ID if applicable
 */
export async function logActivity({ detailer_id, customer_email, activity_type, summary, details, quote_id }) {
  if (!detailer_id || !customer_email) return;

  try {
    const supabase = getSupabase();
    const row = {
      detailer_id,
      customer_email: customer_email.toLowerCase().trim(),
      activity_type,
      summary,
      details: details || {},
      quote_id: quote_id || null,
    };

    // Graceful insert with column fallback
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabase
        .from('customer_activity_log')
        .insert(row);

      if (!error) return;

      // Table doesn't exist - silently skip
      if (error.code === '42P01' || error.code === 'PGRST205') return;

      // Column doesn't exist - strip it
      const colMatch = error.message?.match(/column "([^"]+)".*does not exist/);
      if (colMatch) {
        delete row[colMatch[1]];
        continue;
      }

      console.error('Activity log error:', error.message);
      return;
    }
  } catch (err) {
    // Never fail the parent operation
    console.error('Activity log exception:', err.message);
  }
}

// Activity type constants
export const ACTIVITY = {
  QUOTE_CREATED: 'quote_created',
  QUOTE_SENT: 'quote_sent',
  QUOTE_VIEWED: 'quote_viewed',
  QUOTE_EXPIRED: 'quote_expired',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_ISSUED: 'refund_issued',
  JOB_COMPLETED: 'job_completed',
  JOB_SCHEDULED: 'job_scheduled',
  INVOICE_CREATED: 'invoice_created',
  INVOICE_EMAILED: 'invoice_emailed',
  NOTE_ADDED: 'note_added',
  FEEDBACK_RECEIVED: 'feedback_received',
  CUSTOMER_CREATED: 'customer_created',
};
