import "server-only";

import { revalidateTag } from "next/cache";

export const LIVE_DASHBOARD_CACHE_TAG = "chod-live-dashboard-v1";
export const OFFICE_PANEL_CACHE_TAG = "chod-office-panel-v1";

/**
 * Keep dashboard reads fast while ensuring successful business-data writes are
 * visible on the very next navigation instead of waiting for the short TTL.
 */
export function invalidateLiveWorkspaceCaches() {
  revalidateTag(LIVE_DASHBOARD_CACHE_TAG);
  revalidateTag(OFFICE_PANEL_CACHE_TAG);
}
