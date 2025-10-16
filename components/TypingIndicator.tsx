// components/TypingIndicator.tsx
// Animated typing indicator to show assistant is responding

"use client";

export default function TypingIndicator() {
  return (
    <div className="flex gap-1">
      <span className="w-2 h-2 rounded-full bg-[var(--fg)]/40 animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 rounded-full bg-[var(--fg)]/40 animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-[var(--fg)]/40 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
