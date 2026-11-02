import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, Info, Menu, Plus, RefreshCw, X } from "lucide-react";
import { Composer } from "./Composer";
import { ConversationSidebar } from "./ConversationSidebar";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { WelcomeState } from "./WelcomeState";
import { useCopilot } from "./useCopilot";

export function CopilotPage() {
  const {
    active,
    activeId,
    sortedConversations,
    pendingIds,
    isPending,
    send,
    retry,
    dismissError,
    newConversation,
    selectConversation,
    deleteConversation,
  } = useCopilot();

  const [draft, setDraft] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastConversationRef = useRef<string>(active.localId);

  const lastMessage = active.messages[active.messages.length - 1];
  const lastId = lastMessage ? lastMessage.id : null;
  const lastRole = lastMessage ? lastMessage.role : null;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const switched = lastConversationRef.current !== active.localId;
    lastConversationRef.current = active.localId;

    if (switched || lastId === null || lastRole !== "assistant") {
      container.scrollTo({ top: container.scrollHeight, behavior: switched ? "auto" : "smooth" });
      return;
    }
    const el = container.querySelector<HTMLElement>(`[data-msg-id="${CSS.escape(lastId)}"]`);
    if (!el) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }
    const top =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [active.localId, lastId, lastRole]);

  useEffect(() => {
    if (!isPending) return;
    const container = scrollRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [isPending]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const handleSubmit = useCallback(() => {
    if (send(draft)) setDraft("");
  }, [send, draft]);

  const handleSuggestionSend = useCallback(
    (text: string) => {
      send(text);
    },
    [send],
  );

  const handleSuggestionFill = useCallback((text: string) => {
    setDraft(text);
    window.requestAnimationFrame(() => {
      const el = composerRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }, []);

  const handleSelect = useCallback(
    (localId: string) => {
      selectConversation(localId);
      setDrawerOpen(false);
    },
    [selectConversation],
  );

  const handleNew = useCallback(() => {
    newConversation();
    setDrawerOpen(false);
  }, [newConversation]);

  const sidebar = (
    <ConversationSidebar
      conversations={sortedConversations}
      activeId={activeId}
      pendingIds={pendingIds}
      onSelect={handleSelect}
      onNew={handleNew}
      onDelete={deleteConversation}
    />
  );

  const error = active.error;
  const errorIsSession = error?.kind === "session";

  return (
    <MotionConfig reducedMotion="user">
      <div
        dir="rtl"
        className="flex h-[calc(100dvh-8rem)] min-h-[460px] overflow-hidden bg-[#080d17] text-slate-100 lg:h-[calc(100dvh-4.75rem)]"
      >
        <div className="hidden w-72 shrink-0 border-l border-white/[0.07] bg-[#0b1220]/70 xl:block">{sidebar}</div>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="فتح قائمة المحادثات"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 transition hover:text-teal-300 xl:hidden"
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">مساعد نبض التجارة</h2>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">للقراءة والتحليل فقط</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleNew}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:border-teal-400/30 hover:text-teal-300"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">محادثة جديدة</span>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
          >
            {active.contextLost && (
              <div className="mx-auto mb-5 flex max-w-3xl gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-6 text-amber-100/80">
                <Info size={14} className="mt-1 shrink-0" />
                <p>
                  فُقد سياق هذه المحادثة على الخادم (انتهت الجلسة). الرسائل المعروضة محفوظة هنا فقط، والمساعد لا يتذكر ما سبق.
                </p>
              </div>
            )}

            {active.messages.length === 0 ? (
              <WelcomeState onSend={handleSuggestionSend} onFill={handleSuggestionFill} />
            ) : (
              <div role="log" aria-live="polite" className="mx-auto flex max-w-3xl flex-col gap-6">
                {active.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isPending && <TypingIndicator />}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.07] bg-[#080d17] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-3">
              {error && (
                <div
                  role="alert"
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    errorIsSession
                      ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"
                      : "border-rose-400/20 bg-rose-400/[0.06] text-rose-200"
                  }`}
                >
                  <AlertTriangle size={18} className="mt-1 shrink-0" />
                  <p className="min-w-0 flex-1 text-sm leading-7">{error.message}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {error.retryable && (
                      <button
                        type="button"
                        onClick={retry}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-current/30 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={isPending ? "animate-spin" : ""} />
                        إعادة المحاولة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={dismissError}
                      aria-label="إخفاء رسالة الخطأ"
                      className="rounded-lg p-1.5 opacity-70 transition hover:bg-white/[0.06] hover:opacity-100"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              )}

              <Composer
                value={draft}
                onChange={setDraft}
                onSubmit={handleSubmit}
                pending={isPending}
                textareaRef={composerRef}
              />
            </div>
          </div>
        </section>

        <AnimatePresence>
          {drawerOpen && (
            <div key="drawer" className="fixed inset-0 z-40 xl:hidden">
              <motion.button
                type="button"
                aria-label="إغلاق قائمة المحادثات"
                onClick={() => setDrawerOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
              />
              <motion.aside
                initial={{ x: 320 }}
                animate={{ x: 0 }}
                exit={{ x: 320 }}
                transition={{ type: "tween", duration: 0.22 }}
                className="absolute right-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-l border-teal-400/20 bg-[#0b1220] shadow-2xl shadow-black/50"
              >
                <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                  <span className="text-sm font-semibold">المحادثات</span>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="إغلاق"
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="min-h-0 flex-1">{sidebar}</div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
