// components/MedicationForm.tsx
// Form to add/edit a medication with multiple times and repeat rules.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useMedsStore } from "@/lib/store-meds";
import type { MedicationConfig, MedicationRepeat } from "@/lib/types";
import { uid } from "@/lib/id";

const REPEAT_OPTIONS: MedicationRepeat[] = [
  "daily",
  "every_other_day",
  "weekly",
  "monthly",
];

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type Props = {
  editId?: string | null;
  onDone?: () => void;
};

export default function MedicationForm({ editId, onDone }: Props) {
  const { medications, addMedication, updateMedication } = useMedsStore();
  const editing = useMemo(() => medications.find((m) => m.id === editId), [medications, editId]);

  const [name, setName] = useState(editing?.name ?? "");
  const [webhook, setWebhook] = useState(editing?.webhook ?? "");
  const [timesRaw, setTimesRaw] = useState((editing?.times ?? ["08:00"]).join(", "));
  const [repeat, setRepeat] = useState<MedicationRepeat>(editing?.repeat ?? "daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(editing?.daysOfWeek ?? []);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(editing?.dayOfMonth ?? undefined);
  const [startDateIso, setStartDateIso] = useState<string>(editing?.startDateIso ?? "");
  const [emojiPath, setEmojiPath] = useState<string>(editing?.emojiPath ?? "/images/emojis/happy.png");
  const [cardText, setCardText] = useState<string>(editing?.cardText ?? "Time to take your medication 💊");
  const [buttons, setButtons] = useState<string>((editing?.buttons ?? ["Taken","Snooze","Skip"]).join(", "));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setWebhook(editing.webhook);
    setTimesRaw((editing.times ?? []).join(", "));
    setRepeat(editing.repeat);
    setDaysOfWeek(editing.daysOfWeek ?? []);
    setDayOfMonth(editing.dayOfMonth ?? undefined);
    setStartDateIso(editing.startDateIso ?? "");
    setEmojiPath(editing.emojiPath ?? "/images/emojis/happy.png");
    setCardText(editing.cardText ?? "Time to take your medication 💊");
    setButtons((editing.buttons ?? ["Taken","Snooze","Skip"]).join(", "));
  }, [editId]);

  function parseTimes(v: string) {
    return v
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function toggleWeekday(idx: number) {
    setDaysOfWeek((arr) => (arr.includes(idx) ? arr.filter((x) => x !== idx) : [...arr, idx].sort()));
  }

  async function submit() {
    const times = parseTimes(timesRaw);
    if (!name.trim()) { setError("Name is required"); return; }
    if (times.length === 0) { setError("At least one time (HH:mm) is required"); return; }
    if (repeat === "weekly" && daysOfWeek.length === 0) { setError("Select at least one weekday for weekly repeat"); return; }
    if (repeat === "monthly" && !dayOfMonth) { setError("Specify day of month for monthly repeat"); return; }
    if (repeat === "every_other_day" && !startDateIso) { setError("Set a start date for every other day cadence"); return; }
    setError(null);

    const payload: MedicationConfig = {
      id: editing?.id ?? uid("med"),
      name: name.trim(),
      webhook: webhook.trim(),
      times,
      repeat,
      daysOfWeek: repeat === "weekly" ? daysOfWeek : undefined,
      dayOfMonth: repeat === "monthly" ? Number(dayOfMonth) : undefined,
      startDateIso: repeat === "every_other_day" ? startDateIso : undefined,
      active: true,
      emojiPath: emojiPath || "/images/emojis/happy.png",
      cardText: cardText || "Time to take your medication 💊",
      buttons: buttons.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const ok = editing
      ? await updateMedication(payload.id, payload)
      : await addMedication(payload);
    if (ok) onDone?.();
    else setError("Save failed. Please retry.");
  }

  return (
    <div className="space-y-3 border rounded-md p-3 dark:border-gray-800">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Name *</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Webhook URL</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://... (leave empty for mock)" />
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>Times (comma-separated)</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={timesRaw} onChange={(e) => setTimesRaw(e.target.value)} placeholder="08:00, 20:00" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Repeat</span>
          <select className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={repeat} onChange={(e) => setRepeat(e.target.value as MedicationRepeat)}>
            {REPEAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>
        {repeat === "monthly" && (
          <label className="flex flex-col gap-1 text-sm">
            <span>Day of month</span>
            <input type="number" min={1} max={31} className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={dayOfMonth ?? 1} onChange={(e) => setDayOfMonth(Number(e.target.value))} />
          </label>
        )}
      </div>

      {repeat === "weekly" && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {WEEKDAYS.map((d, idx) => (
            <button key={d} type="button" onClick={() => toggleWeekday(idx)} className={`px-2 py-1 rounded border ${daysOfWeek.includes(idx) ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "bg-white dark:bg-gray-900 dark:text-gray-100"}`}>
              {d}
            </button>
          ))}
        </div>
      )}

      {repeat === "every_other_day" && (
        <label className="flex flex-col gap-1 text-sm">
          <span>Start date (ISO yyyy-mm-dd)</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={startDateIso} onChange={(e) => setStartDateIso(e.target.value)} placeholder="2025-10-16" />
        </label>
      )}

      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>Emoji path</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={emojiPath} onChange={(e) => setEmojiPath(e.target.value)} placeholder="/images/emojis/happy.png" />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span>Card text</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={cardText} onChange={(e) => setCardText(e.target.value)} placeholder="Time to take your medication 💊" />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span>Buttons (comma-separated)</span>
        <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={buttons} onChange={(e) => setButtons(e.target.value)} />
      </label>

      {error && <div className="text-red-700 dark:text-red-400 text-sm">{error}</div>}

      <div className="flex justify-end">
        <button onClick={submit} className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm dark:bg-gray-100 dark:text-gray-900">Save Medication</button>
      </div>
    </div>
  );
}
