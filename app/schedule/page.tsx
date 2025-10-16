// app/schedule/page.tsx
// Schedule Overview 2.0: day navigator with 24-hour appointment grid plus urgent/today summaries.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import type { Appointment } from "@/lib/types";
import TemplateSelector from "@/components/TemplateSelector";
import ScheduleComposer from "@/components/ScheduleComposer";
import Modal from "@/components/Modal";
import CalendarView from "@/components/CalendarView";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const ROW_PX = 64; // target pixel height for each hour row

const formatHourLabel = (hour: number) => `${hour.toString().padStart(2, "0")}:00`;

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseISOToDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map((chunk) => Number(chunk));
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatLongDate = (iso: string) => {
  const date = parseISOToDate(iso);
  // Deterministic formatting to avoid SSR/CSR locale differences
  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  const w = weekdays[date.getDay()];
  const m = months[date.getMonth()];
  const d = String(date.getDate()).padStart(2, "0");
  // Example: "Friday 26 Sept"
  return `${w} ${d} ${m}`;
};

const parseTimeToMinutes = (time: string) => {
  const [hh, mm] = time.split(":").map((chunk) => Number(chunk));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
};

export default function ScheduleOverviewPage() {
  const urgentTodos = useAppStore((state) => state.urgentTodos);
  const todayTasks = useAppStore((state) => state.todayTasks);
  const loadUrgentTodos = useAppStore((state) => state.loadUrgentTodos);
  const loadTodayTasks = useAppStore((state) => state.loadTodayTasks);
  const hideSleepingHours = useAppStore((state) => state.hideSleepingHours);
  const sleepStartHour = useAppStore((state) => state.sleepStartHour);
  const sleepEndHour = useAppStore((state) => state.sleepEndHour);

  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()))
;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const datePickerRef = useRef<HTMLInputElement | null>(null);

  const loadAppointments = useCallback(async (dateISO: string) => {
    setLoadingAppointments(true);
    try {
      const res = await fetch(`/api/appointments?date=${encodeURIComponent(dateISO)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({} as any));
      const items = Array.isArray(data?.items) ? (data.items as Appointment[]) : [];
      setAppointments(items);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    loadUrgentTodos();
    loadTodayTasks();
  }, [loadUrgentTodos, loadTodayTasks]);

  useEffect(() => {
    loadAppointments(selectedDate);
  }, [selectedDate, loadAppointments]);

  // Tick every 30s to keep "Now" indicators fresh without heavy updates.
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const summary = useMemo(() => {
    const openUrgent = urgentTodos.filter((todo) => !todo.done).length;
    const openToday = todayTasks.filter((task) => !task.done).length;
    return `${openUrgent} urgent · ${openToday} today`;
  }, [urgentTodos, todayTasks]);

  const dayAppointments = useMemo(() => {
    return appointments
      .map((appt) => {
        const startMinutes = parseTimeToMinutes(appt.start);
        const endMinutes = startMinutes + (Number(appt.durationMin) || 0);
        return { ...appt, startMinutes, endMinutes };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [appointments]);

  const appointmentCount = dayAppointments.length;

  const isToday = useMemo(() => selectedDate === toISODate(now), [selectedDate, now]);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(now);
  }, [now]);

  // Auto-scroll to current hour on today
  useEffect(() => {
    if (!isToday || loadingAppointments) return;
    const el = typeof document !== "undefined" ? document.getElementById(`hour-${currentHour}`) : null;
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isToday, currentHour, selectedDate, loadingAppointments]);

  // Determine if an hour should be hidden based on sleep window.
  const isHourHidden = useCallback((hour: number) => {
    if (!hideSleepingHours) return false;
    const start = Math.max(0, Math.min(23, Number(sleepStartHour) || 0));
    const end = Math.max(0, Math.min(23, Number(sleepEndHour) || 0));
    if (start === end) return false; // no hiding when identical
    // If window does not cross midnight (e.g., 23 -> 23 excluded above, otherwise 1->7)
    if (start < end) {
      return hour >= start && hour < end;
    }
    // Crosses midnight (e.g., 22 -> 8): hide hours >= start OR < end
    return hour >= start || hour < end;
  }, [hideSleepingHours, sleepStartHour, sleepEndHour]);

  const formatTimeRange = (start: string, durationMin: number) => {
    const startDate = new Date(`2000-01-01T${start}`);
    if (Number.isNaN(startDate.getTime())) return start;
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
    const format = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${format.format(startDate)} – ${format.format(endDate)}`;
  };

  const goToOffset = (offset: number) => {
    const next = parseISOToDate(selectedDate);
    next.setDate(next.getDate() + offset);
    setSelectedDate(toISODate(next));
  };

  const handleDateInput = (value: string) => {
    if (!value) return;
    setSelectedDate(value);
  };

  // Bottom sheet composer state
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Composer state
  const [cTitle, setCTitle] = useState("");
  const [cDate, setCDate] = useState<string>(() => toISODate(new Date()));
  const [cTime, setCTime] = useState("08:00");
  const [cDuration, setCDuration] = useState<number>(30);
  const [cPriority, setCPriority] = useState<"high" | "medium" | "low">("medium");
  const [cDesc, setCDesc] = useState("");
  const [r1h, setR1h] = useState(false);
  const [r30m, setR30m] = useState(false);
  const [r10m, setR10m] = useState(false);
  const [rAt, setRAt] = useState(false);

  const openComposer = () => {
    setCTitle("");
    setCDate(selectedDate);
    setCTime(new Date().toTimeString().slice(0,5));
    setCDuration(30);
    setCPriority("medium");
    setCDesc("");
    setEditingId(null);
    // reset reminders
    setR1h(false);
    setR30m(false);
    setR10m(false);
    setRAt(false);
    setShowComposer(true);
  };

  const openComposerForEdit = (appt: Appointment) => {
    setCTitle(appt.title || "");
    setCDate(appt.date);
    setCTime(appt.start);
    setCDuration(Number(appt.durationMin || 30));
    // parse priority from notes prefix [P:x]
    const note = appt.notes || "";
    const m = note.match(/^\[P:(high|medium|low)\]\s*/i);
    const priority = (m?.[1]?.toLowerCase() as "high" | "medium" | "low") || "medium";
    const clean = m ? note.slice(m[0].length) : note;
    setCPriority(priority);
    setCDesc(clean);
    setEditingId(appt.id);
    // load persisted reminder flags (default false)
    setR1h(Boolean((appt as any).remind1h));
    setR30m(Boolean((appt as any).remind30m));
    setR10m(Boolean((appt as any).remind10m));
    setRAt(Boolean((appt as any).remindAtStart));
    setShowComposer(true);
  };


  const handleDeleteAppointment = async (id: string) => {
    try {
      await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAppointments(selectedDate);
    } catch {}
  };

  const parsePriority = (notes?: string): { p: "high"|"medium"|"low"; text: string } => {
    const note = notes || "";
    const m = note.match(/^\[P:(high|medium|low)\]\s*/i);
    const p = (m?.[1]?.toLowerCase() as "high" | "medium" | "low") || "medium";
    const text = m ? note.slice(m[0].length) : note;
    return { p, text };
  };

  const priorityStyles: Record<"high"|"medium"|"low", string> = {
    high: "bg-red-600/15 text-red-400 border-red-700/40",
    medium: "bg-amber-600/15 text-amber-400 border-amber-700/40",
    low: "bg-emerald-600/15 text-emerald-400 border-emerald-700/40",
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar with action buttons */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--border)] rounded-t-lg">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo/logo.png"
                alt="Eeko logo"
                width={22}
                height={22}
                className="opacity-90 [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                priority
              />
              <span className="text-sm font-medium text-[var(--fg)]/85">Eeko</span>
              <span className="text-[10px] font-normal text-[var(--fg)]/35">v.25</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Today button */}
              <button
                type="button"
                onClick={() => setSelectedDate(toISODate(new Date()))}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="Jump to today"
                title="Jump to today"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                  <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Calendar view button */}
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="Calendar view"
                title="Calendar view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                  <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Template button */}
              <button
                type="button"
                onClick={() => setTemplateOpen(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="Insert template"
                title="Insert template"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 0 1 3.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 0 1 3.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 0 1-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875Zm6.905 9.97a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72V18a.75.75 0 0 0 1.5 0v-4.19l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3Z" clipRule="evenodd" />
                  <path d="M14.25 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 16.5 7.5h-1.875a.375.375 0 0 1-.375-.375V5.25Z" />
                </svg>
              </button>
              
              {/* Add task button */}
              <button
                type="button"
                onClick={openComposer}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="Add task"
                title="Add task"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Mobile-only hamburger */}
              <div className="md:hidden">
                <Sidebar variant="top" />
              </div>
            </div>
          </div>

          {/* Day navigator row below header (previously part of header) */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-[var(--border)]">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => goToOffset(-1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] transition"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Pick date"
              onClick={() => {
                const el = datePickerRef.current as any;
                if (!el) return;
                if (typeof el.showPicker === "function") el.showPicker();
                else el.click();
              }}
              className="min-w-[160px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-sm font-semibold text-[var(--fg)] shadow-inner hover:bg-[var(--surface-2)]/80"
            >
              {formatLongDate(selectedDate)}
            </button>
            <input
              ref={datePickerRef}
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateInput(e.target.value)}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              aria-label="Next day"
              onClick={() => goToOffset(1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] transition"
            >
              →
            </button>
          </div>

          {/* Summary section */}
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold text-[var(--fg)]">{summary}</div>
              <span className="text-xs text-[var(--fg)]/60 uppercase">{appointmentCount} appointments on this day</span>
            </div>
          </div>

          {/* Sticky Now indicator for today */}
          {isToday ? (
            <div className="sticky top-[46px] z-10 mx-3 mt-2 mb-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/90 px-3 py-1 text-xs text-[var(--fg)] shadow-subtle">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                <span className="font-medium">Now</span>
                <span className="opacity-70">{nowLabel}</span>
              </div>
            </div>
          ) : null}

          {/* 24-hour schedule grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-3">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-[var(--fg)]">24-hour schedule</h2>
                <p className="text-xs text-[var(--fg)]/60">Plan your {formatLongDate(selectedDate).toLowerCase()} at a glance.</p>
              </div>

              {loadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin" aria-label="Loading appointments" />
                </div>
              ) : (
                <div className="space-y-2">
                  {HOURS.filter((h) => !isHourHidden(h)).map((hour) => {
                    const items = dayAppointments.filter((appt) => Math.floor(appt.startMinutes / 60) === hour);
                    return (
                      <div id={`hour-${hour}`} key={hour} className={`pb-2 last:pb-0 ${isToday && hour === currentHour ? "bg-[var(--surface-2)]/40" : ""}`}>
                        <div className="relative flex gap-3">
                          <div className={`w-16 flex-shrink-0 text-xs font-semibold pt-1 ${isToday && hour === currentHour ? "text-emerald-500" : "text-[var(--fg)]/60"}`}>
                            {formatHourLabel(hour)}
                          </div>
                          <div className="flex-1 min-w-0 relative overflow-visible" style={{ minHeight: ROW_PX }}>
                            {items.length === 0 ? (
                              <span className="text-xs text-[var(--fg)]/40">—</span>
                            ) : (
                              <>
                                {items.map((appt) => {
                                  const { p, text } = parsePriority(appt.notes);
                                  // Calculate how many hour blocks this appointment spans
                                  const durationHours = Math.ceil(appt.durationMin / 60);
                                  // Each block: ROW_PX (64) + pb-2 (8) = 72px, plus space-y-2 (8px) between blocks
                                  // For 1-hour tasks, add bottom padding to match multi-hour spacing
                                  const heightPx = durationHours === 1 
                                    ? ROW_PX + 8  // 64 + 8 = 72px (includes bottom padding)
                                    : (durationHours * ROW_PX) + ((durationHours - 1) * 8) + ((durationHours - 1) * 8);
                                  
                                  return (
                                    <div
                                      key={appt.id}
                                      className="absolute left-0 right-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 shadow-subtle"
                                      style={{ 
                                        height: `${heightPx}px`,
                                        top: 0,
                                        zIndex: 1
                                      }}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex items-center gap-2">
                                          <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[p]}`}>{p}</span>
                                          <h3 className="truncate font-semibold text-[var(--fg)] text-sm">{appt.title}</h3>
                                        </div>
                                        <span className="whitespace-nowrap text-xs text-[var(--fg)]/60">
                                          {formatTimeRange(appt.start, appt.durationMin)}
                                        </span>
                                      </div>
                                      {text ? (
                                        <p className="mt-1 text-xs text-[var(--fg)]/70 line-clamp-3">{text}</p>
                                      ) : null}
                                      <div className="mt-2 flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          className="h-7 px-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/80 hover:bg-[var(--surface-2)] text-xs"
                                          onClick={() => openComposerForEdit(appt)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="h-7 px-2 rounded-md border border-red-800/40 bg-red-900/20 text-red-300 hover:bg-red-900/30 text-xs"
                                          onClick={() => handleDeleteAppointment(appt.id)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                            {/* Current time line within the current hour (minute-level offset) */}
                            {isToday && hour === currentHour ? (
                              <div className="absolute left-16 right-0" style={{ top: Math.round(4 + (currentMinute / 60) * (ROW_PX - 8)) }}>
                                <div className="h-[2px] bg-emerald-500/80" />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {appointmentCount === 0 && !loadingAppointments ? (
                <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)]/50 text-center">
                  No appointments scheduled for this day. Add one to populate the grid.
                </div>
              ) : null}
            </div>
          </div>


          {/* Template selector modal */}
          <Modal
            open={templateOpen}
            onClose={() => setTemplateOpen(false)}
            ariaLabel="Apply template"
          >
            <TemplateSelector
              date={selectedDate}
              onApplied={() => {
                setTemplateOpen(false);
                loadAppointments(selectedDate);
              }}
              onClose={() => setTemplateOpen(false)}
            />
          </Modal>

          {/* Calendar view modal */}
          <Modal
            open={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            ariaLabel="Calendar view"
          >
            <CalendarView
              selectedDate={selectedDate}
              onSelectDate={(dateISO) => {
                setSelectedDate(dateISO);
                setCalendarOpen(false);
              }}
              onClose={() => setCalendarOpen(false)}
            />
          </Modal>

          {/* Appointment Composer */}
          <ScheduleComposer
            show={showComposer}
            editingId={editingId}
            initialDate={cDate}
            initialTitle={cTitle}
            initialTime={cTime}
            initialDuration={cDuration}
            initialPriority={cPriority}
            initialDesc={cDesc}
            initialR1h={r1h}
            initialR30m={r30m}
            initialR10m={r10m}
            initialRAt={rAt}
            onClose={() => setShowComposer(false)}
            onSave={() => loadAppointments(selectedDate)}
          />
        </div>
      </div>
    </div>
  );
}
