export type ProjectType = "PM Loop" | "Renovation" | "Fit-out" | "Solar" | "Quotation" | "Document" | "General";
export type ProjectStatus = "Planning" | "In Progress" | "Waiting Approval" | "On Hold" | "Completed" | "Cancelled";
export type ProjectPriority = "Low" | "Medium" | "High" | "Critical";

export const chodProjectSites = [
  "CHOD 1",
  "CHOD 2",
  "CHOD 3",
  "CHOD 5",
  "CHODBIZ KM.8",
  "CHODBIZ SAI4",
  "CHODBIZ CHAENG",
] as const;

export const projectTypes: ProjectType[] = ["PM Loop", "Renovation", "Fit-out", "Solar", "Quotation", "General"];
export const projectPriorities: ProjectPriority[] = ["Low", "Medium", "High", "Critical"];

export type ProjectRecord = {
  projectId: string;
  projectName: string;
  projectType: ProjectType;
  site: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  dueDate: string;
  projectManager: string;
  createdBy: string;
  assignedTeam: string[];
  progress?: number;
  budget: number;
  linkedTasks: string[];
  linkedDocuments: string[];
  linkedQuotations: string[];
  lastUpdate: string;
};

export const mockProjects: ProjectRecord[] = [
  {
    projectId: "PRJ-FITOUT-B8",
    projectName: "Fit-out B8",
    projectType: "Fit-out",
    site: "CHODBIZ KM.8",
    description: "Mini fit-out package for B8 office zone with quotation, drawing, electrical scope and handover tracking.",
    status: "In Progress",
    priority: "High",
    startDate: "2026-06-17",
    dueDate: "2026-07-08",
    projectManager: "Kla",
    createdBy: "Tammasit",
    assignedTeam: ["Film", "Kla", "Moss", "Foreman"],
    budget: 420000,
    linkedTasks: ["TSK-FIT-B8-001", "TSK-FIT-B8-002", "TSK-FIT-B8-003", "TSK-FIT-B8-004", "TSK-FIT-B8-005", "TSK-FIT-B8-006"],
    linkedDocuments: ["Fit-out B8 BOQ", "Shop Drawing Rev.01"],
    linkedQuotations: ["CHOD-FO-26-003"],
    lastUpdate: "2026-06-23 15:40",
  },
  {
    projectId: "PRJ-PM-F7",
    projectName: "PM Loop F7 Critical Round",
    projectType: "PM Loop",
    site: "CHOD 5",
    description: "PM cycle near due date with overdue work orders and SLA follow-up.",
    status: "Waiting Approval",
    priority: "Critical",
    startDate: "2026-06-20",
    dueDate: "2026-06-26",
    projectManager: "Foreman",
    createdBy: "Foreman",
    assignedTeam: ["Foreman", "Film", "Tammasit"],
    budget: 85000,
    linkedTasks: ["TSK-PM-F7-001", "TSK-PM-F7-002", "TSK-APP-001"],
    linkedDocuments: ["PM F7 Checklist"],
    linkedQuotations: [],
    lastUpdate: "2026-06-23 14:10",
  },
  {
    projectId: "PRJ-SOLAR-03",
    projectName: "Solar Roof CHOD-03 Output Review",
    projectType: "Solar",
    site: "CHOD 3",
    description: "Solar output variance check with electrical dashboard and quotation summary.",
    status: "In Progress",
    priority: "Medium",
    startDate: "2026-06-21",
    dueDate: "2026-06-29",
    projectManager: "Moss",
    createdBy: "Moss",
    assignedTeam: ["Moss", "Film"],
    budget: 160000,
    linkedTasks: ["TSK-SOL-003", "TSK-SOL-004"],
    linkedDocuments: ["Inverter Log CHOD-03"],
    linkedQuotations: ["CHOD-EQ-26-011"],
    lastUpdate: "2026-06-23 13:20",
  },
  {
    projectId: "PRJ-REN-MAJOR-02",
    projectName: "Major Renovation Drawing Review",
    projectType: "Renovation",
    site: "CHODBIZ SAI 4",
    description: "Engineering review for major renovation with calculation report and shop drawing revision.",
    status: "Planning",
    priority: "High",
    startDate: "2026-06-18",
    dueDate: "2026-07-15",
    projectManager: "Kla",
    createdBy: "Kla",
    assignedTeam: ["Kla", "Film", "Tammasit"],
    budget: 920000,
    linkedTasks: ["TSK-REN-002", "TSK-DOC-002"],
    linkedDocuments: ["Shop Drawing Rev.02", "Calculation Report Draft"],
    linkedQuotations: [],
    lastUpdate: "2026-06-23 11:55",
  },
];

export function getProjects() {
  return mockProjects;
}
