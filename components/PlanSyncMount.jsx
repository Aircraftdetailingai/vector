"use client";

import { usePlanGuard } from '@/hooks/usePlanGuard';

// Zero-DOM mount point for the plan-sync polling hook. Rendered once per
// authenticated layout (AppShell + SettingsLayout) so every logged-in
// surface keeps localStorage.vector_user.plan in sync with the server.
export default function PlanSyncMount() {
  usePlanGuard();
  return null;
}
