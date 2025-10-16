// components/TemplateManager.tsx
// UI for creating and managing schedule templates

"use client";

import { useState, useEffect } from "react";
import type { ScheduleTemplate, TemplateTask } from "@/lib/types";
import Modal from "./Modal";

export default function TemplateManager() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScheduleTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/templates?id=${encodeURIComponent(id)}`, { 
        method: "DELETE" 
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error("Failed to delete template:", e);
    }
  }

  function onSaved(template: ScheduleTemplate) {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = template;
        return copy;
      }
      return [template, ...prev];
    });
    setEditing(null);
    setCreateOpen(false);
    loadTemplates();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Schedule Templates</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 text-sm"
        >
          + Create Template
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-sm text-gray-500">
          No templates yet. Create one to get started!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{template.name}</h3>
                  {template.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {template.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {template.tasks.length} task{template.tasks.length !== 1 ? "s" : ""}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(template)}
                  className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="text-xs px-3 py-1.5 rounded-md border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={createOpen || !!editing}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        ariaLabel={editing ? "Edit template" : "Create template"}
      >
        <TemplateForm
          template={editing}
          onSaved={onSaved}
          onCancel={() => {
            setCreateOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}

interface TemplateFormProps {
  template: ScheduleTemplate | null;
  onSaved: (template: ScheduleTemplate) => void;
  onCancel: () => void;
}

function TemplateForm({ template, onSaved, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [tasks, setTasks] = useState<TemplateTask[]>(
    template?.tasks || [
      { title: "", start: "09:00", durationMin: 60 }
    ]
  );
  const [saving, setSaving] = useState(false);

  function addTask() {
    setTasks([...tasks, { title: "", start: "09:00", durationMin: 60 }]);
  }

  function removeTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index));
  }

  function updateTask(index: number, field: keyof TemplateTask, value: any) {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  }

  async function handleSave() {
    if (!name.trim()) {
      alert("Please enter a template name");
      return;
    }

    const validTasks = tasks.filter((t) => t.title.trim());
    if (validTasks.length === 0) {
      alert("Please add at least one task");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template?.id,
          name: name.trim(),
          description: description.trim() || undefined,
          tasks: validTasks,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        onSaved(data.template);
      } else {
        alert(data.error || "Failed to save template");
      }
    } catch (e) {
      console.error("Failed to save template:", e);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-xl font-semibold">
        {template ? "Edit Template" : "Create Template"}
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1">Template Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard Workday"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this template"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Tasks</label>
          <button
            onClick={addTask}
            className="text-xs px-2 py-1 rounded-md bg-gray-700 text-white hover:bg-gray-600"
          >
            + Add Task
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-800 rounded-md p-3 space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(index, "title", e.target.value)}
                  placeholder="Task title"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                />
                <button
                  onClick={() => removeTask(index)}
                  className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={task.start}
                    onChange={(e) => updateTask(index, "start", e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    value={task.durationMin}
                    onChange={(e) =>
                      updateTask(index, "durationMin", parseInt(e.target.value) || 30)
                    }
                    min={5}
                    step={5}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={task.notes || ""}
                  onChange={(e) => updateTask(index, "notes", e.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}
