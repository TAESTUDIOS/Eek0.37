// components/TemplateSelector.tsx
// Component for selecting and applying templates to a date

"use client";

import { useState, useEffect } from "react";
import type { ScheduleTemplate } from "@/lib/types";

interface TemplateSelectorProps {
  date: string;
  onApplied: () => void;
  onClose: () => void;
}

export default function TemplateSelector({ 
  date, 
  onApplied, 
  onClose 
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      setLoading(false);
    }
  }

  async function applyTemplate(templateId: string) {
    if (!confirm("Apply this template to the current day? This will create new appointments.")) {
      return;
    }

    setApplying(templateId);
    try {
      const res = await fetch("/api/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, date }),
      });

      const data = await res.json();
      if (data.ok) {
        alert(`Successfully applied template! Created ${data.count} appointment(s).`);
        onApplied();
      } else {
        alert(data.error || "Failed to apply template");
      }
    } catch (e) {
      console.error("Failed to apply template:", e);
      alert("Failed to apply template");
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Apply Template to {date}</h2>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          Close
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="space-y-2">
          <div className="text-sm text-gray-500">
            No templates available. Create templates first!
          </div>
          <button
            onClick={() => window.open("/templates", "_blank")}
            className="text-sm px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600"
          >
            Manage Templates
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {template.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {template.tasks.length} task{template.tasks.length !== 1 ? "s" : ""}:
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    {template.tasks.slice(0, 5).map((task, i) => (
                      <li key={i}>
                        • {task.start} - {task.title} ({task.durationMin}m)
                      </li>
                    ))}
                    {template.tasks.length > 5 && (
                      <li className="text-gray-400">
                        ... and {template.tasks.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
                <button
                  onClick={() => applyTemplate(template.id)}
                  disabled={applying === template.id}
                  className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
                >
                  {applying === template.id ? "Applying..." : "Apply"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
