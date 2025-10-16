/**
 * lib/meds.ts
 * Medication helpers: time formatting and due-check logic.
 */

export type SimpleMedication = {
  id: string;
  name: string;
  webhook: string;
  times: string[]; // HH:mm
  repeat: "daily" | "every_other_day" | "weekly" | "monthly";
  daysOfWeek?: number[]; // 0..6
  dayOfMonth?: number; // 1..31
  startDateIso?: string; // baseline for every-other-day
  active?: boolean;
};

export function hhmmInTz(d: Date, tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  } catch {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function dateInTz(d: Date, tz: string) {
  // Return yyyy-mm-dd for the given date rendered in tz
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(d); // yyyy-mm-dd
}

function weekdayInTz(d: Date, tz: string) {
  // 0..6 (Sun..Sat)
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).formatToParts(d);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd as keyof typeof map] ?? d.getUTCDay();
}

function dayOfMonthInTz(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit" }).formatToParts(d);
  const dd = Number(parts.find((p) => p.type === "day")?.value || d.getUTCDate());
  return dd;
}

function daysBetween(aIso: string, bIso: string) {
  const a = new Date(aIso + "T00:00:00Z");
  const b = new Date(bIso + "T00:00:00Z");
  const diff = Math.floor((b.getTime() - a.getTime()) / 86400000);
  return diff;
}

export function dueMedicationIds(now: Date, tz: string, meds: SimpleMedication[]) {
  const hhmm = hhmmInTz(now, tz);
  const todayIso = dateInTz(now, tz);
  const weekday = weekdayInTz(now, tz);
  const dom = dayOfMonthInTz(now, tz);

  return meds
    .filter((m) => !!m.active && Array.isArray(m.times) && m.times.includes(hhmm))
    .filter((m) => {
      switch (m.repeat) {
        case "daily":
          return true;
        case "every_other_day": {
          const start = m.startDateIso || todayIso;
          const delta = daysBetween(start, todayIso);
          return delta % 2 === 0;
        }
        case "weekly":
          return Array.isArray(m.daysOfWeek) ? m.daysOfWeek.includes(weekday) : true;
        case "monthly":
          return m.dayOfMonth ? m.dayOfMonth === dom : dom === 1;
        default:
          return false;
      }
    })
    .map((m) => m.id);
}
