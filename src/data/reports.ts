import type { AgentId } from "@/lib/types";

export type TeamReportMemberId = AgentId | "all";

export type ReportKpi = {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "success" | "warning" | "danger" | "blue";
};

export type TeamMemberReport = {
  id: AgentId;
  name: string;
  role: string;
  station: string;
  avatar: string;
  activeTasks: number;
  completedThisWeek: number;
  kpis: Array<{ label: string; value: string; tone: "cyan" | "success" | "warning" | "danger" | "blue" }>;
  mainArea: string;
  suggestedReport: string;
};

export type RecommendedReport = {
  id: string;
  owner: string;
  title: string;
  reason: string;
  tone: "cyan" | "success" | "warning" | "danger" | "blue";
};

export type ReportModule = {
  id: string;
  title: string;
  metric: string;
  description: string;
};

export type TeamActivity = {
  id: string;
  time: string;
  owner: string;
  activity: string;
  tone: "cyan" | "success" | "warning" | "danger" | "blue";
};

export type ReportInsight = {
  id: string;
  title: string;
  summary: string;
  action: string;
  tone: "cyan" | "success" | "warning" | "danger" | "blue";
};

export const reportOverviewKpis: ReportKpi[] = [
  { label: "Team Active Tasks", value: "42", detail: "Across 5 team stations", tone: "cyan" },
  { label: "Tasks Completed This Week", value: "31", detail: "+12% vs last week", tone: "success" },
  { label: "Overdue by Team", value: "7", detail: "3 members need follow-up", tone: "danger" },
  { label: "Pending Quotation Approval", value: "5", detail: "Tammasit review queue", tone: "warning" },
  { label: "Reports Ready to Generate", value: "9", detail: "Weekly + risk reports", tone: "blue" },
  { label: "Team Workload Balance", value: "76%", detail: "Healthy but Film is high", tone: "cyan" },
];

export const teamMemberReports: TeamMemberReport[] = [
  {
    id: "film",
    name: "Film",
    role: "Engineer / Data Center",
    station: "Quotation / Document / Fit-out",
    avatar: "/assets/characters/film-front.png",
    activeTasks: 11,
    completedThisWeek: 8,
    kpis: [
      { label: "Waiting Approval", value: "5", tone: "warning" },
      { label: "Fit-out Docs", value: "12", tone: "cyan" },
    ],
    mainArea: "Quotation / Document / Fit-out",
    suggestedReport: "Quotation Weekly Summary",
  },
  {
    id: "moss",
    name: "Moss",
    role: "Electrical Engineer",
    station: "Solar / Electrical / System Performance",
    avatar: "/assets/characters/moss-front.png",
    activeTasks: 7,
    completedThisWeek: 6,
    kpis: [
      { label: "Solar Alerts", value: "2", tone: "warning" },
      { label: "Electrical Quote", value: "3", tone: "blue" },
    ],
    mainArea: "Solar / Electrical / System Performance",
    suggestedReport: "Solar Performance Summary",
  },
  {
    id: "kla",
    name: "Kla",
    role: "Civil Engineer / Moderator",
    station: "Engineering / Renovation / Fit-out",
    avatar: "/assets/characters/kla-front.png",
    activeTasks: 9,
    completedThisWeek: 7,
    kpis: [
      { label: "Engineering Review", value: "6", tone: "cyan" },
      { label: "Major Risk", value: "1", tone: "danger" },
    ],
    mainArea: "Engineering / Renovation / Fit-out",
    suggestedReport: "Engineering Review Summary",
  },
  {
    id: "foreman",
    name: "Foreman",
    role: "Maintenance & Site Lead",
    station: "PM / Site / Maintenance",
    avatar: "/assets/characters/foreman-back.png",
    activeTasks: 10,
    completedThisWeek: 5,
    kpis: [
      { label: "PM Overdue", value: "3", tone: "danger" },
      { label: "Site Updates", value: "9", tone: "success" },
    ],
    mainArea: "PM / Site / Maintenance",
    suggestedReport: "PM / Site Progress Summary",
  },
  {
    id: "tammasit",
    name: "Tammasit",
    role: "Director of Operations",
    station: "Overall Operation / Decision / Approval",
    avatar: "/assets/characters/tammasit-front.png",
    activeTasks: 5,
    completedThisWeek: 5,
    kpis: [
      { label: "Pending Approvals", value: "5", tone: "warning" },
      { label: "Team Risks", value: "4", tone: "danger" },
    ],
    mainArea: "Overall Operation / Decision / Approval",
    suggestedReport: "Executive Decision Summary",
  },
];

export const recommendedReports: RecommendedReport[] = [
  { id: "film-quotation", owner: "Film", title: "Quotation Approval Summary", reason: "5 quotations are waiting for Tammasit approval.", tone: "warning" },
  { id: "moss-solar", owner: "Moss", title: "Solar Output Variance Report", reason: "CHOD-03 and CHOD-07 need output review.", tone: "blue" },
  { id: "kla-fitout", owner: "Kla", title: "Fit-out Engineering Risk Report", reason: "1 major fit-out drawing review is at risk.", tone: "danger" },
  { id: "foreman-pm", owner: "Foreman", title: "PM Overdue Report", reason: "3 PM tasks are overdue and need site follow-up.", tone: "danger" },
  { id: "tammasit-weekly", owner: "Tammasit", title: "Executive Weekly Summary", reason: "Best report for weekly operation decision meeting.", tone: "cyan" },
];

export const reportModulesByMember: Record<TeamReportMemberId, ReportModule[]> = {
  film: [
    { id: "film-1", title: "Quotation Summary", metric: "5 waiting", description: "Quotation status, pending approvals and value summary." },
    { id: "film-2", title: "Document Status", metric: "12 active", description: "Document tracking and missing information check." },
    { id: "film-3", title: "Fit-out Pending", metric: "4 jobs", description: "Fit-out quotation and document pending list." },
    { id: "film-4", title: "Approval Waiting", metric: "฿2.8M", description: "Value of quotations waiting for decision." },
    { id: "film-5", title: "Tasks Completed", metric: "8 done", description: "Weekly completion report for Data Center tasks." },
  ],
  moss: [
    { id: "moss-1", title: "Solar Performance", metric: "24.7 MWh", description: "Solar output, variance and site performance." },
    { id: "moss-2", title: "Electrical Quotation", metric: "3 quotes", description: "Electrical quotation summary by site and scope." },
    { id: "moss-3", title: "System Warning", metric: "2 alerts", description: "Power system warning and follow-up list." },
    { id: "moss-4", title: "Site Comparison", metric: "6 sites", description: "Compare site output, capacity and issue status." },
  ],
  kla: [
    { id: "kla-1", title: "Engineering Review", metric: "6 reviews", description: "Engineering review queue and risk status." },
    { id: "kla-2", title: "Shop Drawing Status", metric: "Rev.02", description: "Drawing revision status and action owner." },
    { id: "kla-3", title: "Calculation Report", metric: "3 pending", description: "Calculation reports waiting for review." },
    { id: "kla-4", title: "Fit-out Risk", metric: "1 high", description: "Major fit-out risk and mitigation summary." },
  ],
  foreman: [
    { id: "foreman-1", title: "PM Progress", metric: "62%", description: "PM loop progress and overdue area." },
    { id: "foreman-2", title: "Site Progress", metric: "9 updates", description: "Latest site progress from field operation." },
    { id: "foreman-3", title: "Maintenance Alerts", metric: "4 alerts", description: "Maintenance alert and contractor follow-up." },
    { id: "foreman-4", title: "Overdue Work Orders", metric: "3 overdue", description: "Overdue work order list by site and SLA." },
  ],
  tammasit: [
    { id: "tammasit-1", title: "Executive Summary", metric: "Ready", description: "Operation summary for management decision." },
    { id: "tammasit-2", title: "Team Risk Summary", metric: "4 risks", description: "Risks grouped by owner and urgency." },
    { id: "tammasit-3", title: "Pending Approvals", metric: "5 items", description: "Approval queue by quotation value and due date." },
    { id: "tammasit-4", title: "Operation Overview", metric: "76% on track", description: "Portfolio health, team load and key alerts." },
  ],
  all: [
    { id: "all-1", title: "All Team Weekly Report", metric: "5 owners", description: "Combined weekly operation review for all team members." },
    { id: "all-2", title: "Team Workload Balance", metric: "76%", description: "Workload comparison and imbalance signals." },
    { id: "all-3", title: "Cross-Team Risk Log", metric: "4 risks", description: "Risks across quotation, fit-out, PM and solar." },
    { id: "all-4", title: "Executive Action List", metric: "12 actions", description: "Action list that Tammasit should see today." },
  ],
};

export const teamActivityTimeline: TeamActivity[] = [
  { id: "a1", time: "09:30", owner: "Film", activity: "submitted quotation for approval", tone: "warning" },
  { id: "a2", time: "10:15", owner: "Moss", activity: "updated solar output variance", tone: "blue" },
  { id: "a3", time: "11:00", owner: "Kla", activity: "reviewed shop drawing Rev.02", tone: "cyan" },
  { id: "a4", time: "13:30", owner: "Foreman", activity: "updated PM progress and site alerts", tone: "danger" },
  { id: "a5", time: "15:00", owner: "Tammasit", activity: "approved quotation and assigned follow-up", tone: "success" },
];

export const reportInsights: ReportInsight[] = [
  { id: "overdue", title: "Overdue Focus", summary: "7 tasks are overdue across 3 team members.", action: "View overdue focus", tone: "danger" },
  { id: "approval", title: "Approval Bottleneck", summary: "5 quotations are waiting for approval.", action: "View approval queue", tone: "warning" },
  { id: "on-track", title: "On Track", summary: "68% of projects are on track this week.", action: "View project status", tone: "success" },
  { id: "load", title: "Team Load Imbalance", summary: "Film and Foreman have the highest active workload.", action: "View workload detail", tone: "cyan" },
];

export const reportQuickActions = [
  "New Report",
  "Schedule Report",
  "Custom Report",
  "Export Center",
  "Report Settings",
  "Ask AI Summary",
] as const;
