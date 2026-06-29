export type AgentId = "tammasit" | "film" | "kla" | "foreman" | "moss";

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  age?: number;
  station: string;
  position: "tower" | "middle-left" | "middle-right" | "bottom-left" | "bottom-right";
  glasses?: boolean;
  outfit: "manager" | "engineer" | "technician";
  color: string;
  statuses: string[];
  alerts: string[];
};

export type DashboardSummary = {
  overdueTasks: number;
  dueThisWeek: number;
  pendingApprovals: number;
  activeProjects: number;
  solarSites: number;
  majorRenovationJobs: number;
  solarWarning: number;
  majorProjectRisk: number;
  activeFitoutJobs: number;
  fitoutPendingApproval: number;
  fitoutOverdue: number;
};

export type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "success" | "warning" | "danger" | "blue";
};

export type DashboardTrendPoint = {
  label: string;
  revenue: number;
  workOrders: number;
  approvals: number;
};

export type DashboardFocusProject = {
  id: string;
  name: string;
  type: "Fit-out" | "Restoration" | "PM Loop" | "Solar" | "Quotation";
  owner: AgentId;
  progress: number;
  risk: "Low" | "Medium" | "High";
  value: number;
  nextAction: string;
};

export type DashboardAgentStatus = {
  agent: AgentId;
  label: string;
  load: number;
  status: string;
};

export type DashboardMock = {
  updatedAt: string;
  headline: string;
  summary: DashboardSummary;
  metrics: DashboardMetric[];
  trends: DashboardTrendPoint[];
  focusProjects: DashboardFocusProject[];
  agentStatus: DashboardAgentStatus[];
};

export type ActivityItem = {
  id: string;
  agent: AgentId;
  message: string;
  time: string;
  tone: "info" | "success" | "warning" | "danger";
};

export type ConnectorType = "local-folder" | "github-repo" | "google-sheet" | "api";

export type ProjectConnector = {
  id: string;
  name: string;
  description: string;
  type: ConnectorType;
  connectionReady?: ConnectorType[];
  ownerAgent: AgentId[];
  status: "mock-ready" | "mock-active" | "connected";
  scope?: string[];
  localPath: string;
  githubRepoUrl: string;
  googleSheetId: string;
  apiEndpoint: string;
  enabled: boolean;
};
