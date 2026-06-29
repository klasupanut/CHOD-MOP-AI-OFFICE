export type ProjectAssignment = {
  assignmentId: string;
  projectId: string;
  person: string;
  role: string;
  responsibility: string;
};

export const mockProjectAssignments: ProjectAssignment[] = [
  { assignmentId: "ASN-B8-FILM", projectId: "PRJ-FITOUT-B8", person: "Film", role: "Document / Quotation", responsibility: "Quotation, document package and approval queue." },
  { assignmentId: "ASN-B8-KLA", projectId: "PRJ-FITOUT-B8", person: "Kla", role: "Engineering Review", responsibility: "Shop drawing, scope review and fit-out coordination." },
  { assignmentId: "ASN-B8-MOSS", projectId: "PRJ-FITOUT-B8", person: "Moss", role: "Electrical Scope", responsibility: "Electrical load, power points and quotation check." },
  { assignmentId: "ASN-B8-FOREMAN", projectId: "PRJ-FITOUT-B8", person: "Foreman", role: "Site Progress", responsibility: "Site measurement, progress and issue alert." },
  { assignmentId: "ASN-F7-TAM", projectId: "PRJ-PM-F7", person: "Tammasit", role: "Approval", responsibility: "Approve delayed PM exception." },
];

export type ActivityLogItem = {
  logId: string;
  timestamp: string;
  action: string;
  entityType: "Project" | "Task";
  entityId: string;
  projectId?: string;
  taskId?: string;
  actor: string;
  detail: string;
};

export const mockActivityLog: ActivityLogItem[] = [
  { logId: "LOG-001", timestamp: "2026-06-23 16:00", action: "TASK_NOTE_UPDATED", entityType: "Task", entityId: "TSK-GEN-001", taskId: "TSK-GEN-001", actor: "Kla", detail: "Added renovation risk section to weekly summary memo." },
  { logId: "LOG-002", timestamp: "2026-06-23 15:40", action: "PROJECT_UPDATED", entityType: "Project", entityId: "PRJ-FITOUT-B8", projectId: "PRJ-FITOUT-B8", actor: "Kla", detail: "Fit-out B8 shop drawing moved to waiting approval." },
  { logId: "LOG-003", timestamp: "2026-06-23 14:50", action: "APPROVAL_WAITING", entityType: "Task", entityId: "TSK-APP-001", projectId: "PRJ-PM-F7", taskId: "TSK-APP-001", actor: "Foreman", detail: "PM exception waiting for Tammasit approval." },
];
