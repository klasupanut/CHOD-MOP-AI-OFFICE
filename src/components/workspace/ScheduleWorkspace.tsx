"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Plus,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { scheduleEventTypes, scheduleLocations, scheduleStatuses, type ScheduleEvent, type ScheduleEventType } from "@/data/schedule";
import type { ApprovedUser } from "@/lib/auth/types";

const teamMembers = ["Tammasit", "Film", "Kla", "Foreman", "Moss"];
const commonEventTypes: ScheduleEventType[] = ["Meeting", "Site Visit", "PM Loop", "Approval Deadline", "Quotation Follow-up", "Fit-out Handover", "Solar Check"];
const hiddenPeopleNames = new Set(["CHODTHANAWAT OPERATION TEAM"]);
const characterNameMap = {
  tammasit: "Tammasit",
  film: "Film",
  kla: "Kla",
  moss: "Moss",
  foreman: "Foreman",
} as const;

const eventIconMap: Record<ScheduleEventType, string> = {
  Meeting: "MTG",
  "Site Visit": "SITE",
  "PM Loop": "PM",
  "Approval Deadline": "OK",
  "Quotation Follow-up": "QT",
  "Fit-out Handover": "HD",
  "Solar Check": "SOL",
  Renovation: "REN",
  "Task Due": "DUE",
  "Project Milestone": "MS",
  Other: "*",
};

function todayKey() {
  return localDateKey(new Date());
}

function dateKey(value: string) {
  return String(value || "").slice(0, 10);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateTimeValue(date: Date) {
  return `${localDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isHiddenPeopleName(value: string) {
  return hiddenPeopleNames.has(value.trim().toUpperCase());
}

function displayPersonName(value: string, fallback = "Team") {
  return value && !isHiddenPeopleName(value) ? value : fallback;
}

function ownerNameForUser(user: ApprovedUser) {
  if (user.characterId && user.characterId in characterNameMap) {
    return characterNameMap[user.characterId as keyof typeof characterNameMap];
  }
  return displayPersonName(user.name);
}

function timeLabel(value: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(11, 16) || value;
  return parsed.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "-";
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function isPast(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed < new Date();
}

function delayDays(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((startToday.getTime() - parsed.getTime()) / 86_400_000));
}

function visualStatus(event: ScheduleEvent) {
  if (event.status === "Done" || event.status === "Cancelled") return event.status;
  if (event.status === "Delayed" || isPast(event.endAt || event.startAt)) return "Delayed";
  return event.status;
}

function weekDays() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString("en-GB", { weekday: "short" }),
      date: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    };
  });
}

function newDefaultEvent(user: ApprovedUser): ScheduleEvent {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return {
    eventId: "",
    title: "",
    eventType: "Meeting",
    location: "Head Office",
    owner: ownerNameForUser(user),
    attendees: isHiddenPeopleName(user.name) ? [] : [user.name],
    startAt: localDateTimeValue(start),
    endAt: localDateTimeValue(end),
    status: "Scheduled",
    priority: "Medium",
    relatedModule: "Schedule",
    relatedId: "",
    note: "",
    createdBy: user.name,
    lastUpdate: "",
    source: "manual",
  };
}

export function ScheduleWorkspace({
  currentUser,
  initialEvents,
  dataMessage,
}: {
  currentUser: ApprovedUser;
  initialEvents: ScheduleEvent[];
  dataMessage?: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [editor, setEditor] = useState(() => newDefaultEvent(currentUser));
  const [selectedEventId, setSelectedEventId] = useState("");
  const [notice, setNotice] = useState(dataMessage || "");
  const [isPending, startTransition] = useTransition();
  const days = useMemo(weekDays, []);
  const today = todayKey();

  const visibleEvents = useMemo(() => [...events].sort((a, b) => a.startAt.localeCompare(b.startAt)), [events]);
  const selectedEvent = visibleEvents.find((event) => event.eventId === selectedEventId) || null;
  const selectedEventAttendees = selectedEvent?.attendees.filter((attendee) => !isHiddenPeopleName(attendee)) || [];
  const todayEvents = visibleEvents.filter((event) => dateKey(event.startAt) === today);
  const delayedEvents = visibleEvents
    .filter((event) => visualStatus(event) === "Delayed")
    .sort((a, b) => delayDays(b.startAt) - delayDays(a.startAt));
  const upcomingEvents = visibleEvents.filter((event) => {
    const parsed = new Date(event.startAt);
    if (Number.isNaN(parsed.getTime())) return false;
    const diff = (parsed.getTime() - Date.now()) / 86_400_000;
    return diff >= -1 && diff <= 14;
  });
  const pmDueThisWeek = visibleEvents.filter((event) => event.eventType === "PM Loop" && days.some((day) => day.key === dateKey(event.startAt))).length;
  const approvalDeadlines = visibleEvents.filter((event) => event.eventType === "Approval Deadline" && visualStatus(event) !== "Done").length;
  const siteVisits = visibleEvents.filter((event) => event.eventType === "Site Visit").length;

  function toggleAttendee(name: string) {
    setEditor((event) => ({
      ...event,
      attendees: event.attendees.includes(name)
        ? event.attendees.filter((item) => item !== name)
        : [...event.attendees, name],
    }));
  }

  async function createEvent() {
    setNotice("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: {
              ...editor,
              owner: displayPersonName(editor.owner),
              attendees: editor.attendees.filter((attendee) => !isHiddenPeopleName(attendee)),
            },
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to create schedule event.");
        setEvents((current) => [payload.event, ...current]);
        setSelectedEventId(payload.event.eventId);
        setEditor(newDefaultEvent(currentUser));
        setNotice("Schedule event saved to Google Sheet.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to create schedule event.");
      }
    });
  }

  return (
    <div className="workspace-page schedule-workspace">
      <div className="workspace-hero schedule-hero">
        <div>
          <span>TEAM OPERATION SCHEDULE</span>
          <h1>Calendar / Schedule</h1>
        </div>
        <div className="schedule-live-pill"><CalendarClock size={18} /> Live Tasks / Projects + Schedule events</div>
      </div>

      <section className="schedule-kpi-row">
        <article><Users size={20} /><span>Today Events</span><strong>{todayEvents.length}</strong></article>
        <article><Wrench size={20} /><span>PM Due This Week</span><strong>{pmDueThisWeek}</strong></article>
        <article><CheckCircle2 size={20} /><span>Approval Deadlines</span><strong>{approvalDeadlines}</strong></article>
        <article><MapPin size={20} /><span>Site Visits</span><strong>{siteVisits}</strong></article>
        <article className={delayedEvents.length ? "danger" : "success"}><ShieldAlert size={20} /><span>Delayed Schedule</span><strong>{delayedEvents.length}</strong></article>
      </section>

      <div className="schedule-layout">
        <section className="workspace-main-card schedule-calendar-card">
          <div className="workspace-section-title">
            <div><span>WEEKLY GRID</span><h2>Team calendar control board</h2></div>
            <small>Manual events stay in Schedule tab. Task / Project due dates appear as derived events until dedicated modules go live.</small>
          </div>
          <div className="schedule-week-grid">
            {days.map((day) => {
              const dayEvents = visibleEvents.filter((event) => dateKey(event.startAt) === day.key);
              return (
                <article className={day.key === today ? "today" : ""} key={day.key}>
                  <header><strong>{day.label}</strong><span>{day.date}</span></header>
                  <div className="schedule-day-events">
                    {dayEvents.slice(0, 5).map((event) => (
                      <button
                        className={`schedule-event-pill ${selectedEventId === event.eventId ? "selected" : ""} status-${visualStatus(event).toLowerCase().replace(/\s+/g, "-")} type-${event.eventType.toLowerCase().replace(/\s+/g, "-")}`}
                        key={event.eventId}
                        onClick={() => setSelectedEventId(event.eventId)}
                        type="button"
                      >
                        <b>{eventIconMap[event.eventType]}</b>
                        <span>{timeLabel(event.startAt)} {event.title}</span>
                        {visualStatus(event) === "Delayed" ? <em>+{delayDays(event.startAt)}D</em> : null}
                      </button>
                    ))}
                    {!dayEvents.length ? <p>No schedule</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="workspace-detail-panel schedule-side-panel">
          {selectedEvent ? (
            <section className="schedule-event-detail">
              <div className="schedule-detail-heading">
                <i>{eventIconMap[selectedEvent.eventType]}</i>
                <div>
                  <span>SELECTED EVENT</span>
                  <h3>{selectedEvent.title}</h3>
                </div>
              </div>
              <div className="schedule-detail-grid">
                <article><span>Type</span><strong>{selectedEvent.eventType}</strong></article>
                <article><span>Status</span><strong>{visualStatus(selectedEvent)}</strong></article>
                <article><span>Start</span><strong>{dateLabel(selectedEvent.startAt)} · {timeLabel(selectedEvent.startAt)}</strong></article>
                <article><span>End</span><strong>{dateLabel(selectedEvent.endAt)} · {timeLabel(selectedEvent.endAt)}</strong></article>
                <article><span>Location</span><strong>{selectedEvent.location}</strong></article>
                <article><span>Owner</span><strong>{displayPersonName(selectedEvent.owner)}</strong></article>
                <article><span>Source</span><strong>{selectedEvent.source}</strong></article>
                <article><span>Related</span><strong>{selectedEvent.relatedModule || "-"} {selectedEvent.relatedId ? `/ ${selectedEvent.relatedId}` : ""}</strong></article>
              </div>
              <div className="schedule-detail-note">
                <span>Attendees</span>
                <strong>{selectedEventAttendees.length ? selectedEventAttendees.join(", ") : "-"}</strong>
              </div>
              <div className="schedule-detail-note">
                <span>Note</span>
                <strong>{selectedEvent.note || "No note."}</strong>
              </div>
            </section>
          ) : null}
          <section>
            <h3>Today Agenda</h3>
            {todayEvents.slice(0, 6).map((event) => (
              <button
                className={`agenda-item ${selectedEventId === event.eventId ? "selected" : ""} status-${visualStatus(event).toLowerCase().replace(/\s+/g, "-")}`}
                key={event.eventId}
                onClick={() => setSelectedEventId(event.eventId)}
                type="button"
              >
                <i>{eventIconMap[event.eventType]}</i>
                <div><strong>{timeLabel(event.startAt)} · {event.title}</strong><span>{displayPersonName(event.owner)} / {event.location}</span></div>
              </button>
            ))}
            {!todayEvents.length ? <p className="empty-workspace">No events today.</p> : null}
          </section>
          <section>
            <h3>Schedule Risks</h3>
            {delayedEvents.slice(0, 5).map((event) => (
              <article className="schedule-risk-item" key={event.eventId}>
                <AlertTriangle size={17} />
                <div><strong>{event.title}</strong><span>{displayPersonName(event.owner)} delayed {delayDays(event.startAt)} day{delayDays(event.startAt) === 1 ? "" : "s"}</span></div>
              </article>
            ))}
            {!delayedEvents.length ? <p className="empty-workspace">No schedule delay detected.</p> : null}
          </section>
        </aside>
      </div>

      <section className="workspace-create-panel schedule-create-panel">
        <div>
          <span>CREATE EVENT</span>
          <h2>New schedule event</h2>
          <p>Most common events are meetings and site appointments. Pick a clear icon/type so the team understands the event instantly.</p>
        </div>
        <div className="schedule-common-types">
          {commonEventTypes.map((type) => (
            <button className={editor.eventType === type ? "active" : ""} key={type} onClick={() => setEditor((event) => ({ ...event, eventType: type }))} type="button">
              <b>{eventIconMap[type]}</b>{type}
            </button>
          ))}
        </div>
        <div className="task-create-grid schedule-create-grid">
          <label>Event title<input value={editor.title} onChange={(event) => setEditor((item) => ({ ...item, title: event.target.value }))} placeholder="เช่น Site visit CHOD 3 / Weekly operation meeting" /></label>
          <label>Event type<select value={editor.eventType} onChange={(event) => setEditor((item) => ({ ...item, eventType: event.target.value as ScheduleEventType }))}>{scheduleEventTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Location<select value={editor.location} onChange={(event) => setEditor((item) => ({ ...item, location: event.target.value }))}>{scheduleLocations.map((location) => <option key={location}>{location}</option>)}</select></label>
          <label>Owner<select value={editor.owner} onChange={(event) => setEditor((item) => ({ ...item, owner: event.target.value }))}>{teamMembers.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Start<input type="datetime-local" value={editor.startAt} onChange={(event) => setEditor((item) => ({ ...item, startAt: event.target.value }))} /></label>
          <label>End<input type="datetime-local" value={editor.endAt} onChange={(event) => setEditor((item) => ({ ...item, endAt: event.target.value }))} /></label>
          <label>Status<select value={editor.status} onChange={(event) => setEditor((item) => ({ ...item, status: event.target.value as ScheduleEvent["status"] }))}>{scheduleStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Priority<select value={editor.priority} onChange={(event) => setEditor((item) => ({ ...item, priority: event.target.value as ScheduleEvent["priority"] }))}>{["Low", "Medium", "High", "Critical"].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label className="task-create-wide">Note<textarea value={editor.note} onChange={(event) => setEditor((item) => ({ ...item, note: event.target.value }))} placeholder="Meeting agenda / site appointment detail / risk note" /></label>
          <div className="task-create-wide schedule-attendee-picker">
            <strong>Attendees</strong>
            <div>{teamMembers.map((name) => <button className={editor.attendees.includes(name) ? "on" : ""} key={name} onClick={() => toggleAttendee(name)} type="button"><span />{name}</button>)}</div>
          </div>
          <div className="task-create-actions">
            {notice ? <small>{notice}</small> : null}
            <button className="admin-primary" disabled={isPending || !editor.title || !editor.startAt} onClick={createEvent} type="button"><Plus size={17} />{isPending ? "Saving..." : "Create Event"}</button>
          </div>
        </div>
      </section>

      <section className="workspace-main-card schedule-upcoming-card">
        <div className="workspace-section-title">
          <div><span>UPCOMING 14 DAYS</span><h2>Milestone timeline</h2></div>
        </div>
        <div className="schedule-upcoming-rail">
          {upcomingEvents.slice(0, 14).map((event) => (
            <button
              className={`${selectedEventId === event.eventId ? "selected" : ""} status-${visualStatus(event).toLowerCase().replace(/\s+/g, "-")}`}
              key={event.eventId}
              onClick={() => setSelectedEventId(event.eventId)}
              type="button"
            >
              <b>{eventIconMap[event.eventType]}</b>
              <span>{dateLabel(event.startAt)} · {timeLabel(event.startAt)}</span>
              <strong>{event.title}</strong>
              <small>{event.location} / {displayPersonName(event.owner)}</small>
            </button>
          ))}
          {!upcomingEvents.length ? <p className="empty-workspace">No upcoming schedule in the next 14 days.</p> : null}
        </div>
      </section>
    </div>
  );
}
