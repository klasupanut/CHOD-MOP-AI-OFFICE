import type { ModulePermission, QuotationPermission, Role } from "./permissions";
import type { AgentId } from "@/lib/types";

export type ApprovedUser = {
  userId: string;
  name: string;
  email: string;
  position: string;
  role: Role;
  active: boolean;
  modulePermissions: ModulePermission[];
  quotationPermissions: QuotationPermission[];
  characterId?: AgentId | "";
  lastSignInProvider: string;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  event: "login" | "user.create" | "user.update";
  actorEmail: string;
  targetEmail?: string;
  provider?: string;
  details?: string;
};
