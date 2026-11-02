import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteSession, sendChat, toChatError } from "./api";
import { MAX_MESSAGE_CHARS, type ChatMessage, type Conversation } from "./types";

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createConversation(): Conversation {
  const now = Date.now();
  return {
    localId: uid(),
    sessionId: null,
    title: "محادثة جديدة",
    messages: [],
    error: null,
    contextLost: false,
    createdAt: now,
    updatedAt: now,
  };
}

function makeTitle(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 36 ? `${oneLine.slice(0, 36)}…` : oneLine;
}

export function useCopilot() {
  const [initial] = useState<Conversation>(createConversation);
  const [conversations, setConversations] = useState<Conversation[]>([initial]);
  const [activeId, setActiveId] = useState<string>(initial.localId);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  const conversationsRef = useRef<Conversation[]>(conversations);
  const inFlight = useRef<Set<string>>(new Set());
  const controllers = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const map = controllers.current;
    return () => {
      for (const controller of map.values()) controller.abort();
      map.clear();
    };
  }, []);

  const patchConversation = useCallback(
    (localId: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => prev.map((c) => (c.localId === localId ? updater(c) : c)));
    },
    [],
  );

  const runRequest = useCallback(
    async (localId: string, text: string) => {
      if (inFlight.current.has(localId)) return;
      const conversation = conversationsRef.current.find((c) => c.localId === localId);
      if (!conversation) return;

      inFlight.current.add(localId);
      const controller = new AbortController();
      controllers.current.set(localId, controller);
      setPendingIds((prev) => (prev.includes(localId) ? prev : [...prev, localId]));
      patchConversation(localId, (c) => ({ ...c, error: null }));

      try {
        const result = await sendChat({
          message: text,
          sessionId: conversation.sessionId,
          signal: controller.signal,
        });
        const now = Date.now();
        const reply: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: result.reply,
          cards: result.cards,
          toolsUsed: result.toolsUsed,
          sources: result.sources,
          createdAt: now,
        };
        patchConversation(localId, (c) => ({
          ...c,
          sessionId: result.sessionId,
          messages: [...c.messages, reply],
          error: null,
          updatedAt: now,
        }));
      } catch (err) {
        const chatError = toChatError(err);
        if (chatError === null) return; // إلغاء مقصود
        patchConversation(localId, (c) => ({
          ...c,
          error: chatError,
          sessionId: chatError.kind === "session" ? null : c.sessionId,
          contextLost: chatError.kind === "session" ? true : c.contextLost,
        }));
      } finally {
        inFlight.current.delete(localId);
        controllers.current.delete(localId);
        setPendingIds((prev) => prev.filter((id) => id !== localId));
      }
    },
    [patchConversation],
  );

  const send = useCallback(
    (rawText: string): boolean => {
      const text = rawText.trim();
      if (text.length === 0 || text.length > MAX_MESSAGE_CHARS) return false;
      if (inFlight.current.has(activeId)) return false;

      const now = Date.now();
      const userMessage: ChatMessage = {
        id: uid(),
        role: "user",
        content: text,
        cards: [],
        toolsUsed: [],
        sources: [],
        createdAt: now,
      };
      patchConversation(activeId, (c) => ({
        ...c,
        title: c.messages.length === 0 ? makeTitle(text) : c.title,
        messages: [...c.messages, userMessage],
        error: null,
        updatedAt: now,
      }));
      void runRequest(activeId, text);
      return true;
    },
    [activeId, patchConversation, runRequest],
  );

  const retry = useCallback(() => {
    const conversation = conversationsRef.current.find((c) => c.localId === activeId);
    if (!conversation) return;
    const last = conversation.messages[conversation.messages.length - 1];
    if (!last || last.role !== "user") return;
    void runRequest(activeId, last.content);
  }, [activeId, runRequest]);

  const dismissError = useCallback(() => {
    patchConversation(activeId, (c) => ({ ...c, error: null }));
  }, [activeId, patchConversation]);

  const newConversation = useCallback(() => {
    const current = conversationsRef.current.find((c) => c.localId === activeId);
    if (current && current.messages.length === 0) return; // الحالية فارغة أصلاً
    const fresh = createConversation();
    conversationsRef.current = [fresh, ...conversationsRef.current];
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.localId);
  }, [activeId]);

  const selectConversation = useCallback((localId: string) => {
    if (conversationsRef.current.some((c) => c.localId === localId)) setActiveId(localId);
  }, []);

  const deleteConversation = useCallback(
    (localId: string) => {
      const target = conversationsRef.current.find((c) => c.localId === localId);
      if (!target) return;

      controllers.current.get(localId)?.abort();
      if (target.sessionId) void deleteSession(target.sessionId); // محاولة حذف من الخادم (best-effort)

      const remaining = conversationsRef.current.filter((c) => c.localId !== localId);
      if (remaining.length === 0) {
        const fresh = createConversation();
        conversationsRef.current = [fresh];
        setConversations([fresh]);
        setActiveId(fresh.localId);
        return;
      }
      conversationsRef.current = remaining;
      setConversations(remaining);
      const next = remaining[0];
      if (localId === activeId && next) setActiveId(next.localId);
    },
    [activeId],
  );

  const active = useMemo(
    () => conversations.find((c) => c.localId === activeId) ?? conversations[0] ?? initial,
    [conversations, activeId, initial],
  );

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  return {
    active,
    activeId: active.localId,
    sortedConversations,
    pendingIds,
    isPending: pendingIds.includes(active.localId),
    send,
    retry,
    dismissError,
    newConversation,
    selectConversation,
    deleteConversation,
  };
}
