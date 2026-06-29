import "server-only";

import { auth } from "@/auth";
import { findApprovedUser } from "./google-sheets-store";
import type { ModulePermission } from "./permissions";

export async function getApiUser(module?: ModulePermission) {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await findApprovedUser(session.user.email);
  if (!user?.active) return null;
  if (module && !user.modulePermissions.includes(module)) return null;
  return user;
}

