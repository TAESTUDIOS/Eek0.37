/**
 * lib/store-meds.ts
 * Zustand store for Medications CRUD with optimistic updates and API sync.
 */

import { create } from "zustand";
import { uid } from "@/lib/id";
import type { MedicationConfig } from "@/lib/types";

export type MedsState = {
  medications: MedicationConfig[];
  loadMedications: () => Promise<void>;
  addMedication: (m: MedicationConfig) => Promise<boolean>;
  updateMedication: (id: string, patch: Partial<MedicationConfig>) => Promise<boolean>;
  deleteMedication: (id: string) => Promise<boolean>;
};

export const useMedsStore = create<MedsState>((set, get) => ({
  medications: [],

  loadMedications: async () => {
    try {
      const res = await fetch("/api/medications", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      if (Array.isArray(data?.items)) {
        set({ medications: data.items as MedicationConfig[] });
      }
    } catch {
      // keep current
    }
  },

  addMedication: async (m) => {
    const payload: MedicationConfig = {
      id: m.id || uid("med"),
      name: m.name,
      webhook: m.webhook || "",
      times: Array.isArray(m.times) ? m.times : [],
      repeat: m.repeat,
      daysOfWeek: m.daysOfWeek,
      dayOfMonth: m.dayOfMonth,
      startDateIso: m.startDateIso,
      active: m.active ?? true,
      emojiPath: m.emojiPath,
      cardText: m.cardText,
      buttons: m.buttons ?? ["Taken", "Snooze", "Skip"],
    };
    set({ medications: [payload, ...get().medications] });
    try {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ok = (await res.json().catch(() => ({} as any)))?.ok ?? res.ok;
      if (!ok) throw new Error("save failed");
      return true;
    } catch {
      // rollback on failure
      set({ medications: get().medications.filter((x) => x.id !== payload.id) });
      return false;
    }
  },

  updateMedication: async (id, patch) => {
    const cur = get().medications.find((x) => x.id === id);
    if (!cur) return false;
    const full: MedicationConfig = {
      ...cur,
      ...patch,
      times: Array.isArray(patch.times) ? patch.times : cur.times,
      buttons: Array.isArray(patch.buttons) ? patch.buttons : cur.buttons,
    };
    set({ medications: get().medications.map((x) => (x.id === id ? full : x)) });
    try {
      const res = await fetch("/api/medications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(full),
      });
      const ok = (await res.json().catch(() => ({} as any)))?.ok ?? res.ok;
      if (!ok) throw new Error("update failed");
      return true;
    } catch {
      // best-effort: reload list
      await get().loadMedications();
      return false;
    }
  },

  deleteMedication: async (id) => {
    const prev = get().medications;
    set({ medications: prev.filter((x) => x.id !== id) });
    try {
      const res = await fetch(`/api/medications?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const ok = (await res.json().catch(() => ({} as any)))?.ok ?? res.ok;
      if (!ok) throw new Error("delete failed");
      return true;
    } catch {
      // rollback
      set({ medications: prev });
      return false;
    }
  },
}));
