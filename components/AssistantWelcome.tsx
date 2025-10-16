// components/AssistantWelcome.tsx
// Welcome message showing assistant identity when chat is empty

"use client";

import AssistantAvatar from "./AssistantAvatar";

export default function AssistantWelcome({ 
  name, 
  personality 
}: { 
  name: string; 
  personality: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4">
      <AssistantAvatar name={name} size="lg" />
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-[var(--fg)]">
          Hi, I'm {name}
        </h2>
        <p className="text-sm text-[var(--fg)]/70 max-w-md">
          I'm here to support you with rituals, emotions, and daily tasks. 
          I'm {personality}.
        </p>
        <p className="text-xs text-[var(--fg)]/50 mt-4">
          Type a message or try <code className="px-1.5 py-0.5 rounded bg-[var(--surface-1)] border border-[var(--border)]">/start morning</code>
        </p>
      </div>
    </div>
  );
}
