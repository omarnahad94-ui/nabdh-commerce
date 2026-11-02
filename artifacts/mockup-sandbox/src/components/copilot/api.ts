import type {
  ChatError,
  ChatErrorKind,
  ChatResponse,
  ProductCardData,
  SourceLink,
} from "./types";

const CHAT_URL = "/api/copilot/chat";
const SESSIONS_URL = "/api/copilot/sessions";
const REQUEST_TIMEOUT_MS = 60_000;

const ERROR_TEXT: Record<ChatErrorKind, { message: string; retryable: boolean }> = {
  network: {
    message: "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
    retryable: true,
  },
  timeout: {
    message: "استغرق الرد وقتاً أطول من المتوقع. أعد المحاولة.",
    retryable: true,
  },
  rate_limit: {
    message: "عدد الطلبات كبير. انتظر قليلاً ثم أعد المحاولة.",
    retryable: true,
  },
  busy: {
    message: "ما زال الرد السابق قيد المعالجة. انتظر اكتماله ثم أعد المحاولة.",
    retryable: true,
  },
  session: {
    message:
      "انتهت جلسة هذه المحادثة على الخادم. يمكنك إعادة إرسال الرسالة لبدء جلسة جديدة، لكن المساعد لن يتذكر الرسائل السابقة.",
    retryable: true,
  },
  invalid: {
    message: "تعذّر قبول الرسالة. تأكد من أنها ليست فارغة وأن طولها لا يتجاوز 2000 حرف.",
    retryable: false,
  },
  server: {
    message: "تعذّر الحصول على رد من المساعد حالياً. أعد المحاولة بعد قليل.",
    retryable: true,
  },
  empty: {
    message: "وصل رد فارغ أو غير مفهوم من الخادم. أعد المحاولة.",
    retryable: true,
  },
};

export class CopilotApiError extends Error {
  readonly kind: ChatErrorKind | "aborted";
  constructor(kind: ChatErrorKind | "aborted") {
    super(kind);
    this.name = "CopilotApiError";
    this.kind = kind;
  }
}

// يرجع null عند الإلغاء المقصود (مثل حذف المحادثة أثناء الانتظار).
export function toChatError(err: unknown): ChatError | null {
  if (err instanceof CopilotApiError) {
    if (err.kind === "aborted") return null;
    const text = ERROR_TEXT[err.kind];
    return { kind: err.kind, message: text.message, retryable: text.retryable };
  }
  const text = ERROR_TEXT.server;
  return { kind: "server", message: text.message, retryable: text.retryable };
}

function kindFromStatus(status: number, hadSession: boolean): ChatErrorKind {
  if (status === 404 && hadSession) return "session";
  if (status === 400 || status === 413) return "invalid";
  if (status === 409) return "busy";
  if (status === 429) return "rate_limit";
  if (status === 504) return "timeout";
  return "server";
}

function parseCards(value: unknown): ProductCardData[] {
  if (!Array.isArray(value)) return [];
  const out: ProductCardData[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "number" || !Number.isFinite(r.id)) continue;
    if (typeof r.name !== "string") continue;
    out.push({
      id: r.id,
      name: r.name,
      price: typeof r.price === "number" && Number.isFinite(r.price) ? r.price : null,
      status: typeof r.status === "string" ? r.status : null,
    });
  }
  return out.slice(0, 20);
}

function parseSources(value: unknown): SourceLink[] {
  if (!Array.isArray(value)) return [];

  const out: SourceLink[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;

    const r = item as Record<string, unknown>;
    if (typeof r.url !== "string") continue;

    try {
      const parsed = new URL(r.url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") continue;

      const url = parsed.toString();
      if (seen.has(url)) continue;
      seen.add(url);

      const domain =
        typeof r.domain === "string" && r.domain.trim()
          ? r.domain.trim()
          : parsed.hostname;

      const title =
        typeof r.title === "string" && r.title.trim()
          ? r.title.trim()
          : domain;

      out.push({ title, url, domain });
      if (out.length >= 8) break;
    } catch {
      continue;
    }
  }

  return out;
}

function parseChatResponse(data: unknown): ChatResponse | null {
  if (typeof data !== "object" || data === null) return null;
  const r = data as Record<string, unknown>;
  if (typeof r.sessionId !== "string" || r.sessionId.length === 0) return null;
  if (typeof r.reply !== "string") return null;
  const reply = r.reply.trim();
  if (reply.length === 0) return null;
  const toolsUsed = Array.isArray(r.toolsUsed)
    ? r.toolsUsed.filter((t): t is string => typeof t === "string")
    : [];
  return {
    sessionId: r.sessionId,
    reply,
    cards: parseCards(r.cards),
    toolsUsed,
    sources: parseSources(r.sources),
  };
}

interface SendChatParams {
  message: string;
  sessionId: string | null;
  signal: AbortSignal;
}

export async function sendChat(params: SendChatParams): Promise<ChatResponse> {
  if (params.signal.aborted) throw new CopilotApiError("aborted");

  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort();
  params.signal.addEventListener("abort", onAbort, { once: true });
  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const failure = (): CopilotApiError => {
    if (timedOut) return new CopilotApiError("timeout");
    if (params.signal.aborted) return new CopilotApiError("aborted");
    return new CopilotApiError("network");
  };

  try {
    const body: { message: string; sessionId?: string } = { message: params.message };
    if (params.sessionId) body.sessionId = params.sessionId;

    let response: Response;
    try {
      response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw failure();
    }

    if (!response.ok) {
      throw new CopilotApiError(kindFromStatus(response.status, params.sessionId !== null));
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      if (timedOut || params.signal.aborted) throw failure();
      throw new CopilotApiError("server");
    }

    const parsed = parseChatResponse(data);
    if (!parsed) throw new CopilotApiError("empty");
    return parsed;
  } finally {
    window.clearTimeout(timer);
    params.signal.removeEventListener("abort", onAbort);
  }
}

// يرجع true عند النجاح أو إن كانت الجلسة غير موجودة أصلاً (404).
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SESSIONS_URL}/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}
