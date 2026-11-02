// artifacts/api-server/src/copilot/router.ts
// POST   /chat             { sessionId?, message } -> { sessionId, reply, cards, toolsUsed }
// DELETE /sessions/:id     يحذف الجلسة
// يُسجَّل في routes/index.ts تحت المسار /copilot (فيصبح /api/copilot/... إن كان الجذر /api).

import { Router, json, type NextFunction, type Request, type Response } from "express";
import { chat } from "./service";
import {
  CopilotError,
  ERROR_MESSAGES_AR,
  isValidSessionId,
  parseChatInput,
  type CopilotErrorCode,
} from "./schemas";
import { createSession, deleteSession, getSession } from "./session-store";

const router = Router();

// ───────── تحديد معدل بسيط في الذاكرة (بدون مكتبات) ─────────
const PER_MINUTE = 15;
const PER_HOUR = 120;
const MAX_TRACKED_KEYS = 5000;
const hits = new Map<string, number[]>();

function ownerKeyOf(req: Request): string {
  // لا توجد مصادقة؛ نستخدم IP كمفتاح تقليل إساءة فقط.
  // خلف بروكسي (مثل Replit) فعّل app.set("trust proxy", 1) وإلا سيظهر IP البروكسي نفسه.
  return req.ip ?? "unknown";
}

function rateLimit(req: Request, _res: Response, next: NextFunction): void {
  const key = ownerKeyOf(req);
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3_600_000);
  const lastMinute = recent.filter((t) => now - t < 60_000).length;

  if (lastMinute >= PER_MINUTE || recent.length >= PER_HOUR) {
    hits.set(key, recent);
    return next(new CopilotError("RATE_LIMITED"));
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > MAX_TRACKED_KEYS) {
    const first = hits.keys().next().value;
    if (first !== undefined) hits.delete(first);
  }
  next();
}

const noStore = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("Cache-Control", "no-store");
  next();
};

router.use(noStore);
// حد صغير لحجم الجسم؛ إن كان app.ts يحلل JSON مسبقاً فهذا لا يتعارض.
router.use(json({ limit: "16kb" }));

router.post("/chat", rateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = parseChatInput(req.body);
    const ownerKey = ownerKeyOf(req);

    let session = input.sessionId ? getSession(input.sessionId, ownerKey) : null;
    if (input.sessionId && !session) throw new CopilotError("SESSION_NOT_FOUND");
    session ??= createSession(ownerKey);

    const result = await chat(session, input.message);
    res.json({
      sessionId: session.id,
      reply: result.reply,
      cards: result.cards,
      toolsUsed: result.toolsUsed,
      sources: result.sources,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/sessions/:id", rateLimit, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (!isValidSessionId(id)) throw new CopilotError("INVALID_INPUT");
    if (!deleteSession(id, ownerKeyOf(req))) throw new CopilotError("SESSION_NOT_FOUND");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// معالج أخطاء خاص بالوحدة: رسائل عامة فقط، دون تفاصيل داخلية.
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let code: CopilotErrorCode = "INTERNAL";
  let status = 500;

  if (err instanceof CopilotError) {
    code = err.code;
    status = err.status;
  } else if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    typeof (err as { type: unknown }).type === "string" &&
    String((err as { type: string }).type).startsWith("entity.")
  ) {
    // JSON تالف أو جسم كبير جداً من express.json
    code = "INVALID_INPUT";
    status = (err as { type: string }).type === "entity.too.large" ? 413 : 400;
  } else {
    console.error("[copilot] unhandled_error", {
      name: err instanceof Error ? err.name : "unknown",
    });
  }

  res.status(status).json({ error: { code, message: ERROR_MESSAGES_AR[code] } });
});

export default router;
