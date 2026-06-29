import { mockProjects } from "./projects";
import { mockTasks } from "./tasks";
import { mockQuotationApprovals } from "./quotation-approvals";
import { activities } from "./mock-dashboard";

export const dashboardModules = {
  projects: mockProjects,
  tasks: mockTasks,
  pmLoop: {
    compliance: 92,
    overdue: 3,
    nearCycleAlerts: 5,
    workOrdersThisWeek: 27,
  },
  renovation: {
    activeJobs: 3,
    majorJobs: 2,
    drawingReviews: 4,
    riskJobs: 1,
  },
  fitout: {
    activeJobs: 8,
    mini: 5,
    mega: 3,
    pendingApproval: 3,
    overdue: 2,
    handoverPending: 2,
  },
  solar: {
    sites: 6,
    totalCapacityKw: 820,
    todayOutputKwh: 2457,
    monthlyGenerationKwh: 68400,
    varianceAlerts: 1,
    systemWarnings: 1,
  },
  quotations: {
    totalPendingValue: 1334290 + 104165,
    approvedThisMonth: 2,
    rejectedOrRevision: 1,
    mainApprover: "Tammasit",
  },
  annualDivisionRevenue: {
    year: 2026,
    fitout: {
      revenue: 4_290_000,
      profit: 1_390_000,
      note: "CHOD Fit-out revenue, contractor cost excluded",
    },
    quotation: {
      revenue: 1_438_455,
      profit: 287_691,
      note: "CHOD quotation selling revenue, contractor cost excluded",
    },
  },
  approvals: mockQuotationApprovals,
  documents: {
    missing: 2,
    expiring: 3,
    indexed: 48,
  },
  activities,
  upcomingDeadlines: [
    { id: "ddl-fitout-b8", label: "Fit-out B8 quotation approval", owner: "Tammasit", due: "Today", tone: "warning" },
    { id: "ddl-pm-chod2", label: "PM Loop CHOD2", owner: "Foreman", due: "Tomorrow", tone: "danger" },
    { id: "ddl-solar-km8", label: "Solar report KM8", owner: "Moss", due: "Jun 29", tone: "info" },
    { id: "ddl-renovation", label: "Renovation progress update", owner: "Kla", due: "Jun 30", tone: "info" },
  ],
};

export type DashboardModules = typeof dashboardModules;
