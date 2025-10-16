// components/AppointmentComposer.tsx
// Bottom sheet composer for creating/editing appointments

"use client";

import { useState } from "react";
import type { Appointment } from "@/lib/types";

interface AppointmentComposerProps {
  show: boolean;
  editingId: string | null;
  initialDate: string;
  onClose: () => void;
  onSave: () => void;
}

export default function AppointmentComposer({
  show,
  editingId,
  initialDate,
  onClose,
  onSave,
}: AppointmentComposerProps) {
  const [cTitle, setCTitle] = useState("");
  const [cDate, setCDate] = useState(initialDate);
  const [cTime, setCTime] = useState("08:00");
  const [cDuration, setCDuration] = useState<number>(30);
  const [cPriority, setCPriority] = useState<"high" | "medium" | "low">("medium");
  const [cDesc, setCDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [r1h, setR1h] = useState(false);
  const [r30m, setR30m] = useState(false);
  const [r10m, setR10m] = useState(false);
  const [rAt, setRAt] = useState(false);

  const triggerSelectedReminders = async (appointmentId: string) => {
    const posts: Array<Promise<Response>> = [];
    const payload = { title: cTitle, date: cDate, start: cTime, appointmentId };
    if (r1h) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 60 }) }));
    if (r30m) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 30 }) }));
    if (r10m) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 10 }) }));
    if (rAt) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 0 }) }));
    if (posts.length === 0) return;
    try {
      await Promise.allSettled(posts);
    } catch {}
  };

  const handleSave = async () => {
    if (!cTitle.trim() || !cDate || !cTime || !cDuration) return;
    setSaving(true);
    try {
      const body = {
        title: cTitle.trim(),
        date: cDate,
        start: cTime,
        durationMin: Number(cDuration),
        notes: `[P:${cPriority}] ${cDesc}`.trim(),
        id: editingId ?? undefined,
        remind1h: r1h,
        remind30m: r30m,
        remind10m: r10m,
        remindAtStart: rAt,
      } satisfies Partial<Appointment>;
      
      const res = await fetch("/api/appointments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      const data = await res.json().catch(() => ({} as any));
      if (!data?.ok) throw new Error("save failed");
      
      const savedItem = (data?.item as Appointment | undefined) ?? undefined;
      const apptId = savedItem?.id ?? editingId ?? null;
      
      onSave();
      onClose();
      
      if (apptId) {
        triggerSelectedReminders(apptId).catch((err) => {
          console.error("Failed to trigger reminders:", err);
        });
      }
    } catch {
      // TODO: could toast an error here
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => !saving && onClose()} />
      <div className="relative w-full sm:w-[480px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--fg)]">
            {editingId ? "Edit" : "Add"} Appointment
          </h3>
          <button
            type="button"
            className="text-[var(--fg)]/70 text-sm hover:text-[var(--fg)]"
            onClick={() => !saving && onClose()}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-3 text-sm">
          <label className="grid gap-1">
            <span className="text-[var(--fg)]/70">Title</span>
            <input
              value={cTitle}
              onChange={(e) => setCTitle(e.target.value)}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none focus:ring-1 focus:ring-emerald-600"
              placeholder="What is this?"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-[var(--fg)]/70">Date</span>
              <input
                type="date"
                value={cDate}
                onChange={(e) => setCDate(e.target.value)}
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[var(--fg)]/70">Time</span>
              <input
                type="time"
                value={cTime}
                onChange={(e) => setCTime(e.target.value)}
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-[var(--fg)]/70">Duration (min)</span>
              <input
                type="number"
                min={5}
                step={5}
                value={cDuration}
                onChange={(e) => setCDuration(Number(e.target.value || 0))}
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[var(--fg)]/70">Priority</span>
              <select
                value={cPriority}
                onChange={(e) => setCPriority(e.target.value as any)}
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-[var(--fg)]/70">Description</span>
            <textarea
              value={cDesc}
              onChange={(e) => setCDesc(e.target.value)}
              rows={4}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--fg)] outline-none"
              placeholder="Details, links, context..."
            />
          </label>

          <div className="grid gap-2">
            <span className="text-[var(--fg)]/70">Reminders</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={r1h} onChange={(e) => setR1h(e.target.checked)} />
                <span>1 hour</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={r30m} onChange={(e) => setR30m(e.target.checked)} />
                <span>30 mins</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={r10m} onChange={(e) => setR10m(e.target.checked)} />
                <span>10 mins</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={rAt} onChange={(e) => setRAt(e.target.checked)} />
                <span>At start</span>
              </label>
            </div>
            <p className="text-[10px] text-[var(--fg)]/50">
              Selected reminders will be sent via your notifications webhook.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]/80 hover:bg-[var(--surface-2)]/80"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || !cTitle.trim()}
            onClick={handleSave}
            className="h-9 px-4 rounded-md bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
