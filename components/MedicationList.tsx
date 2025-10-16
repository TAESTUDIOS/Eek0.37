// components/MedicationList.tsx
// Lists medications with name, next trigger info, edit/delete actions.

"use client";

import { useMedsStore } from "@/lib/store-meds";

type Props = {
  onEdit: (id: string) => void;
};

export default function MedicationList({ onEdit }: Props) {
  const { medications, deleteMedication } = useMedsStore();

  if (!medications || medications.length === 0) {
    return <div className="text-sm text-gray-600">No medications yet. Add one below.</div>;
  }

  return (
    <ul className="divide-y divide-gray-200 border rounded-md dark:divide-gray-800 dark:border-gray-800">
      {medications.map((m) => (
        <li key={m.id} className="p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{m.name}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {(m.times || []).join(", ")} · {m.repeat}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(m.id)}
              className="px-2 py-1 text-xs rounded border bg-white hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Edit
            </button>
            <button
              onClick={() => deleteMedication(m.id)}
              className="px-2 py-1 text-xs rounded border bg-white hover:bg-red-50 text-red-700 border-red-200 dark:bg-gray-900 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
