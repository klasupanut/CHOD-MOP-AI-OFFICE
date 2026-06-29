import "server-only";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { findApprovedUser } from "./google-sheets-store";
import type { ModulePermission, QuotationPermission } from "./permissions";

export async function getCurrentApprovedUser() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const user = await findApprovedUser(email);
  return user?.active ? user : null;
}

export async function requireApprovedUser() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const user = await findApprovedUser(session.user.email);
  if (!user || !user.active) redirect("/access-denied");
  return user;
}

export async function requireModule(module: ModulePermission) {
  const user = await requireApprovedUser();
  if (!user.modulePermissions.includes(module)) redirect("/access-denied");
  return user;
}

export async function requireQuotationPermission(permission: QuotationPermission) {
  const user = await requireModule("Quotations");
  if (!user.quotationPermissions.includes(permission)) redirect("/access-denied");
  return user;
}

