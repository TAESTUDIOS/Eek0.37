// components/BotSelector.tsx
// Dropdown selector for choosing between preconfigured bot profiles
// LOC: ~120

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { BotProfile } from "@/lib/types";

export default function BotSelector() {
  const { bots, loadBots } = useAppStore();
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  // Get active bots only
  const activeBots = bots.filter((b) => b.active);

  // Default bot (Eeko - fallback)
  const defaultBot = {
    id: "default",
    name: "Eeko",
    avatar: "🤖",
    description: "Your default assistant",
  };

  const selectedBot = selectedBotId
    ? activeBots.find((b) => b.id === selectedBotId) || defaultBot
    : defaultBot;

  const handleSelect = (botId: string | null) => {
    setSelectedBotId(botId);
    setIsOpen(false);
    // Store selection in Zustand for ChatInput to use
    useAppStore.setState({ selectedBotId: botId });
  };

  return (
    <div className="relative">
      {/* Selected bot display button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] hover:bg-[var(--surface-2)] transition-colors shadow-subtle text-sm"
        aria-label="Select bot"
        aria-expanded={isOpen}
      >
        <span className="text-base" aria-hidden="true">
          {selectedBot.avatar || "🤖"}
        </span>
        <span className="font-medium">{selectedBot.name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M12 15.5a.75.75 0 0 1-.53-.22l-6-6a.75.75 0 1 1 1.06-1.06L12 13.69l5.47-5.47a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-.53.22Z" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown panel */}
          <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] shadow-elevated z-20 max-h-80 overflow-y-auto">
            {/* Default bot option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] ${
                !selectedBotId ? "bg-[var(--surface-2)]" : ""
              }`}
            >
              <span className="text-2xl flex-shrink-0" aria-hidden="true">
                {defaultBot.avatar}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--fg)]">{defaultBot.name}</div>
                <div className="text-xs text-[var(--fg)]/60 mt-0.5">
                  {defaultBot.description}
                </div>
              </div>
              {!selectedBotId && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-blue-500 flex-shrink-0"
                  aria-hidden="true"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>

            {/* Active bot options */}
            {activeBots.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--fg)]/50">
                No custom bots configured yet.
                <br />
                <span className="text-xs">Add bots in Settings.</span>
              </div>
            ) : (
              activeBots.map((bot) => (
                <button
                  key={bot.id}
                  type="button"
                  onClick={() => handleSelect(bot.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] last:border-b-0 ${
                    selectedBotId === bot.id ? "bg-[var(--surface-2)]" : ""
                  }`}
                >
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {bot.avatar || "🤖"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--fg)]">{bot.name}</div>
                    <div className="text-xs text-[var(--fg)]/60 mt-0.5 line-clamp-2">
                      {bot.description}
                    </div>
                    {bot.expertise && (
                      <div className="text-xs text-blue-500/80 mt-1">
                        {bot.expertise}
                      </div>
                    )}
                  </div>
                  {selectedBotId === bot.id && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5 text-blue-500 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
