import "server-only";

import { cache } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { findApprovedUser } from "./google-sheets-store";
import type { ModulePermission, QuotationPermission } from "./permissions";

const getApprovedSession = cache(async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { authenticated: false, user: null };
  const user = await findApprovedUser(email);
  return { authenticated: true, user: user?.active ? user : null };
});

export async function getCurrentApprovedUser() {
  return (await getApprovedSession()).user;
}

export async function requireApprovedUser() {
  const approvedSession = await getApprovedSession();
  if (!approvedSession.authenticated) redirect("/login");
  if (!approvedSession.user) redirect("/access-denied");
  return approvedSession.user;
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
