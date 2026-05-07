// Canonical detailer_id resolver shared across every detailer-scoped API route.
//
// Three JWT shapes hit our routes:
//   1. Owner JWT — user.id IS the detailers.id row. user.detailer_id is unset.
//   2. Crew JWT — user.id is the team_members.id, user.detailer_id is the
//      owning detailers.id (set at token issuance in /api/auth/*).
//   3. Stale crew JWT — issued before crew tokens carried detailer_id, so
//      user.id is team_members.id with no detailer_id. Must look up.
//
// Without this resolution, any route that runs `.eq('detailer_id', user.id)`
// on a crew JWT silently matches zero rows and hands back an empty result
// (or, on writes, fakes a 200 over a no-op update). 3db3b3d patched a few
// hot paths with the inline `user.detailer_id || user.id` form; this helper
// is the same idea plus the stale-token DB fallback.
export async function resolveDetailerId(supabase, user) {
  if (!user) return null;
  if (user.detailer_id) return user.detailer_id;
  if (user.role === 'crew' && user.id) {
    const { data: tm } = await supabase
      .from('team_members')
      .select('detailer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (tm?.detailer_id) return tm.detailer_id;
  }
  return user.id || null;
}
