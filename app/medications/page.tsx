// app/medications/page.tsx
// Medications management page

"use client";

import { useEffect, useState } from "react";
import MedicationList from "@/components/MedicationList";
import MedicationForm from "@/components/MedicationForm";
import { useMedsStore } from "@/lib/store-meds";

export default function MedicationsPage() {
  const [editId, setEditId] = useState<string | null>(null);
  const { loadMedications } = useMedsStore();

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Medications</h1>
      <MedicationList onEdit={(id) => setEditId(id)} />
      <div>
        <h2 className="text-lg font-medium mb-2">Add / Edit Medication</h2>
        <MedicationForm editId={editId} onDone={() => setEditId(null)} />
      </div>
    </div>
  );
}
