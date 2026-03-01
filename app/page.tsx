"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const taskStatuses = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" }
] as const;

export default function Home() {
  const tasks = useQuery(api.tasks.list) ?? [];
  const calendar = useQuery(api.calendar.list) ?? [];
  const team = useQuery(api.team.list) ?? [];

  const createTask = useMutation(api.tasks.create);
  const updateTaskStatus = useMutation(api.tasks.updateStatus);
  const updateTaskAssignee = useMutation(api.tasks.updateAssignee);

  const createCalendar = useMutation(api.calendar.create);
  const updateCalendarStatus = useMutation(api.calendar.updateStatus);

  const createMember = useMutation(api.team.create);
  const updateMemberStatus = useMutation(api.team.updateStatus);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<"assistant" | "user">("assistant");

  const [calTitle, setCalTitle] = useState("");
  const [calType, setCalType] = useState<"scheduled" | "cron">("scheduled");
  const [calOwner, setCalOwner] = useState<"assistant" | "user">("assistant");
  const [calStart, setCalStart] = useState(() => new Date().toISOString().slice(0, 16));
  const [calCron, setCalCron] = useState("0 9 * * *");

  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberType, setMemberType] = useState<"human" | "agent">("agent");

  const taskColumns = useMemo(
    () => taskStatuses.map((s) => ({ ...s, items: tasks.filter((t) => t.status === s.value) })),
    [tasks]
  );

  const onAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createTask({ title: taskTitle.trim(), assignee: taskAssignee });
    setTaskTitle("");
  };

  const onAddCalendar = async (e: FormEvent) => {
    e.preventDefault();
    if (!calTitle.trim()) return;
    await createCalendar({
      title: calTitle.trim(),
      owner: calOwner,
      itemType: calType,
      status: "planned",
      startAt: new Date(calStart).getTime(),
      cronExpr: calType === "cron" ? calCron : undefined
    });
    setCalTitle("");
  };

  const onAddMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberRole.trim()) return;
    await createMember({ name: memberName.trim(), role: memberRole.trim(), type: memberType, status: "online" });
    setMemberName("");
    setMemberRole("");
  };

  return (
    <main className="wrap">
      <h1>Mission Control Dashboard</h1>
      <p className="sub">统一看板：Tasks + Calendar + Team（实时）</p>

      <section className="panel">
        <h2>Tasks Board</h2>
        <form onSubmit={onAddTask} className="inlineForm">
          <input placeholder="New task" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value as "assistant" | "user")}>
            <option value="assistant">笨燕</option>
            <option value="user">一波</option>
          </select>
          <button type="submit">Add Task</button>
        </form>
        <div className="kanban">
          {taskColumns.map((col) => (
            <div key={col.value} className="column">
              <h3>{col.label} ({col.items.length})</h3>
              {col.items.map((t) => (
                <div key={t._id} className="card">
                  <div>{t.title}</div>
                  <div className="row2">
                    <select value={t.status} onChange={(e) => updateTaskStatus({ id: t._id, status: e.target.value as any })}>
                      {taskStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <select value={t.assignee} onChange={(e) => updateTaskAssignee({ id: t._id, assignee: e.target.value as any })}>
                      <option value="assistant">笨燕</option>
                      <option value="user">一波</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="grid2">
        <div className="panel">
          <h2>Calendar</h2>
          <form onSubmit={onAddCalendar} className="form">
            <input placeholder="Title" value={calTitle} onChange={(e) => setCalTitle(e.target.value)} />
            <select value={calType} onChange={(e) => setCalType(e.target.value as any)}>
              <option value="scheduled">Scheduled</option>
              <option value="cron">Cron</option>
            </select>
            <select value={calOwner} onChange={(e) => setCalOwner(e.target.value as any)}>
              <option value="assistant">笨燕</option>
              <option value="user">一波</option>
            </select>
            <input type="datetime-local" value={calStart} onChange={(e) => setCalStart(e.target.value)} />
            {calType === "cron" && <input placeholder="cron" value={calCron} onChange={(e) => setCalCron(e.target.value)} />}
            <button type="submit">Add Calendar Item</button>
          </form>
          <div className="list">
            {calendar.map((c) => (
              <div key={c._id} className="row">
                <div>
                  <b>{c.title}</b>
                  <div className="meta">{new Date(c.startAt).toLocaleString("zh-CN")} · {c.itemType} · {c.owner === "assistant" ? "笨燕" : "一波"}</div>
                </div>
                <select value={c.status} onChange={(e) => updateCalendarStatus({ id: c._id, status: e.target.value as any })}>
                  <option value="planned">planned</option>
                  <option value="running">running</option>
                  <option value="done">done</option>
                  <option value="paused">paused</option>
                  <option value="failed">failed</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Team Overview</h2>
          <form onSubmit={onAddMember} className="form">
            <input placeholder="Name" value={memberName} onChange={(e) => setMemberName(e.target.value)} />
            <input placeholder="Role" value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
            <select value={memberType} onChange={(e) => setMemberType(e.target.value as any)}>
              <option value="agent">Agent</option>
              <option value="human">Human</option>
            </select>
            <button type="submit">Add Member</button>
          </form>
          <div className="list">
            {team.map((m) => (
              <div key={m._id} className="row">
                <div>
                  <b>{m.name}</b>
                  <div className="meta">{m.role} · {m.type}</div>
                </div>
                <select value={m.status} onChange={(e) => updateMemberStatus({ id: m._id, status: e.target.value as any })}>
                  <option value="online">online</option>
                  <option value="busy">busy</option>
                  <option value="offline">offline</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
