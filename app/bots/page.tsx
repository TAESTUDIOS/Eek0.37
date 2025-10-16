// app/bots/page.tsx
// Bot management page: configure specialized bots that Eeko can delegate to

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";
import type { BotProfile } from "@/lib/types";

export default function BotsPage() {
  const { bots, loadBots, addBot, updateBot, deleteBot } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<BotProfile>>({
    name: "",
    avatar: "",
    description: "",
    webhook: "",
    expertise: "",
    active: true,
  });

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.webhook?.trim()) return;

    if (editingId) {
      updateBot(editingId, {
        ...formData,
        name: formData.name!.trim(),
        webhook: formData.webhook!.trim(),
        updatedAt: Date.now(),
      });
      setEditingId(null);
    } else {
      const newBot: BotProfile = {
        id: uid("bot"),
        name: formData.name!.trim(),
        avatar: formData.avatar?.trim() || "🤖",
        description: formData.description?.trim() || "",
        webhook: formData.webhook!.trim(),
        expertise: formData.expertise?.trim() || "",
        active: formData.active ?? true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addBot(newBot);
    }

    setFormData({
      name: "",
      avatar: "",
      description: "",
      webhook: "",
      expertise: "",
      active: true,
    });
  };

  const handleEdit = (bot: BotProfile) => {
    setEditingId(bot.id);
    setFormData({
      name: bot.name,
      avatar: bot.avatar,
      description: bot.description,
      webhook: bot.webhook,
      expertise: bot.expertise,
      active: bot.active,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: "",
      avatar: "",
      description: "",
      webhook: "",
      expertise: "",
      active: true,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bot Profiles</h1>
        <p className="text-sm text-[var(--fg)]/60 mt-1">
          Configure specialized bots that Eeko can delegate to based on context
        </p>
      </div>

      {/* Add/Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)]">
        <h2 className="font-medium">{editingId ? "Edit Bot" : "Add New Bot"}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Name *</label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Focus Coach"
              className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Avatar (emoji or URL)</label>
            <input
              type="text"
              value={formData.avatar || ""}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              placeholder="🎯 or https://..."
              className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What does this bot do?"
            rows={2}
            className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Expertise / Context</label>
          <input
            type="text"
            value={formData.expertise || ""}
            onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
            placeholder="e.g., productivity, mental health, coding"
            className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
          />
          <p className="text-xs text-[var(--fg)]/50">
            Keywords that help Eeko determine when to delegate to this bot
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Webhook URL *</label>
          <input
            type="url"
            value={formData.webhook || ""}
            onChange={(e) => setFormData({ ...formData, webhook: e.target.value })}
            placeholder="https://n8n.example.com/webhook/..."
            className="border rounded px-3 py-2 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="bot-active"
            checked={formData.active ?? true}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="bot-active" className="text-sm">Active</label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
          >
            {editingId ? "Update Bot" : "Add Bot"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded border border-[var(--border)] text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Bot List */}
      <div className="space-y-3">
        <h2 className="font-medium">Configured Bots ({bots.length})</h2>
        {bots.length === 0 ? (
          <p className="text-sm text-[var(--fg)]/60 py-8 text-center border border-dashed border-[var(--border)] rounded-lg">
            No bots configured yet. Add your first bot above.
          </p>
        ) : (
          <div className="grid gap-3">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{bot.avatar || "🤖"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{bot.name}</h3>
                        {!bot.active && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {bot.description && (
                        <p className="text-sm text-[var(--fg)]/70 mt-1">{bot.description}</p>
                      )}
                      {bot.expertise && (
                        <p className="text-xs text-[var(--fg)]/50 mt-1">
                          <span className="font-medium">Expertise:</span> {bot.expertise}
                        </p>
                      )}
                      <p className="text-xs text-[var(--fg)]/40 mt-2 truncate">
                        {bot.webhook}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(bot)}
                      className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--surface-2)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete bot "${bot.name}"?`)) {
                          deleteBot(bot.id);
                        }
                      }}
                      className="px-3 py-1 text-sm rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 border border-blue-200 dark:border-blue-900 rounded-lg bg-blue-50 dark:bg-blue-950/20">
        <h3 className="font-medium text-sm mb-2">How Bot Orchestration Works</h3>
        <ul className="text-sm space-y-1 text-[var(--fg)]/80">
          <li>• User sends a message in chat</li>
          <li>• Eeko (orchestrator) analyzes the message context</li>
          <li>• If relevant, Eeko delegates to a specialized bot via its webhook</li>
          <li>• The bot responds with its expertise and personality</li>
          <li>• Bot responses appear in chat with the bot's avatar and name</li>
        </ul>
      </div>
    </div>
  );
}
