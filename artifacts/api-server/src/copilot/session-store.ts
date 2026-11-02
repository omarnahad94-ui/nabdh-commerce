// artifacts/api-server/src/copilot/session-store.ts
// مخزن جلسات في ذاكرة الخادم. sessionId هنا معرّف سياق فقط وليس وسيلة مصادقة:
// يُولَّد على الخادم، ويُربط بمفتاح مالك (ownerKey) كطبقة تقليل إساءة لا أكثر.

import { randomUUID } from "node:crypto";
import { LIMITS } from "./schemas";

export type ChatMessage = { role: "user" | "model"; text: string };

export interface Session {
  readonly id: string;
  readonly ownerKey: string;
  messages: ChatMessage[];
  lastActiveAt: number;
  busy: boolean;
}

const sessions = new Map<string, Session>();

function isExpired(s: Session, now = Date.now()): boolean {
  return now - s.lastActiveAt > LIMITS.sessionTtlMs;
}

function evictOldest(filter?: (s: Session) => boolean): void {
  let oldest: Session | undefined;
  for (const s of sessions.values()) {
    if (s.busy) continue;
    if (filter && !filter(s)) continue;
    if (!oldest || s.lastActiveAt < oldest.lastActiveAt) oldest = s;
  }
  if (oldest) sessions.delete(oldest.id);
}

export function sweepExpired(): void {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (!s.busy && isExpired(s, now)) sessions.delete(id);
  }
}

// تنظيف دوري؛ unref حتى لا يمنع إغلاق العملية.
const sweeper = setInterval(sweepExpired, 60_000);
sweeper.unref();

export function createSession(ownerKey: string): Session {
  sweepExpired();

  const ownerCount = [...sessions.values()].filter((s) => s.ownerKey === ownerKey).length;
  if (ownerCount >= LIMITS.maxSessionsPerOwner) {
    evictOldest((s) => s.ownerKey === ownerKey);
  }
  if (sessions.size >= LIMITS.maxSessionsTotal) evictOldest();

  const session: Session = {
    id: randomUUID(),
    ownerKey,
    messages: [],
    lastActiveAt: Date.now(),
    busy: false,
  };
  sessions.set(session.id, session);
  return session;
}

// يُرجع null إن لم توجد الجلسة أو انتهت أو كان المالك مختلفاً (نفس الاستجابة في الحالات الثلاث).
export function getSession(id: string, ownerKey: string): Session | null {
  const s = sessions.get(id);
  if (!s) return null;
  if (isExpired(s)) {
    sessions.delete(id);
    return null;
  }
  if (s.ownerKey !== ownerKey) return null;
  return s;
}

export function deleteSession(id: string, ownerKey: string): boolean {
  const s = getSession(id, ownerKey);
  if (!s || s.busy) return false;
  return sessions.delete(id);
}

// يضيف دورة ناجحة (سؤال + رد) فقط. نتائج الأدوات لا تُخزَّن: تُجلب طازجة في كل دورة.
export function appendTurn(session: Session, userText: string, modelText: string): void {
  session.messages.push({ role: "user", text: userText }, { role: "model", text: modelText });
  session.lastActiveAt = Date.now();

  const totalChars = () => session.messages.reduce((n, m) => n + m.text.length, 0);
  while (
    session.messages.length > LIMITS.maxHistoryMessages ||
    totalChars() > LIMITS.maxHistoryChars
  ) {
    session.messages.shift();
  }
  // يجب أن يبدأ السياق برسالة مستخدم.
  while (session.messages.length > 0 && session.messages[0]!.role !== "user") {
    session.messages.shift();
  }
}
