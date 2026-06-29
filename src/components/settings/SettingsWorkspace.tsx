"use client";

import { useState } from "react";
import { UserManagement } from "@/components/auth/UserManagement";
import { ApprovalPermissionSettings } from "@/components/settings/ApprovalPermissionSettings";
import { DataConnectorPanel } from "@/components/settings/DataConnectorPanel";
import { GeneralSettingsPanel } from "@/components/settings/GeneralSettingsPanel";
import { SystemSettingsPanel } from "@/components/settings/SystemSettingsPanel";
import type { ApprovalPermission } from "@/data/approval-permissions";
import type { ApprovedUser } from "@/lib/auth/types";
import type { Role } from "@/lib/auth/permissions";
import type { SettingsDataConnectorStatus } from "@/lib/settings/data-connectors";
import type { SettingsGeneralStatus, SettingsSystemStatus } from "@/lib/settings/runtime-status";

const settingsTabs = ["General", "Team & Role", "Approval Permission", "Data Connector", "System"] as const;

export function SettingsWorkspace({
  initialUsers,
  actorRole,
  storageError,
  initialApprovalPermissions,
  approvalPermissionError,
  protectedSuperAdminEmail,
  dataConnectors,
  generalStatus,
  systemStatus,
}: {
  initialUsers: ApprovedUser[];
  actorRole: Role;
  storageError?: string;
  initialApprovalPermissions: ApprovalPermission[];
  approvalPermissionError?: string;
  protectedSuperAdminEmail: string;
  dataConnectors: SettingsDataConnectorStatus;
  generalStatus: SettingsGeneralStatus;
  systemStatus: SettingsSystemStatus;
}) {
  const [tab, setTab] = useState<(typeof settingsTabs)[number]>("Team & Role");

  return (
    <>
      <div className="settings-tabs">
        {settingsTabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}
      </div>
      {tab === "Team & Role" ? (
        <UserManagement initialUsers={initialUsers} actorRole={actorRole} storageError={storageError} protectedSuperAdminEmail={protectedSuperAdminEmail} />
      ) : null}
      {tab === "Approval Permission" ? (
        <ApprovalPermissionSettings
          initialPermissions={initialApprovalPermissions}
          storageError={approvalPermissionError}
        />
      ) : null}
      {tab === "General" ? <GeneralSettingsPanel status={generalStatus} /> : null}
      {tab === "Data Connector" ? <DataConnectorPanel status={dataConnectors} /> : null}
      {tab === "System" ? <SystemSettingsPanel status={systemStatus} /> : null}
    </>
  );
}
