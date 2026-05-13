// lib/upsertCustomerAircraft.js
//
// Pins an aircraft to a customer's aircraft list whenever it appears on a
// new invoice, quote, or job. Idempotent — does not overwrite existing rows.
//
// No-op (returns null) when detailer_id, customer_id, or tail_number is
// missing. Model-only aircraft are skipped since "G4" alone is ambiguous —
// the tail number is the unique identifier.

export async function upsertCustomerAircraft(supabase, {
  detailer_id,
  customer_id,
  tail_number,
  model = null,
  manufacturer = null,
  year = null,
}) {
  if (!detailer_id || !customer_id || !tail_number) return null;

  const tail = String(tail_number).trim();
  if (!tail) return null;

  const { data: existing, error: selectError } = await supabase
    .from('customer_aircraft')
    .select('id')
    .eq('customer_id', customer_id)
    .eq('tail_number', tail)
    .maybeSingle();

  if (selectError) {
    console.error('[upsertCustomerAircraft] select failed:', selectError);
    return null;
  }
  if (existing) return existing;

  const { data, error } = await supabase
    .from('customer_aircraft')
    .insert({
      detailer_id,
      customer_id,
      tail_number: tail,
      model,
      manufacturer,
      year,
    })
    .select('id')
    .maybeSingle();

  // 23505 = unique_violation. Benign race against a parallel insert.
  if (error && error.code !== '23505') {
    console.error('[upsertCustomerAircraft] insert failed:', error);
    return null;
  }
  return data;
}
