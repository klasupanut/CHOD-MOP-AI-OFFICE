"use client";

import { useMemo, useState } from "react";
import { FileBarChart2 } from "lucide-react";
import type { LiveDashboardData } from "@/lib/dashboard/live-dashboard-data";
import type { TeamReportMemberId } from "@/data/reports";

const tabs: Array<{ id: TeamReportMemberId; label: string }> = [
  { id: "film", label: "Film" },
  { id: "moss", label: "Moss" },
  { id: "kla", label: "Kla" },
  { id: "foreman", label: "Foreman" },
  { id: "tammasit", label: "Tammasit" },
  { id: "all", label: "All Team" },
];

function moneyCompact(value: number) {
  return `฿${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
}

export function ReportByMemberPanel({ data }: { data: LiveDashboardData }) {
  const [selected, setSelected] = useState<TeamReportMemberId>("film");
  const selectedMember = data.reports.teamMembers.find((member) => member.id === selected);
  const modules = useMemo(() => {
    if (selected === "all") {
      return [
        { id: "all-1", title: "All Team Weekly Report", metric: `${data.taskOverview.totalTasks} tasks`, description: "Combined live operation review for all team members." },
        { id: "all-2", title: "Projects & Budgets Portfolio", metric: `${data.projectStatus.reduce((sum, item) => sum + item.value, 0)} projects`, description: "Live project status and budget responsibility grouped by operation state." },
        { id: "all-3", title: "Cross-Team Risk Log", metric: `${data.taskOverview.overdue} overdue`, description: "Live overdue and approval risk summary." },
        { id: "all-4", title: "Executive Action List", metric: `${data.quotation.waitingApproval} approvals`, description: "Live approval queue for Tammasit / super admin." },
      ];
    }

    if (!selectedMember) return [];
    return [
      { id: `${selected}-1`, title: `${selectedMember.name} Task Summary`, metric: `${selectedMember.activeTasks} active`, description: "Live active tasks assigned to this team member." },
      { id: `${selected}-2`, title: "Completed This Week", metric: `${selectedMember.completedThisWeek} done`, description: "Live task completions from the Tasks sheet." },
      {
        id: `${selected}-project-budget`,
        title: "Projects & Budget Summary",
        metric: `${selectedMember.projectSummary.activeProjects} active / ${moneyCompact(selectedMember.projectSummary.totalBudget)}`,
        description: selectedMember.projectSummary.topProjects.length
          ? `Top projects: ${selectedMember.projectSummary.topProjects.join(", ")}.`
          : "No live project assignment found for this member.",
      },
      {
        id: `${selected}-project-risk`,
        title: "Project Risk Watch",
        metric: `${selectedMember.projectSummary.overdueProjects} overdue`,
        description: "Calculated from project due dates and assigned team / project lead mapping.",
      },
      ...selectedMember.kpis.map((kpi, index) => ({
        id: `${selected}-kpi-${index}`,
        title: kpi.label,
        metric: kpi.value,
        description: `Live KPI for ${selectedMember.mainArea}.`,
      })),
      { id: `${selected}-suggested`, title: selectedMember.suggestedReport, metric: "Ready", description: "Report template using the current live operation dataset." },
    ];
  }, [data, selected, selectedMember]);

  return (
    <section className="workspace-main-card reports-by-member">
      <div className="workspace-section-title">
        <div><span>REPORT BY TEAM MEMBER</span><h2>Generate by responsibility</h2></div>
        <small>Select a team member to see report modules calculated from live data.</small>
      </div>
      <div className="reports-member-tabs">
        {tabs.map((tab) => (
          <button className={selected === tab.id ? "active" : ""} type="button" key={tab.id} onClick={() => setSelected(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="reports-module-grid">
        {modules.map((module) => (
          <article key={module.id}>
            <FileBarChart2 size={21} />
            <span>{module.title}</span>
            <strong>{module.metric}</strong>
            <small>{module.description}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
