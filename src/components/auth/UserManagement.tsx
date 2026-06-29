"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, UserPlus, X } from "lucide-react";
import {
  modulePermissions,
  quotationPermissions,
  roleDefaults,
  roles,
  type Role,
} from "@/lib/auth/permissions";
import type { ApprovedUser } from "@/lib/auth/types";
import type { AgentId } from "@/lib/types";

type EditorState = Omit<ApprovedUser, "userId" | "createdAt" | "updatedAt" | "lastSignInProvider"> & {
  userId?: string;
};

const characterOptions: Array<{ id: AgentId | ""; label: string }> = [
  { id: "", label: "No character" },
  { id: "tammasit", label: "Tammasit" },
  { id: "film", label: "Film" },
  { id: "kla", label: "Kla" },
  { id: "foreman", label: "Foreman" },
  { id: "moss", label: "Moss" },
];

function blankUser(): EditorState {
  return {
    name: "",
    email: "",
    position: "",
    role: "Viewer",
    active: true,
    modulePermissions: roleDefaults.Viewer.modules,
    quotationPermissions: [],
    characterId: "",
  };
}

export function UserManagement({
  initialUsers,
  actorRole,
  storageError,
  protectedSuperAdminEmail,
}: {
  initialUsers: ApprovedUser[];
  actorRole: Role;
  storageError?: string;
  protectedSuperAdminEmail: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [notice, setNotice] = useState(storageError || "");
  const [saving, setSaving] = useState(false);
  const editingProtectedSuperAdmin = editor?.email.toLowerCase() === protectedSuperAdminEmail.toLowerCase();

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) =>
      [user.name, user.email, user.position, user.role, user.characterId || ""].some((field) =>
        field.toLowerCase().includes(value),
      ),
    );
  }, [query, users]);

  function setRole(role: Role) {
    setEditor((current) => current ? {
      ...current,
      role,
      modulePermissions: roleDefaults[role].modules,
      quotationPermissions: roleDefaults[role].quotations,
    } : current);
  }

  function toggle<T extends string>(key: "modulePermissions" | "quotationPermissions", permission: T) {
    setEditor((current) => {
      if (!current) return current;
      const currentList = current[key] as string[];
      const next = currentList.includes(permission)
        ? currentList.filter((item) => item !== permission)
        : [...currentList, permission];
      return { ...current, [key]: next };
    });
  }

  async function save() {
    if (!editor) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: editor.userId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editor),
      });
      const payload = (await response.json()) as { user?: ApprovedUser; error?: string };
      if (!response.ok || !payload.user) {
        setNotice(payload.error || "Unable to save user.");
        return;
      }
      setUsers((current) => editor.userId
        ? current.map((user) => user.userId === payload.user?.userId ? payload.user : user)
        : [...current, payload.user as ApprovedUser]);
      setEditor(null);
      setNotice("User permissions saved.");
    } catch (error) {
      setNotice(error instanceof Error && error.message.toLowerCase().includes("fetch")
        ? "Unable to reach Settings API. Check localhost server/session, then try again."
        : "Unable to save user permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, position, role or character" /></label>
        <button className="admin-primary" onClick={() => setEditor(blankUser())}><UserPlus size={18} /> Add user</button>
      </div>
      {notice ? <div className="admin-notice">{notice}</div> : null}
      <div className="user-table">
        <div className="user-row user-header"><span>User</span><span>Position</span><span>Role</span><span>Character</span><span>Status</span><span /></div>
        {filtered.map((user) => (
          <div className="user-row" key={user.userId}>
            <span><strong>{user.name}</strong><small>{user.email}</small></span>
            <span>{user.position || "—"}</span>
            <span><i className="role-pill">{user.role}</i></span>
            <span>{characterOptions.find((option) => option.id === user.characterId)?.label || "No character"}</span>
            <span className={user.active ? "status-active" : "status-disabled"}>{user.active ? "Active" : "Disabled"}</span>
            <span><button className="admin-secondary" onClick={() => setEditor({ ...user })}>Edit</button></span>
          </div>
        ))}
      </div>

      {editor ? (
        <div className="editor-backdrop">
          <section className="user-editor">
            <header><div><ShieldCheck size={20} /><strong>{editor.userId ? "Edit user" : "Add approved user"}</strong></div><button onClick={() => setEditor(null)} aria-label="Close"><X size={20} /></button></header>
            <div className="editor-grid">
              <label>Name<input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label>
              <label>Email<input type="email" disabled={editingProtectedSuperAdmin} value={editor.email} onChange={(event) => setEditor({ ...editor, email: event.target.value })} /></label>
              <label>Position<input value={editor.position} onChange={(event) => setEditor({ ...editor, position: event.target.value })} /></label>
              <label>Office character<select value={editor.characterId || ""} onChange={(event) => setEditor({ ...editor, characterId: event.target.value as AgentId | "" })}>
                {characterOptions.map((option) => <option value={option.id} key={option.id || "none"}>{option.label}</option>)}
              </select></label>
              <label>Role<select disabled={editingProtectedSuperAdmin} value={editor.role} onChange={(event) => setRole(event.target.value as Role)}>
                {roles.filter((role) => actorRole === "Super Admin" || role !== "Super Admin").map((role) => <option value={role} key={role}>{role}</option>)}
              </select></label>
              <label className="active-toggle"><input type="checkbox" disabled={editingProtectedSuperAdmin} checked={editor.active} onChange={(event) => setEditor({ ...editor, active: event.target.checked })} /> Active user</label>
            </div>
            <div className="permission-section"><h3>Module permissions</h3><div className="permission-grid">
              {modulePermissions.map((permission) => <label key={permission}><input type="checkbox" checked={editor.modulePermissions.includes(permission)} onChange={() => toggle("modulePermissions", permission)} /> {permission}</label>)}
            </div></div>
            <div className="permission-section"><h3>Quotation permissions</h3><div className="permission-grid quotation-permission-grid">
              {quotationPermissions.map((permission) => <label key={permission}><input type="checkbox" checked={editor.quotationPermissions.includes(permission)} onChange={() => toggle("quotationPermissions", permission)} /> {permission}</label>)}
            </div></div>
            <footer><button className="admin-secondary" onClick={() => setEditor(null)}>Cancel</button><button className="admin-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save permissions"}</button></footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
