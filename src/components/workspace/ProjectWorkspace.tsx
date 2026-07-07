"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  PieChart,
  Plus,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import { chodProjectSites, projectPriorities, projectTypes, type ProjectRecord } from "@/data/projects";
import { teamMembers, type TaskRecord } from "@/data/tasks";
import type { ApprovedUser } from "@/lib/auth/types";
import { calculateProjectProgressFromTasks, calculateProjectTimeProgress, getProjectProgress } from "@/lib/projects/project-utils";

const statusTone: Record<string, string> = {
  Planning: "bg-slate-500/15 text-slate-200 border-slate-400/20",
  "In Progress": "bg-cyan-400/12 text-cyan-100 border-cyan-300/30",
  "Waiting Approval": "bg-amber-400/12 text-amber-100 border-amber-300/35",
  "On Hold": "bg-blue-400/12 text-blue-100 border-blue-300/25",
  Completed: "bg-emerald-400/12 text-emerald-100 border-emerald-300/30",
  Cancelled: "bg-red-400/12 text-red-100 border-red-300/30",
};

const projectStatuses: ProjectRecord["status"][] = ["Planning", "In Progress", "Waiting Approval", "On Hold", "Completed", "Cancelled"];
const projectTeamMembers = teamMembers.filter((person) => person !== "Foreman");
const activeBudgetStatuses = new Set<ProjectRecord["status"]>(["Planning", "In Progress", "Waiting Approval", "On Hold", "Completed"]);
const budgetStatusColors: Record<ProjectRecord["status"], string> = {
  Planning: "#61b6a9",
  "In Progress": "#2fae78",
  "Waiting Approval": "#e2a63a",
  "On Hold": "#4e78d8",
  Completed: "#16a36f",
  Cancelled: "#d64e5b",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function moneyFull(value: number) {
  return `฿${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)}`;
}

function percent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseProjectDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value.slice(0, 10));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isProjectOverdue(project: ProjectRecord) {
  const dueDate = parseProjectDate(project.dueDate);
  if (!dueDate || ["Completed", "Cancelled"].includes(project.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function buildStatusGradient(rows: Array<{ label: ProjectRecord["status"]; value: number; color: string }>) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!total) return "conic-gradient(rgba(117,155,181,.18) 0 100%)";
  let cursor = 0;
  const segments = rows.map((row) => {
    const start = cursor;
    cursor += (row.value / total) * 100;
    return `${row.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function projectTouchesPerson(project: ProjectRecord, person: string) {
  const target = person.toLowerCase();
  return project.projectManager.toLowerCase() === target || project.assignedTeam.some((member) => member.toLowerCase() === target);
}

function buildBudgetSummary(projects: ProjectRecord[], tasks: TaskRecord[]) {
  const totalBudget = projects.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
  const activeBudget = projects
    .filter((project) => activeBudgetStatuses.has(project.status))
    .reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
  const ongoingBudget = projects
    .filter((project) => !["Completed", "Cancelled"].includes(project.status))
    .reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
  const completedProjects = projects.filter((project) => project.status === "Completed");
  const liveProjects = projects.filter((project) => project.status !== "Cancelled");
  const waitingProjects = projects.filter((project) => project.status === "Waiting Approval");
  const riskProjects = projects.filter((project) => project.priority === "High" || project.priority === "Critical" || isProjectOverdue(project));
  const averageProgress = projects.length
    ? percent(projects.reduce((sum, project) => sum + getProjectProgress(project, tasks), 0) / projects.length)
    : 0;
  const doneRate = liveProjects.length ? percent((completedProjects.length / liveProjects.length) * 100) : 0;
  const utilization = totalBudget ? percent((activeBudget / totalBudget) * 100) : 0;
  const statusRows = projectStatuses.map((status) => ({
    label: status,
    value: projects.filter((project) => project.status === status).length,
    color: budgetStatusColors[status],
  })).filter((row) => row.value > 0);
  const pipelineRows = ["Planning", "In Progress", "Waiting Approval", "Completed"].map((status) => {
    const statusProjects = projects.filter((project) => project.status === status);
    return {
      label: status,
      value: statusProjects.length,
      percent: projects.length ? percent((statusProjects.length / projects.length) * 100) : 0,
    };
  });
  const typeRows = projectTypes.map((type) => {
    const typeProjects = projects.filter((project) => project.projectType === type);
    const value = typeProjects.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
    return { label: type, value, count: typeProjects.length };
  }).filter((row) => row.value > 0 || row.count > 0).sort((a, b) => b.value - a.value).slice(0, 5);
  const maxTypeValue = Math.max(...typeRows.map((row) => row.value), 1);
  const ownerRows = projectTeamMembers.map((person) => {
    const ownedProjects = projects.filter((project) => projectTouchesPerson(project, person));
    const active = ownedProjects.filter((project) => !["Completed", "Cancelled"].includes(project.status)).length;
    const budget = ownedProjects.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
    const overdue = ownedProjects.filter(isProjectOverdue).length;
    return { person, active, budget, overdue, total: ownedProjects.length };
  });

  return {
    totalBudget,
    activeBudget,
    ongoingBudget,
    utilization,
    doneRate,
    waitingCount: waitingProjects.length,
    riskCount: riskProjects.length,
    averageProgress,
    statusRows,
    pipelineRows,
    typeRows,
    maxTypeValue,
    ownerRows,
  };
}

function canManageProjects(user: ApprovedUser) {
  return user.role === "Super Admin" || user.characterId === "tammasit";
}

function createEmptyProject(actor: string): ProjectRecord {
  return {
    projectId: "",
    projectName: chodProjectSites[0],
    projectType: "General",
    site: chodProjectSites[0],
    description: "",
    status: "Planning",
    priority: "Medium",
    startDate: "",
    dueDate: "",
    projectManager: "Kla",
    createdBy: actor,
    assignedTeam: ["Kla"],
    budget: 0,
    linkedTasks: [],
    linkedDocuments: [],
    linkedQuotations: [],
    lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
}

export function ProjectWorkspace({
  currentUser,
  initialProjects,
  initialTasks,
  dataMessage,
}: {
  currentUser: ApprovedUser;
  initialProjects: ProjectRecord[];
  initialTasks: TaskRecord[];
  dataMessage?: string;
}) {
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [tasks] = useState<TaskRecord[]>(initialTasks);
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.projectId ?? "");
  const [tab, setTab] = useState("Overview");
  const [showCreate, setShowCreate] = useState(false);
  const [saveMessage, setSaveMessage] = useState(dataMessage || "");
  const allowProjectAdmin = canManageProjects(currentUser);
  const [newProject, setNewProject] = useState<ProjectRecord>(() => createEmptyProject(currentUser.name));

  const selectedProject = projects.find((project) => project.projectId === selectedId) ?? projects[0];
  const linkedTasks = tasks.filter((task) => task.projectId === selectedProject?.projectId);
  const budgetSummary = useMemo(() => buildBudgetSummary(projects, tasks), [projects, tasks]);
  const summary = useMemo(() => {
    const active = projects.filter((project) => !["Completed", "Cancelled"].includes(project.status)).length;
    const waiting = projects.filter((project) => project.status === "Waiting Approval").length;
    const critical = projects.filter((project) => project.priority === "Critical" || project.priority === "High").length;
    const budgeted = projects.filter((project) => Number(project.budget) > 0).length;
    return { active, waiting, critical, budgeted };
  }, [projects]);

  async function persistProject(projectId: string, patch: Partial<ProjectRecord>) {
    setSaveMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, patch }),
      });
      const payload = (await response.json()) as { project?: ProjectRecord; error?: string };
      if (!response.ok || !payload.project) throw new Error(payload.error || "Unable to update project.");
      setProjects((current) => current.map((project) => project.projectId === payload.project?.projectId ? payload.project : project));
      setSaveMessage("Project saved to Google Sheet.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to update project.");
    }
  }

  const patchSelectedProject = (patch: Partial<ProjectRecord>) => {
    if (!selectedProject || !allowProjectAdmin) return;
    setProjects((current) =>
      current.map((project) =>
        project.projectId === selectedProject.projectId
          ? { ...project, ...patch, lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " ") }
          : project,
      ),
    );
    void persistProject(selectedProject.projectId, patch);
  };

  const toggleAssignedPerson = (person: string) => {
    if (!selectedProject || !allowProjectAdmin) return;
    const nextTeam = selectedProject.assignedTeam.includes(person)
      ? selectedProject.assignedTeam.filter((member) => member !== person)
      : [...selectedProject.assignedTeam, person];
    patchSelectedProject({ assignedTeam: nextTeam });
  };

  const toggleNewProjectTeamMember = (person: string) => {
    setNewProject((project) => {
      const assignedTeam = project.assignedTeam.includes(person)
        ? project.assignedTeam.filter((member) => member !== person)
        : [...project.assignedTeam, person];
      return { ...project, assignedTeam };
    });
  };

  const createProject = async () => {
    const typeCode = newProject.projectType.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "GENERAL";
    const project: ProjectRecord = {
      ...newProject,
      projectId: `PRJ-${typeCode}-${Date.now().toString().slice(-6)}`,
      projectName: newProject.projectName || newProject.site,
      site: newProject.site || newProject.projectName,
      description: newProject.description || "Created from CHOD MOP OFFICE Projects menu.",
      createdBy: currentUser.name,
      lastUpdate: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setSaveMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      const payload = (await response.json()) as { project?: ProjectRecord; error?: string };
      if (!response.ok || !payload.project) throw new Error(payload.error || "Unable to create project.");
      setProjects((current) => [payload.project!, ...current]);
      setSelectedId(payload.project.projectId);
      setSaveMessage("Project created in Google Sheet.");
      setNewProject(createEmptyProject(currentUser.name));
      setShowCreate(false);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to create project.");
    }
  };

  const deleteSelectedProject = async () => {
    if (!selectedProject || !allowProjectAdmin) return;
    if (!window.confirm(`Delete project "${selectedProject.projectName}" from Google Sheet? Linked tasks will not be deleted.`)) return;
    setSaveMessage("");
    try {
      const response = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.projectId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to delete project.");
      setProjects((current) => current.filter((project) => project.projectId !== selectedProject.projectId));
      setSelectedId("");
      setSaveMessage("Project deleted from Google Sheet.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to delete project.");
    }
  };

  return (
    <div className="workspace-page projects-budget-workspace">
      <div className="workspace-hero projects-budget-hero">
        <div>
          <span>PROJECTS & BUDGET UTILIZE</span>
          <h1>Projects & Budgets</h1>
        </div>
        <button className="workspace-primary" onClick={() => setShowCreate(true)} type="button"><Plus size={20} /> Create New Project</button>
      </div>

      {saveMessage ? <div className="admin-notice">{saveMessage}</div> : null}

      <section className="budget-utilize-kpi-row">
        <article><span>Total Project Value</span><strong>{moneyFull(budgetSummary.totalBudget)}</strong><small>{projects.length} project rows</small></article>
        <article><span>Budget Utilization</span><strong>{budgetSummary.utilization}%</strong><small>{moneyFull(budgetSummary.activeBudget)} active / approved value</small></article>
        <article><span>Ongoing Budget</span><strong>{moneyFull(budgetSummary.ongoingBudget)}</strong><small>{summary.active} active projects</small></article>
        <article><span>Waiting Approval</span><strong>{summary.waiting}</strong><small>{moneyFull(projects.filter((project) => project.status === "Waiting Approval").reduce((sum, project) => sum + (Number(project.budget) || 0), 0))}</small></article>
        <article><span>Risk Projects</span><strong>{summary.critical}</strong><small>High / Critical priority</small></article>
        <article><span>Budgeted Projects</span><strong>{summary.budgeted}</strong><small>Rows with project value</small></article>
      </section>

      {showCreate ? (
        <section className="workspace-create-panel task-create-panel">
          <div>
            <span>LIVE CREATE</span>
            <h2>Create project in Google Sheet</h2>
          </div>
          <div className="task-create-grid">
            <label>Project<select value={newProject.site} onChange={(event) => setNewProject((project) => ({ ...project, site: event.target.value, projectName: event.target.value }))}>{chodProjectSites.map((site) => <option key={site} value={site}>{site}</option>)}</select></label>
            <label>Project type<select value={newProject.projectType} onChange={(event) => setNewProject((project) => ({ ...project, projectType: event.target.value as ProjectRecord["projectType"] }))}>{projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label>Project Lead<select value={newProject.projectManager} onChange={(event) => setNewProject((project) => ({ ...project, projectManager: event.target.value }))}>{projectTeamMembers.map((person) => <option key={person} value={person}>{person}</option>)}</select></label>
            <label>Priority<select value={newProject.priority} onChange={(event) => setNewProject((project) => ({ ...project, priority: event.target.value as ProjectRecord["priority"] }))}>{projectPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
            <label>Start date<input type="date" value={newProject.startDate} onChange={(event) => setNewProject((project) => ({ ...project, startDate: event.target.value }))} /></label>
            <label>Due date<input type="date" value={newProject.dueDate} onChange={(event) => setNewProject((project) => ({ ...project, dueDate: event.target.value }))} /></label>
            <label>Project value<input type="number" min="0" value={newProject.budget} onChange={(event) => setNewProject((project) => ({ ...project, budget: Number(event.target.value) || 0 }))} /></label>
            <div className="task-create-wide project-create-team">
              <span>Assigned team</span>
              <div className="project-team-editor">
                {projectTeamMembers.map((person) => (
                  <button key={person} type="button" className={newProject.assignedTeam.includes(person) ? "on" : ""} onClick={() => toggleNewProjectTeamMember(person)}>
                    <span className="team-tick-dot" /> {person}
                  </button>
                ))}
              </div>
            </div>
            <label className="task-create-wide">Description<textarea value={newProject.description} onChange={(event) => setNewProject((project) => ({ ...project, description: event.target.value }))} placeholder="Project detail / short memo" /></label>
            <div className="workspace-create-actions task-create-actions">
              <button type="button" onClick={createProject}>Create Project</button>
              <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="budget-utilize-overview">
        <div className="budget-utilize-band">
          <div>
            <span>LIVE PROJECT VALUE OVERVIEW</span>
            <h2>Budget Utilize Summary</h2>
            <div className="budget-utilize-band-metrics">
              <p><small>Total</small><strong>{money(budgetSummary.totalBudget)}</strong></p>
              <p><small>Projects</small><strong>{projects.length}</strong></p>
              <p><small>Ongoing</small><strong>{money(budgetSummary.ongoingBudget)}</strong></p>
            </div>
          </div>
          <div className="budget-utilize-rate">
            <span>Done rate</span>
            <strong>{budgetSummary.doneRate}%</strong>
            <small>{budgetSummary.averageProgress}% avg work progress</small>
          </div>
          <div className="budget-utilize-progress">
            <span>Utilization</span>
            <strong>{budgetSummary.utilization}%</strong>
            <i><b style={{ width: `${budgetSummary.utilization}%` }} /></i>
          </div>
        </div>

        <div className="budget-utilize-analysis-grid">
          <article className="budget-utilize-card status-share">
            <header><PieChart size={20} /><div><span>Status share</span><strong>Project status mix</strong></div></header>
            <div className="budget-status-body">
              <div
                className="budget-status-donut"
                style={{ "--budget-status-gradient": buildStatusGradient(budgetSummary.statusRows) } as CSSProperties}
              >
                <div><strong>{projects.length}</strong><span>projects</span></div>
              </div>
              <ul>
                {budgetSummary.statusRows.map((row) => (
                  <li key={row.label}><i style={{ background: row.color }} /><span>{row.label}</span><strong>{row.value}</strong></li>
                ))}
                {!budgetSummary.statusRows.length ? <li><span>No live projects</span><strong>0</strong></li> : null}
              </ul>
            </div>
          </article>

          <article className="budget-utilize-card progress-pipeline">
            <header><Activity size={20} /><div><span>Progress pipeline</span><strong>Planning to completed</strong></div></header>
            <div className="budget-pipeline-bars">
              {budgetSummary.pipelineRows.map((row) => (
                <p key={row.label}>
                  <span>{row.label}</span>
                  <i><b style={{ height: `${Math.max(row.percent, row.value ? 10 : 3)}%` }} /></i>
                  <strong>{row.percent}%</strong>
                </p>
              ))}
            </div>
          </article>

          <article className="budget-utilize-card budget-code-chart">
            <header><BarChart3 size={20} /><div><span>Budget type chart</span><strong>Project value by type</strong></div></header>
            <div className="budget-type-bars">
              {budgetSummary.typeRows.map((row) => (
                <p key={row.label}>
                  <span>{row.label}</span>
                  <i><b style={{ width: `${percent((row.value / budgetSummary.maxTypeValue) * 100)}%` }} /></i>
                  <strong>{money(row.value)}</strong>
                </p>
              ))}
              {!budgetSummary.typeRows.length ? <p><span>No budget data</span><i><b style={{ width: "0%" }} /></i><strong>0</strong></p> : null}
            </div>
          </article>

          <article className="budget-utilize-card owner-budget-summary">
            <header><Users size={20} /><div><span>Character project summary</span><strong>Assigned value by person</strong></div></header>
            <div className="owner-budget-grid">
              {budgetSummary.ownerRows.map((row) => (
                <p key={row.person}>
                  <span>{row.person}</span>
                  <strong>{money(row.budget)}</strong>
                  <small>{row.active} active / {row.total} total{row.overdue ? ` / ${row.overdue} overdue` : ""}</small>
                </p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="workspace-main-card">
          <div className="workspace-section-title">
            <div><span>PROJECT REGISTER</span><h2>Live projects & budget list</h2></div>
            <small>Main bar shows time elapsed from start to finish date. Work progress and budget value are shown separately.</small>
          </div>
          <div className="project-card-grid">
            {projects.map((project) => {
              const timeProgress = calculateProjectTimeProgress(project);
              const workProgress = getProjectProgress(project, tasks);
              return (
                <button key={project.projectId} type="button" onClick={() => setSelectedId(project.projectId)} className={`project-card ${selectedProject?.projectId === project.projectId ? "selected" : ""}`}>
                  <div className="project-card-top"><span>{project.projectType}</span><em className={statusTone[project.status]}>{project.status}</em></div>
                  <h3>{project.projectName}</h3>
                  <p>{project.site}</p>
                  <div className="progress-line time"><i style={{ width: `${timeProgress}%` }} /></div>
                  <footer><span>{timeProgress}% time elapsed</span><strong>{workProgress}% work</strong></footer>
                </button>
              );
            })}
          </div>

          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead><tr><th>Project</th><th>Type</th><th>Project Lead</th><th>Start</th><th>Due</th><th>Value</th><th>Tasks</th></tr></thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.projectId} onClick={() => setSelectedId(project.projectId)}>
                    <td>{project.projectName}</td>
                    <td>{project.projectType}</td>
                    <td>{project.projectManager}</td>
                    <td>{project.startDate}</td>
                    <td>{project.dueDate}</td>
                    <td>{moneyFull(project.budget)}</td>
                    <td>{tasks.filter((task) => task.projectId === project.projectId).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!projects.length ? <p className="empty-workspace">No live project rows found. Add rows in the Projects tab of the configured Google Sheet.</p> : null}
          </div>
        </section>

        <aside className="workspace-detail-panel">
          {selectedProject ? (
            <>
              <div className="detail-heading">
                <span>{selectedProject.projectType}</span>
                <h2>{selectedProject.projectName}</h2>
                <p>{selectedProject.description}</p>
                {allowProjectAdmin ? <button type="button" className="danger-action inline-danger" onClick={deleteSelectedProject}><Trash2 size={16} /> Delete project</button> : null}
              </div>
              <div className="detail-tabs">
                {["Overview", "Timeline", "Tasks", "Team", "Approvals", "Activity"].map((item) => (
                  <button key={item} className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)}>{item}</button>
                ))}
              </div>
              {tab === "Overview" ? (
                <>
                  <div className="detail-stack">
                    <div className="detail-kpi"><span>Time Progress</span><strong>{calculateProjectTimeProgress(selectedProject)}%</strong></div>
                    <div className="detail-kpi"><span>Work Progress</span><strong>{getProjectProgress(selectedProject, tasks)}%</strong></div>
                    <div className="detail-kpi"><span>Priority</span><strong>{selectedProject.priority}</strong></div>
                    <div className="detail-kpi"><span>Start date</span><strong>{selectedProject.startDate}</strong></div>
                    <div className="detail-kpi"><span>Due date</span><strong>{selectedProject.dueDate}</strong></div>
                    <div className="detail-kpi"><span>Project value</span><strong>{moneyFull(selectedProject.budget)}</strong></div>
                  </div>
                  {allowProjectAdmin ? (
                    <ProjectAdminEditor project={selectedProject} onPatch={patchSelectedProject} onTogglePerson={toggleAssignedPerson} />
                  ) : null}
                </>
              ) : null}
              {tab === "Timeline" ? <ProjectTimeline project={selectedProject} tasks={linkedTasks} /> : null}
              {tab === "Tasks" ? <LinkedTasks tasks={linkedTasks} /> : null}
              {tab === "Team" ? <TeamList team={selectedProject.assignedTeam} editable={allowProjectAdmin} onTogglePerson={toggleAssignedPerson} /> : null}
              {tab === "Approvals" ? <ChipList values={linkedTasks.filter((task) => task.status === "Waiting Approval").map((task) => task.taskTitle)} empty="No approvals waiting." /> : null}
              {tab === "Activity" ? <ActivityList project={selectedProject} /> : null}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function ProjectAdminEditor({
  project,
  onPatch,
  onTogglePerson,
}: {
  project: ProjectRecord;
  onPatch: (patch: Partial<ProjectRecord>) => void;
  onTogglePerson: (person: string) => void;
}) {
  return (
    <section className="project-admin-editor">
      <h3>Admin Project Controls</h3>
      <div className="project-admin-grid">
        <label>
          <CalendarDays size={16} /> Start date
          <input type="date" value={project.startDate} onChange={(event) => onPatch({ startDate: event.target.value })} />
        </label>
        <label>
          <CalendarDays size={16} /> End date
          <input type="date" value={project.dueDate} onChange={(event) => onPatch({ dueDate: event.target.value })} />
        </label>
        <label>
          <ClipboardList size={16} /> Project status
          <select value={project.status} onChange={(event) => onPatch({ status: event.target.value as ProjectRecord["status"] })}>
            {projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <WalletCards size={16} /> Project value
          <input type="number" min="0" value={project.budget} onChange={(event) => onPatch({ budget: Number(event.target.value) || 0 })} />
        </label>
      </div>
      <div className="project-team-editor">
        {projectTeamMembers.map((person) => (
          <button key={person} className={project.assignedTeam.includes(person) ? "on" : ""} type="button" onClick={() => onTogglePerson(person)}>
            <Users size={15} /> {person}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProjectTimeline({ project, tasks }: { project: ProjectRecord; tasks: TaskRecord[] }) {
  const workProgress = calculateProjectProgressFromTasks(project.projectId, tasks);
  const timeProgress = calculateProjectTimeProgress(project);
  const doneCount = tasks.filter((task) => task.status === "Done").length;
  return (
    <div className="project-timeline">
      <article>
        <span className="timeline-dot" />
        <small>START</small>
        <strong>{project.startDate}</strong>
        <p>{project.projectName} opened at {project.site}</p>
      </article>
      <article>
        <span className="timeline-dot active" />
        <small>NOW</small>
        <strong>{timeProgress}% time elapsed</strong>
        <p>{workProgress}% work progress / {doneCount}/{tasks.length || 0} linked tasks done / value {moneyFull(project.budget)}</p>
      </article>
      <article>
        <span className="timeline-dot" />
        <small>TARGET</small>
        <strong>{project.dueDate}</strong>
        <p>Assigned: {project.assignedTeam.join(", ") || "No owner assigned"}</p>
      </article>
    </div>
  );
}

function LinkedTasks({ tasks }: { tasks: TaskRecord[] }) {
  return (
    <div className="detail-list">
      {tasks.map((task) => (
        <article key={task.taskId}>
          <ClipboardList size={16} />
          <div><strong>{task.taskTitle}</strong><span>{task.assignedTo} · {task.status} · {task.progress}%</span></div>
        </article>
      ))}
    </div>
  );
}

function TeamList({ team, editable, onTogglePerson }: { team: string[]; editable?: boolean; onTogglePerson?: (person: string) => void }) {
  return (
    <div className="team-chip-grid">
      {projectTeamMembers.map((person) => (
        editable ? (
          <button key={person} type="button" onClick={() => onTogglePerson?.(person)} className={team.includes(person) ? "on" : ""}><Users size={15} /> {person}</button>
        ) : (
          <span key={person} className={team.includes(person) ? "on" : ""}><Users size={15} /> {person}</span>
        )
      ))}
    </div>
  );
}

function ChipList({ values, empty, icon }: { values: string[]; empty: string; icon?: ReactNode }) {
  return <div className="chip-list">{values.length ? values.map((value) => <span key={value}>{icon}{value}</span>) : <p>{empty}</p>}</div>;
}

function ActivityList({ project }: { project: ProjectRecord }) {
  return (
    <div className="activity-mini">
      <p><strong>{project.createdBy || "System"}</strong> created / updated this project.</p>
      <p><strong>Last update</strong> {project.lastUpdate || "-"}</p>
    </div>
  );
}
