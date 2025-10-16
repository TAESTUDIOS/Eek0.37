// components/ChatWindow.tsx
// Displays messages from the Zustand store with special styling for ritual messages.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";
import RitualButtons from "@/components/RitualButtons";
import EmotionCard from "@/components/EmotionCard";
import EmotionHeader from "@/components/EmotionHeader";
import { getEmotionDescriptor } from "@/lib/emotions";
import DemoRenderer from "@/components/chat/DemoRenderer";
import Logo from "@/images/logo/logo.png";
import AssistantAvatar from "@/components/AssistantAvatar";
import TypingIndicator from "@/components/TypingIndicator";

export default function ChatWindow() {
  const { messages, saveMessage, urgentTodos, loadUrgentTodos, addMessage, setMessages, notificationsWebhook, assistantName, isAssistantTyping } = useAppStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [completedTimers, setCompletedTimers] = useState<Record<string, boolean>>({});
  const [saveStates, setSaveStates] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [questionInputs, setQuestionInputs] = useState<Record<string, string>>({});
  const [goodnightShown, setGoodnightShown] = useState<boolean>(false);
  const goodnightLockRef = useRef<boolean>(false);
  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);
  const [todayTasks, setTodayTasks] = useState<Array<{ title: string; start: string; durationMin?: number }> | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);

  // Render-time dedup: only show the first goodnight card even if duplicates exist in history
  const renderMessages = useMemo(() => {
    // Determine index of the last goodnight card to prefer rendering the latest one
    let lastGoodnightIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      const mm: any = messages[i];
      if (mm?.metadata?.demo === 'goodnightCard') { lastGoodnightIdx = i; break; }
    }
    return messages.filter((mm: any, idx: number) => {
      if (mm?.metadata?.demo === 'goodnightCard' && lastGoodnightIdx !== -1) {
        return idx === lastGoodnightIdx; // keep only the latest
      }
      return true;
    });
  }, [messages]);

  // Inject a single goodnight card and persist it. Guard against duplicates.
  const showGoodnightCard = useMemo(() => {
    return () => {
      if (goodnightLockRef.current) return;
      goodnightLockRef.current = true; // reentrancy lock
      if (goodnightShown) return;
      // If already present in message list, set flag and exit
      const alreadyCard = messages.some((mm: any) => mm?.metadata?.demo === 'goodnightCard');
      if (alreadyCard) { setGoodnightShown(true); return; }
      const ts2 = Date.now();
      const idCard = uid('m');
      const metaCard: any = { demo: 'goodnightCard' };
      addMessage({ id: idCard, role: 'assistant', text: '', metadata: metaCard, timestamp: ts2 });
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idCard, role: 'assistant', text: '', metadata: metaCard, timestamp: ts2, echo: false }),
      }).catch(() => {});
      setGoodnightShown(true);
      try { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
    };
  }, [goodnightShown, messages, addMessage]);

  // Auto-scroll to bottom whenever messages change (always)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      } else {
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }, [messages]);

  // Ensure urgent todos are available when demo grid is shown in chat
  useEffect(() => {
    if (!urgentTodos || urgentTodos.length === 0) {
      try { loadUrgentTodos(); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load today's appointments once so demo list pulls from in-app schedule
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setTodayLoading(true);
        const res = await fetch(`/api/appointments?date=${encodeURIComponent(todayISO)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        if (ignore) return;
        const items: any[] = Array.isArray(data?.items) ? data.items : [];
        const mapped = items
          .slice()
          .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
          .map((a) => ({ title: String(a.title || '(untitled)'), start: String(a.start || '00:00'), durationMin: typeof a.durationMin === 'number' ? a.durationMin : undefined }));
        setTodayTasks(mapped);
      } catch {
        if (!ignore) setTodayTasks([]);
      } finally {
        if (!ignore) setTodayLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [todayISO]);

  // Global 1s ticker to update countdowns (supports legacy countdown60 and new generic countdown)
  const hasCountdown = useMemo(
    () => messages.some((m: any) => m?.metadata?.demo === "countdown60" || m?.metadata?.demo === "countdown"),
    [messages]
  );
  useEffect(() => {
    if (!hasCountdown) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [hasCountdown]);
  // Context passed to DemoRenderer components
  const demoContext = {
    messages,
    setMessages,
    addMessage,
    urgentTodos,
    notificationsWebhook,
    todayISO,
    todayTasks,
    todayLoading,
    questionInputs,
    setQuestionInputs,
    saveStates,
    setSaveStates,
    now,
    completedTimers,
    setCompletedTimers,
    setToast,
    showGoodnightCard,
    bottomRef,
    goodnightLockRef,
    setGoodnightShown,
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 h-full min-h-0 overflow-y-auto pl-2 pr-2 pt-2 pb-2 bg-transparent text-[var(--fg)] leading-6"
      aria-live="polite"
    >
      {renderMessages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <Image
            src={Logo}
            alt="Eeko logo"
            width={96}
            height={96}
            className="opacity-10 [filter:grayscale(100%)_brightness(60%)]"
            priority
          />
        </div>
      )}
      {renderMessages.map((m) => {
        const isUser = m.role === "user";
        const isRitual = m.role === "ritual";
        const hasDemo = (m as any)?.metadata?.demo;
        const metaEmotionId = typeof (m.metadata as any)?.emotionId === "string" ? (m.metadata as any).emotionId : undefined;
        const metaDemo = (m.metadata as any)?.demo;
        const emotionDescriptor = getEmotionDescriptor(m.emotionId ?? metaEmotionId);
        const hasEmotion = Boolean(emotionDescriptor);
        const isEmotionCard = hasEmotion && metaDemo === "emotionCard";
        const bubbleBase = "inline-block px-4 py-2.5 rounded-lg text-[0.95rem] max-w-[80%] shadow-subtle";
        const bubbleRole = isUser
          ? "bg-gray-700 text-white"
          : isRitual
          ? "bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]"
          : "bg-[var(--surface-1)] text-[var(--fg)] border border-[var(--border)]";
        const bubbleCls = hasDemo || hasEmotion
          ? "w-full max-w-none p-0 bg-transparent shadow-none border-0"
          : `${bubbleBase} ${bubbleRole}`;
        const textCls = "whitespace-pre-wrap break-normal";
        const textContent = typeof m.text === "string" ? m.text.trim() : "";
        // Hide boilerplate "Logged emotion: ..." lines for cleaner, uniform UI
        const isBoilerplateLogged = /^logged emotion\s*:/i.test(textContent);
        const shouldShowText = hasEmotion
          ? isEmotionCard
            ? Boolean(textContent && (!emotionDescriptor || textContent.toLowerCase() !== emotionDescriptor.prompt.toLowerCase()))
            : Boolean(textContent && !isBoilerplateLogged)
          : Boolean(textContent);
        const formatChatTimestamp = (ts: number) =>
          new Date(ts).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={m.id} className={"flex " + (isUser ? "justify-end" : "justify-start")}>
            <div className={"flex flex-col items-" + (isUser ? "end" : "start") + " gap-1.5" + (hasDemo || hasEmotion ? " w-full" : "") }>
              <div
                className={bubbleCls}
                onClick={() => setActiveId((prev) => (prev === m.id ? null : m.id))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setActiveId((prev) => (prev === m.id ? null : m.id));
                  }
                }}
                aria-label="Message"
              >
                {!isUser && (
                  <div className="flex items-center gap-2 mb-2">
                    {m.botAvatar ? (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                        {m.botAvatar}
                      </div>
                    ) : (
                      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src={Logo}
                          alt={m.botName || assistantName}
                          width={16}
                          height={16}
                          className="rounded-full [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                        />
                      </div>
                    )}
                    <span className="text-xs font-medium text-blue-500">
                      {m.botName || assistantName}
                    </span>
                  </div>
                )}
                {hasEmotion ? (
                  <div className="w-full">
                    {isEmotionCard ? (
                      <EmotionCard emotion={emotionDescriptor!} />
                    ) : (
                      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle overflow-hidden">
                        <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
                          <div className="text-sm font-medium">Logged Emotion</div>
                          <div className="text-xs text-[var(--fg)]/60">{formatChatTimestamp(m.timestamp)}</div>
                        </header>
                        <div className="p-3">
                          <EmotionHeader emotion={emotionDescriptor!} />
                          {shouldShowText ? <div className={`${textCls} mt-3`}>{textContent}</div> : null}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (hasDemo ? <DemoRenderer m={m} context={demoContext} /> : (shouldShowText ? <div className={textCls}>{textContent}</div> : null))}
                {isRitual && m.buttons && m.buttons.length > 0 && m?.metadata?.demo !== 'winddownIntro' && (
                  <div className="mt-2">
                    <RitualButtons ritualId={m.ritualId} buttons={m.buttons} />
                  </div>
                )}
              </div>
              <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
                <button
                  type="button"
                  aria-label={`Save message ${m.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    saveMessage(m.id);
                    setToast("Message saved.");
                    setActiveId(null);
                    window.setTimeout(() => setToast(null), 1600);
                  }}
                  className={
                    "mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/70 hover:bg-[var(--surface-2)] hover:text-[var(--fg)] transition-all duration-200 " +
                    (activeId === m.id ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none")
                  }
                >
                  {/* Heart icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.188 3 13.013 3 10.5 3 8.015 5.015 6 7.5 6A4.5 4.5 0 0112 8.03 4.5 4.5 0 0116.5 6C18.985 6 21 8.015 21 10.5c0 2.513-1.688 4.688-3.989 6.007a25.18 25.18 0 01-4.244 3.17 15.247 15.247 0 01-.383.218l-.022.012-.007.003a.75.75 0 01-.666 0z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {isAssistantTyping && renderMessages.length > 0 && renderMessages[renderMessages.length - 1].role === "user" && (
        <div className="flex justify-start">
          <div className="inline-block px-4 py-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] shadow-subtle max-w-[85%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                <Image
                  src={Logo}
                  alt={assistantName}
                  width={16}
                  height={16}
                  className="rounded-full [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                />
              </div>
              <span className="text-xs font-medium text-blue-500">
                {assistantName}
              </span>
            </div>
            <TypingIndicator />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm shadow-elevated">
          {toast}
        </div>
      )}
    </div>
  );
}



