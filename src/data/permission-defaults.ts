import { defaultApprovalPermissions } from "@/data/approval-permissions";
import { operationalRoleCapabilities } from "@/lib/permissions/role-permissions";

export const initialAllowedEmails = ["chod.mopteam@gmail.com"] as const;

export const permissionDefaults = {
  costGuardrail: {
    noPaidServicesWithoutApproval: true,
    smsOtpEnabled: false,
    customerSigningOtpOnly: true,
    note: "OTP is only for customer quotation signing links. Team login uses Google/Supabase Auth, not OTP.",
  },
  operationalRoleCapabilities,
  quotationApprovalPermissions: defaultApprovalPermissions,
};
