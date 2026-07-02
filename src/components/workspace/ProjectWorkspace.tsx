"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, ClipboardList, Plus, Trash2, Users, WalletCards } from "lucide-react";
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

function money(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function moneyFull(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
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
  const summary = useMemo(() => {
    const active = projects.filter((project) => !["Completed", "Cancelled"].includes(project.status)).length;
    const waiting = projects.filter((project) => project.status === "Waiting Approval").length;
    const critical = projects.filter((project) => project.priority === "Critical" || project.priority === "High").length;
    const fitout = projects.filter((project) => project.projectType === "Fit-out").length;
    return { active, waiting, critical, fitout };
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
    <div className="workspace-page">
      <div className="workspace-hero">
        <div>
          <span>PROJECT COMMAND</span>
          <h1>Projects Workspace</h1>
        </div>
        <button className="workspace-primary" onClick={() => setShowCreate(true)} type="button"><Plus size={20} /> Create New Project</button>
      </div>

      {saveMessage ? <div className="admin-notice">{saveMessage}</div> : null}

      <section className="workspace-summary">
        <article><strong>{summary.active}</strong><span>Active Projects</span></article>
        <article><strong>{summary.waiting}</strong><span>Waiting Approval</span></article>
        <article><strong>{summary.critical}</strong><span>High / Critical</span></article>
        <article><strong>{summary.fitout}</strong><span>Fit-out Jobs</span></article>
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

      <div className="workspace-grid">
        <section className="workspace-main-card">
          <div className="workspace-section-title">
            <div><span>PROJECT CARDS</span><h2>Main work list</h2></div>
            <small>Main bar shows time elapsed from start to finish date. Work progress is shown separately.</small>
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
                    <td>฿{money(project.budget)}</td>
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
                    <div className="detail-kpi"><span>Project value</span><strong>฿{moneyFull(selectedProject.budget)}</strong></div>
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
        <p>{workProgress}% work progress / {doneCount}/{tasks.length || 0} linked tasks done / value ฿{moneyFull(project.budget)}</p>
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
