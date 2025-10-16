// app/schedule/[date]/page.tsx
// Day schedule view with a 24-hour grid

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DayGrid from "@/components/DayGrid";
import AppointmentForm from "@/components/AppointmentForm";
import TemplateSelector from "@/components/TemplateSelector";
import type { Appointment } from "@/lib/types";
import Modal from "@/components/Modal";

function addDays(dateISO: string, delta: number) {
  const [y, m, d] = dateISO.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + delta);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function DayPage() {
  const params = useParams();
  const router = useRouter();
  const date = typeof params?.date === "string" ? params.date : Array.isArray(params?.date) ? params.date[0] : "";

  const isValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? (data.items as Appointment[]) : []);
    } finally {
      setLoading(false);
    }
  }, [date, isValid]);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = (a: Appointment) => {
    // If existed, replace; else add
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = a;
        return copy;
      }
      return [a, ...prev];
    });
    setEditing(null);
    setCreateOpen(false);
  };

  async function onDelete(id: string) {
    await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  if (!isValid) {
    if (typeof window !== "undefined") router.replace("/schedule");
    return null;
  }

  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, +1);

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            onClick={() => router.push(`/schedule/${prevDate}`)}
            aria-label="Previous day"
          >
            ← Prev
          </button>
          <h1 className="text-xl font-semibold">{date}</h1>
          <button
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            onClick={() => router.push(`/schedule/${nextDate}`)}
            aria-label="Next day"
          >
            Next →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d{4}-\d{2}-\d{2}$/.test(v)) router.push(`/schedule/${v}`);
            }}
            className="text-sm px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            aria-label="Pick date"
          />
          <button
            className="text-sm px-3 py-1.5 rounded-md border border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
            onClick={() => setCreateOpen(true)}
            aria-label="Create appointment"
            title="Create appointment"
          >
            + Add
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded-md border border-blue-600 bg-blue-700 text-white hover:bg-blue-600"
            onClick={() => setTemplateOpen(true)}
            aria-label="Apply template"
            title="Apply template"
          >
            📋 Template
          </button>
          <button
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            onClick={() => router.push("/schedule")}
          >
            Back to Overview
          </button>
        </div>
      </div>

      {/* Modal for create/edit */}
      <Modal
        open={createOpen || !!editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        ariaLabel={editing ? "Edit appointment" : "Create appointment"}
      >
        <AppointmentForm
          dateISO={date}
          edit={editing}
          onSaved={onSaved}
          onCancel={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      </Modal>

      {/* Modal for template selection */}
      <Modal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        ariaLabel="Apply template"
      >
        <TemplateSelector
          date={date}
          onApplied={() => {
            setTemplateOpen(false);
            load();
          }}
          onClose={() => setTemplateOpen(false)}
        />
      </Modal>

      <DayGrid dateISO={date} appointments={items} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Appointments</h2>
          {!loading && items.length === 0 && (
            <button
              onClick={() => setTemplateOpen(true)}
              className="text-sm px-4 py-2 rounded-md border border-blue-600 bg-blue-700 text-white hover:bg-blue-600 flex items-center gap-2"
            >
              📋 Insert Template
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center space-y-3">
            <div className="text-gray-500">No appointments yet for this day.</div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCreateOpen(true)}
                className="text-sm px-4 py-2 rounded-md border border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
              >
                + Add Appointment
              </button>
              <button
                onClick={() => setTemplateOpen(true)}
                className="text-sm px-4 py-2 rounded-md border border-blue-600 bg-blue-700 text-white hover:bg-blue-600"
              >
                📋 Insert Template
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="text-sm text-blue-900 dark:text-blue-100">
                Want to add more tasks? Insert a template to quickly populate your schedule.
              </div>
              <button
                onClick={() => setTemplateOpen(true)}
                className="text-xs px-3 py-1.5 rounded-md border border-blue-600 bg-blue-700 text-white hover:bg-blue-600 whitespace-nowrap"
              >
                📋 Insert Template
              </button>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
              {items
                .slice()
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.title}</div>
                    <div className="text-xs text-gray-500 truncate">{a.start} · {a.durationMin}m</div>
                    {a.notes ? <div className="text-xs text-gray-500 truncate">{a.notes}</div> : null}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="text-xs px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                      onClick={() => setEditing(a)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs px-2 py-1 rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-900/30"
                      onClick={() => onDelete(a.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
