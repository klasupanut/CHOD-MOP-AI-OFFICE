"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, RotateCcw, Trash2, UserRound } from "lucide-react";
import { chodProjectSites, type ProjectRecord } from "@/data/projects";
import { teamMembers, type TaskCategory, type TaskPriority, type TaskRecord, type TaskStatus } from "@/data/tasks";
import type { ApprovedUser } from "@/lib/auth/types";
import { getTasksByPerson, updateTaskNote, updateTaskProgress, updateTaskStatus } from "@/lib/tasks/task-utils";

const columns: TaskStatus[] = ["To Do", "In Progress", "Waiting Approval", "Done", "Overdue"];
const taskMenuPeople = teamMembers.filter((person) => person !== "Foreman");
const taskCategories: TaskCategory[] = ["PM", "Renovation", "Fit-out", "Solar", "Electrical", "Quotation", "Document", "Approval", "Site", "General"];
const taskPriorities: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

const characterNameMap = {
  tammasit: "Tammasit",
  film: "Film",
  kla: "Kla",
  moss: "Moss",
  foreman: "Foreman",
} as const;

function getUserTaskOwner(user: ApprovedUser) {
  if (user.characterId && user.characterId in characterNameMap) {
    return characterNameMap[user.characterId as keyof typeof characterNameMap];
  }
  return user.name || user.email;
}

function canSeeAllTasks(user: ApprovedUser) {
  return user.role === "Super Admin" || user.characterId === "tammasit";
}

function createEmptyTask(owner: string, actor: string): TaskRecord {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  return {
    taskId: "",
    projectId: "",
    taskTitle: "",
    taskDescription: "",
    category: "General",
    assignedTo: owner,
    assignedBy: actor,
    updatedBy: actor,
    status: "To Do",
    priority: "Medium",
    dueDate: "",
    progress: 0,
    note: "",
    sourceModule: "Tasks",
    lastUpdate: now,
    createdAt: now,
  };
}

export function TaskWorkspace({
  currentUser,
  initialTasks,
  initialProjects,
  dataMessage,
}: {
  currentUser: ApprovedUser;
  initialTasks: TaskRecord[];
  initialProjects: ProjectRecord[];
  dataMessage?: string;
}) {
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [projects] = useState<ProjectRecord[]>(initialProjects);
  const [filter, setFilter] = useState(canSeeAllTasks(currentUser) ? "All Tasks" : "My Tasks");
  const [selectedId, setSelectedId] = useState(initialTasks[0]?.taskId ?? "");
  const [noteDraft, setNoteDraft] = useState("");
  const [saveMessage, setSaveMessage] = useState(dataMessage || "");
  const taskOwner = getUserTaskOwner(currentUser);
  const showAllTasks = canSeeAllTasks(currentUser);
  const canAssignTasks = showAllTasks;
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState<TaskRecord>(() => createEmptyTask(taskOwner, currentUser.name));
  const progressSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleTasks = useMemo(() => {
    return showAllTasks ? tasks : getTasksByPerson(taskOwner, tasks);
  }, [showAllTasks, taskOwner, tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "All Tasks" || filter === "My Tasks") return visibleTasks;
    if (showAllTasks && taskMenuPeople.includes(filter as typeof taskMenuPeople[number])) {
      return getTasksByPerson(filter, visibleTasks);
    }
    return visibleTasks.filter((task) => task.status === filter || task.priority === filter || task.projectId === filter);
  }, [filter, showAllTasks, visibleTasks]);

  const selectedTask = visibleTasks.find((task) => task.taskId === selectedId) ?? visibleTasks[0];
  const projectOptions = useMemo(() => {
    const liveOptions = projects.map((project) => ({ value: project.projectId, label: project.projectName }));
    const siteOptions = chodProjectSites
      .filter((site) => !liveOptions.some((option) => option.value === site || option.label === site))
      .map((site) => ({ value: site, label: site }));
    return [...siteOptions, ...liveOptions];
  }, [projects]);
  const projectLabel = (projectId?: string) => {
    if (!projectId) return "Standalone";
    return projects.find((project) => project.projectId === projectId)?.projectName ?? projectId;
  };

  useEffect(() => {
    if (!visibleTasks.length) {
      setSelectedId("");
      return;
    }
    if (!visibleTasks.some((task) => task.taskId === selectedId)) {
      setSelectedId(visibleTasks[0].taskId);
    }
  }, [selectedId, visibleTasks]);

  useEffect(() => {
    return () => {
      if (progressSaveTimer.current) clearTimeout(progressSaveTimer.current);
    };
  }, []);

  const summary = {
    total: visibleTasks.length,
    overdue: visibleTasks.filter((task) => task.status === "Overdue").length,
    waiting: visibleTasks.filter((task) => task.status === "Waiting Approval").length,
    done: visibleTasks.filter((task) => task.status === "Done").length,
  };

  async function persistTask(taskId: string, patch: Partial<TaskRecord>) {
    setSaveMessage("");
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, patch }),
      });
      const payload = (await response.json()) as { task?: TaskRecord; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error || "Unable to update task.");
      setTasks((current) => current.map((task) => task.taskId === payload.task?.taskId ? payload.task : task));
      setSaveMessage("Task saved to Google Sheet.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to update task.");
    }
  }

  function clearProgressSaveTimer() {
    if (!progressSaveTimer.current) return;
    clearTimeout(progressSaveTimer.current);
    progressSaveTimer.current = null;
  }

  function scheduleProgressPersist(taskId: string, progress: number) {
    clearProgressSaveTimer();
    progressSaveTimer.current = setTimeout(() => {
      void persistTask(taskId, { progress });
      progressSaveTimer.current = null;
    }, 650);
  }

  const updateSelectedStatus = (status: TaskStatus) => {
    if (!selectedTask) return;
    clearProgressSaveTimer();
    setTasks((current) => updateTaskStatus(selectedTask.taskId, status, taskOwner, current));
    void persistTask(selectedTask.taskId, status === "Done" ? { status, progress: 100 } : { status });
  };

  const updateSelectedProgress = (progress: number) => {
    if (!selectedTask) return;
    const nextProgress = Math.max(0, Math.min(100, progress));
    setTasks((current) => updateTaskProgress(selectedTask.taskId, nextProgress, taskOwner, current));
    scheduleProgressPersist(selectedTask.taskId, nextProgress);
  };

  const saveNote = () => {
    if (!selectedTask || !noteDraft.trim()) return;
    setTasks((current) => updateTaskNote(selectedTask.taskId, noteDraft.trim(), taskOwner, current));
    void persistTask(selectedTask.taskId, { note: noteDraft.trim() });
    setNoteDraft("");
  };

  async function createTask() {
    if (!newTask.taskTitle.trim()) {
      setSaveMessage("Task title is required.");
      return;
    }
    setSaveMessage("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            ...newTask,
            taskId: `TSK-${Date.now()}`,
            taskTitle: newTask.taskTitle.trim(),
            taskDescription: newTask.taskDescription.trim(),
            projectId: newTask.projectId || projectOptions[0]?.value || undefined,
            assignedTo: canAssignTasks ? newTask.assignedTo : taskOwner,
            assignedBy: currentUser.name,
            updatedBy: currentUser.name,
            sourceModule: "Tasks",
          },
        }),
      });
      const payload = (await response.json()) as { task?: TaskRecord; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error || "Unable to create task.");
      setTasks((current) => [payload.task!, ...current]);
      setSelectedId(payload.task.taskId);
      setNewTask(createEmptyTask(taskOwner, currentUser.name));
      setShowCreate(false);
      setSaveMessage("Task created in Google Sheet.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to create task.");
    }
  }

  async function deleteSelectedTask() {
    if (!selectedTask) return;
    if (!window.confirm(`Delete task "${selectedTask.taskTitle}" from Google Sheet?`)) return;
    setSaveMessage("");
    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.taskId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to delete task.");
      setTasks((current) => current.filter((task) => task.taskId !== selectedTask.taskId));
      setSelectedId("");
      setSaveMessage("Task deleted from Google Sheet.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to delete task.");
    }
  }

  const peopleToShow = (showAllTasks ? taskMenuPeople : [taskOwner]).filter((person) =>
    taskMenuPeople.includes(person as typeof taskMenuPeople[number]),
  );

  return (
    <div className="workspace-page">
      <div className="workspace-hero">
        <div>
          <span>TASK COMMAND</span>
          <h1>Tasks Workspace</h1>
        </div>
        <button className="workspace-primary" type="button" onClick={() => setShowCreate((current) => !current)}><ClipboardList size={20} /> New Task</button>
      </div>

      {saveMessage ? <div className="admin-notice">{saveMessage}</div> : null}

      {showCreate ? (
        <section className="workspace-create-panel task-create-panel">
          <div>
            <span>LIVE CREATE</span>
            <h2>Create task in Google Sheet</h2>
          </div>
          <div className="task-create-grid">
            <label>Task title<input value={newTask.taskTitle} onChange={(event) => setNewTask((task) => ({ ...task, taskTitle: event.target.value }))} placeholder="เช่น Follow up quotation approval" /></label>
            {canAssignTasks ? (
              <label>Assigned to<select value={newTask.assignedTo} onChange={(event) => setNewTask((task) => ({ ...task, assignedTo: event.target.value }))}>{teamMembers.map((person) => <option key={person} value={person}>{person}</option>)}</select></label>
            ) : (
              <label>Assigned to<input value={taskOwner} disabled readOnly /></label>
            )}
            <label>Project<select value={newTask.projectId || projectOptions[0]?.value || ""} onChange={(event) => setNewTask((task) => ({ ...task, projectId: event.target.value }))}>{projectOptions.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}</select></label>
            <label>Category<select value={newTask.category} onChange={(event) => setNewTask((task) => ({ ...task, category: event.target.value as TaskCategory }))}>{taskCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Priority<select value={newTask.priority} onChange={(event) => setNewTask((task) => ({ ...task, priority: event.target.value as TaskPriority }))}>{taskPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
            <label>Due date<input type="date" value={newTask.dueDate} onChange={(event) => setNewTask((task) => ({ ...task, dueDate: event.target.value }))} /></label>
            <label className="task-create-wide">Description<textarea value={newTask.taskDescription} onChange={(event) => setNewTask((task) => ({ ...task, taskDescription: event.target.value }))} placeholder="รายละเอียดงาน / memo สั้น ๆ" /></label>
            <div className="workspace-create-actions task-create-actions">
              <button type="button" onClick={createTask}>Create Task</button>
              <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="workspace-summary">
        <article><strong>{summary.total}</strong><span>Total Tasks</span></article>
        <article><strong>{summary.overdue}</strong><span>Overdue</span></article>
        <article><strong>{summary.waiting}</strong><span>Waiting Approval</span></article>
        <article><strong>{summary.done}</strong><span>Done</span></article>
      </section>

      <div className="task-filter-bar">
        {[
          showAllTasks ? "All Tasks" : "My Tasks",
          ...(showAllTasks ? taskMenuPeople : []),
          "Waiting Approval",
          "High",
          "Critical",
        ].map((item) => (
          <button key={item} className={filter === item ? "active" : ""} type="button" onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      <div className="workspace-grid">
        <section className="workspace-main-card">
          <div className="workspace-section-title">
            <div><span>BOARD VIEW</span><h2>Work tracking columns</h2></div>
            <small>{showAllTasks ? "All task lanes are visible." : "Only your assigned work is visible in this menu."}</small>
          </div>
          <div className="task-board">
            {columns.map((column) => (
              <div key={column} className="task-column">
                <header><strong>{column}</strong><span>{filteredTasks.filter((task) => task.status === column).length}</span></header>
                {filteredTasks.filter((task) => task.status === column).map((task) => (
                  <button key={task.taskId} type="button" onClick={() => setSelectedId(task.taskId)} className={`task-card ${selectedTask?.taskId === task.taskId ? "selected" : ""}`}>
                    <span>{task.category}</span>
                    <strong>{task.taskTitle}</strong>
                    <small>{task.assignedTo} · due {task.dueDate || "-"}</small>
                    <div className={`progress-line ${task.status === "Done" ? "done" : ""}`}><i style={{ width: `${task.progress}%` }} /></div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <section className="person-task-lists">
            <div className="workspace-section-title"><div><span>BY PERSON</span><h2>{showAllTasks ? "Task Lists by Person" : "My Task List"}</h2></div></div>
            <div className="person-grid">
              {peopleToShow.map((person) => (
                <article key={person}>
                  <h3><UserRound size={17} /> {person} task list</h3>
                  {getTasksByPerson(person, visibleTasks).slice(0, 4).map((task) => (
                    <button key={task.taskId} type="button" onClick={() => setSelectedId(task.taskId)}>{task.taskTitle}<span>{task.status}</span></button>
                  ))}
                </article>
              ))}
            </div>
          </section>

          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead><tr><th>Task</th><th>Project</th><th>Assigned</th><th>Status</th><th>Priority</th><th>Progress</th></tr></thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.taskId} onClick={() => setSelectedId(task.taskId)}>
                    <td>{task.taskTitle}</td>
                    <td>{projectLabel(task.projectId)}</td>
                    <td>{task.assignedTo}</td>
                    <td>{task.status}</td>
                    <td>{task.priority}</td>
                    <td>{task.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredTasks.length ? <p className="empty-workspace">No live task rows found. Add rows in the Tasks tab of the configured Google Sheet.</p> : null}
          </div>
        </section>

        <aside className="workspace-detail-panel">
          {selectedTask ? (
            <>
              <div className="detail-heading">
                <span>{selectedTask.category}</span>
                <h2>{selectedTask.taskTitle}</h2>
                <p>{selectedTask.taskDescription}</p>
              </div>
              <div className="detail-stack">
                <div className="detail-kpi"><span>Parent project</span><strong>{projectLabel(selectedTask.projectId)}</strong></div>
                <div className="detail-kpi"><span>Assigned to</span><strong>{selectedTask.assignedTo}</strong></div>
                <div className="detail-kpi"><span>Status</span><strong>{selectedTask.status}</strong></div>
                <div className="detail-kpi"><span>Priority</span><strong>{selectedTask.priority}</strong></div>
                <div className="detail-kpi"><span>Due date</span><strong>{selectedTask.dueDate || "-"}</strong></div>
                <div className="detail-kpi"><span>Last updated by</span><strong>{selectedTask.updatedBy}</strong></div>
              </div>

              <section className="quick-update">
                <h3>Quick Update</h3>
                <div className="quick-status-grid">
                  {columns.map((status) => <button key={status} type="button" onClick={() => updateSelectedStatus(status)}>{status}</button>)}
                </div>
                <label>
                  Progress {selectedTask.progress}%
                  <input type="range" min="0" max="100" value={selectedTask.progress} onChange={(event) => updateSelectedProgress(Number(event.target.value))} />
                </label>
                <textarea placeholder="Add note / memo..." value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
                <button type="button" onClick={saveNote}><RotateCcw size={16} /> Add note</button>
                <button type="button" onClick={() => updateSelectedStatus("Done")}><CheckCircle2 size={16} /> Mark done</button>
                <button type="button" className="danger-action" onClick={deleteSelectedTask}><Trash2 size={16} /> Delete task</button>
              </section>

              <section className="task-note-box">
                <strong>Current memo</strong>
                <p>{selectedTask.note}</p>
                <small>Activity: {selectedTask.updatedBy} updated this task at {selectedTask.lastUpdate}</small>
              </section>
            </>
          ) : (
            <div className="detail-heading">
              <span>NO TASK</span>
              <h2>No assigned task found</h2>
              <p>No live Google Sheet task row is visible for this user.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
