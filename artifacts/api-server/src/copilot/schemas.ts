// artifacts/api-server/src/copilot/schemas.ts
// حدود الوحدة + أنواع الأخطاء + التحقق اليدوي من المدخلات (بدون مكتبات جديدة).

export const LIMITS = {
  maxMessageChars: 2000,
  maxHistoryMessages: 20, // آخر 20 رسالة (مستخدم + مساعد)
  maxHistoryChars: 24_000,
  sessionTtlMs: 30 * 60 * 1000,
  maxSessionsTotal: 500,
  maxSessionsPerOwner: 5,
  maxToolRounds: 4,
  maxToolCallsPerRound: 4,
  geminiTimeoutMs: 40_000,
} as const;

export type CopilotErrorCode =
  | "INVALID_INPUT"
  | "SESSION_NOT_FOUND"
  | "RATE_LIMITED"
  | "BUSY"
  | "NOT_CONFIGURED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INTERNAL";

const HTTP_STATUS: Record<CopilotErrorCode, number> = {
  INVALID_INPUT: 400,
  SESSION_NOT_FOUND: 404,
  RATE_LIMITED: 429,
  BUSY: 409,
  NOT_CONFIGURED: 503,
  TIMEOUT: 504,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

// رسائل عامة وآمنة تُعرض للعميل (لا تحتوي أي تفاصيل داخلية).
export const ERROR_MESSAGES_AR: Record<CopilotErrorCode, string> = {
  INVALID_INPUT: "الطلب غير صالح. تأكد من الرسالة وحاول مجدداً.",
  SESSION_NOT_FOUND: "انتهت الجلسة أو لم تعد موجودة. ابدأ محادثة جديدة.",
  RATE_LIMITED: "عدد الطلبات كبير. انتظر قليلاً ثم حاول مجدداً.",
  BUSY: "ما زال الرد السابق قيد المعالجة. انتظر اكتماله.",
  NOT_CONFIGURED: "خدمة المساعد غير مهيأة حالياً.",
  TIMEOUT: "استغرق الرد وقتاً أطول من المتوقع. حاول مجدداً.",
  UPSTREAM_ERROR: "تعذر الحصول على رد من خدمة الذكاء الاصطناعي. حاول مجدداً.",
  INTERNAL: "حدث خطأ غير متوقع.",
};

export class CopilotError extends Error {
  readonly code: CopilotErrorCode;
  readonly status: number;
  constructor(code: CopilotErrorCode) {
    super(code);
    this.name = "CopilotError";
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}

export type ChatInput = { sessionId?: string; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function parseChatInput(body: unknown): ChatInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CopilotError("INVALID_INPUT");
  }
  const { sessionId, message } = body as Record<string, unknown>;

  if (typeof message !== "string") throw new CopilotError("INVALID_INPUT");
  // إزالة محارف التحكم (عدا السطر الجديد والتبويب) ثم تقليم الفراغات.
  // eslint-disable-next-line no-control-regex
  const clean = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (clean.length === 0 || clean.length > LIMITS.maxMessageChars) {
    throw new CopilotError("INVALID_INPUT");
  }

  if (sessionId === undefined || sessionId === null) return { message: clean };
  if (!isValidSessionId(sessionId)) throw new CopilotError("INVALID_INPUT");
  return { sessionId, message: clean };
}
