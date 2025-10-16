// components/ChatInput.tsx
// Input box + send button. Sends to /api/messages by default; recognizes /start <ritualId>.

"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";
import BotSelector from "@/components/BotSelector";

export default function ChatInput() {
  const [text, setText] = useState("");
  const { addMessage, messages, tone, name, profileNotes, rituals, fallbackWebhook, currentSessionId, setIsAssistantTyping, bots, selectedBotId } = useAppStore();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Helper to broadcast typing state to the page
  const broadcastTyping = (typing: boolean) => {
    try {
      window.dispatchEvent(new CustomEvent("chat-typing", { detail: { typing } }));
    } catch {}
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => broadcastTyping(true);
    const onBlur = () => broadcastTyping(false);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, []);

  async function send() {
    const content = text.trim();
    if (!content) return;
    const userMsg = { id: uid("m"), role: "user" as const, text: content, timestamp: Date.now() };
    addMessage(userMsg);
    setText("");
    // Keep typing state TRUE until message is persisted to prevent refresh race condition
    broadcastTyping(true);

    // Persist user message and WAIT for it to complete to avoid race condition with refresh
    try {
      const persistRes = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userMsg.id, role: "user", text: content, timestamp: userMsg.timestamp, echo: false }),
      });
      if (!persistRes.ok) {
        console.warn("Failed to persist user message:", await persistRes.text().catch(() => "unknown error"));
      }
    } catch (err) {
      console.warn("Failed to persist user message:", err);
    }
    
    // Only set typing to false after persistence completes
    broadcastTyping(false);

    // Detect ritual trigger: match by exact chat keyword OR '/start <ritualId>'
    const keywordMatch = rituals.find(
      (r) => r.trigger?.type === "chat" && typeof r.trigger.chatKeyword === "string" && content === r.trigger.chatKeyword
    );
    if (keywordMatch || content.startsWith("/start ")) {
      const ritualId = keywordMatch ? keywordMatch.id : content.split(" ")[1];
      const ritual = keywordMatch || rituals.find((r) => r.id === ritualId);
      const last10 = messages.slice(-10);
      setIsAssistantTyping(true);
      try {
        // Always call server proxy to avoid CORS and ensure secure webhook usage
        const res = await fetch("/api/rituals/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ritualId, context: last10, tone, webhook: ritual?.webhook, buttons: ritual?.buttons, sessionId: currentSessionId }),
        });
        const data = await res.json().catch(() => ({} as any));
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Failed to start ritual ${ritualId}`);
        }
        const ts = Date.now();
        const textRes = data.text ?? "(no text)";
        const buttonsRes: string[] = data.buttons ?? (ritual?.buttons ?? []);
        const ritualMsgId = uid("m");
        addMessage({ id: ritualMsgId, role: "ritual", text: textRes, buttons: buttonsRes, ritualId, timestamp: ts });
        // Persist ritual message (no echo) and WAIT - keep typing true until done
        try {
          const persistRes = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: ritualMsgId, role: "ritual", text: textRes, ritualId, buttons: buttonsRes, timestamp: ts, echo: false }),
          });
          if (!persistRes.ok) {
            console.warn("Failed to persist ritual message:", await persistRes.text().catch(() => "unknown error"));
          }
        } catch (err) {
          console.warn("Failed to persist ritual message:", err);
        }
        // Only turn off typing after persistence completes
        setIsAssistantTyping(false);
      } catch (e) {
        const ts = Date.now();
        const errorText = `Failed to start ritual ${ritualId}.`;
        const errorMsgId = uid("m");
        addMessage({ id: errorMsgId, role: "assistant", text: errorText, timestamp: ts });
        // Persist assistant error and WAIT - keep typing true until done
        try {
          const persistRes = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: errorMsgId, role: "assistant", text: errorText, timestamp: ts, echo: false }),
          });
          if (!persistRes.ok) {
            console.warn("Failed to persist error message:", await persistRes.text().catch(() => "unknown error"));
          }
        } catch (err) {
          console.warn("Failed to persist error message:", err);
        }
        // Only turn off typing after persistence completes
        setIsAssistantTyping(false);
      }
      return;
    }

    // Fallback behavior: always go through server proxy to avoid CORS
    // Use selected bot webhook if available, otherwise use fallback webhook
    const selectedBot = selectedBotId ? bots.find((b) => b.id === selectedBotId) : null;
    const webhookUrl = selectedBot?.webhook || fallbackWebhook || undefined;
    const botName = selectedBot?.name;
    const botAvatar = selectedBot?.avatar;
    
    setIsAssistantTyping(true);
    try {
      const res = await fetch("/api/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, lastMessages: messages.slice(-10), tone, name, profileNotes, sessionId: currentSessionId, url: webhookUrl, botId: selectedBotId, botName, botAvatar }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || data?.ok === false) {
        const detail = (data && (data.error || data.message)) ? String(data.error || data.message) : "fallback failed";
        const hint = data?.target ? ` (target: ${data.target}${data?.source ? ", source: " + data.source : ""})` : "";
        throw new Error(detail + hint);
      }
      const ts = Date.now();
      const textRes = data.text ?? "(no text)";
      const assistantMsgId = uid("m");
      addMessage({ id: assistantMsgId, role: "assistant", text: textRes, timestamp: ts, botId: selectedBotId || undefined, botName, botAvatar });
      // Persist assistant reply (no echo) and WAIT - keep typing true until done
      try {
        const persistRes = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: assistantMsgId, role: "assistant", text: textRes, timestamp: ts, echo: false, botId: selectedBotId || undefined, botName, botAvatar }),
        });
        if (!persistRes.ok) {
          console.warn("Failed to persist assistant message:", await persistRes.text().catch(() => "unknown error"));
        }
      } catch (err) {
        console.warn("Failed to persist assistant message:", err);
      }
      // Only turn off typing after persistence completes
      setIsAssistantTyping(false);
    } catch (e: any) {
      const ts = Date.now();
      const errorText = typeof e?.message === "string" && e.message ? e.message : "Request failed. Please try again.";
      const fallbackErrorMsgId = uid("m");
      addMessage({ id: fallbackErrorMsgId, role: "assistant", text: errorText, timestamp: ts });
      // Persist assistant error and WAIT - keep typing true until done
      try {
        const persistRes = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fallbackErrorMsgId, role: "assistant", text: errorText, timestamp: ts, echo: false }),
        });
        if (!persistRes.ok) {
          console.warn("Failed to persist fallback error message:", await persistRes.text().catch(() => "unknown error"));
        }
      } catch (err) {
        console.warn("Failed to persist fallback error message:", err);
      }
      // Only turn off typing after persistence completes
      setIsAssistantTyping(false);
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <BotSelector />
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          // Consider typing if there's content or field focused
          broadcastTyping(v.trim().length > 0);
        }}
        onKeyDown={(e) => e.key === "Enter" && send()}
        className="flex-1 border border-[var(--border)] rounded-lg px-4 py-2 text-sm bg-[var(--surface-1)] text-[var(--fg)] placeholder-[var(--fg)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-subtle"
        aria-label="Chat input"
      />
      <button
        onClick={send}
        className="px-4 py-2 rounded-lg border text-sm font-normal bg-blue-900 text-white hover:bg-blue-950 border-blue-950 shadow-subtle"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
}
