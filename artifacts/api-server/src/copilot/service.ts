// artifacts/api-server/src/copilot/service.ts
// خدمة المحادثة: Gemini + حلقة Function Calling (قراءة فقط) + سياق الجلسة.

import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt";
import { CopilotError, LIMITS } from "./schemas";
import { appendTurn, type Session } from "./session-store";
import { executeTool, toolDeclarations, type ProductCard } from "./tools";

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new CopilotError("NOT_CONFIGURED");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

function logSafe(event: string, info: Record<string, string | number | undefined> = {}): void {
  console.error(`[copilot] ${event}`, info);
}

export interface GroundingSource {
  title: string;
  url: string;
  domain: string;
}

export interface ChatResult {
  reply: string;
  cards: ProductCard[];
  toolsUsed: string[];
  sources: GroundingSource[];
}

function mapUpstreamError(err: unknown, aborted: boolean): CopilotError {
  if (err instanceof CopilotError) return err;
  if (aborted) return new CopilotError("TIMEOUT");
  const status = (err as { status?: unknown } | null)?.status;
  logSafe("upstream_error", {
    name: err instanceof Error ? err.name : "unknown",
    status: typeof status === "number" ? status : undefined,
  });
  return new CopilotError("UPSTREAM_ERROR");
}

export async function chat(session: Session, userText: string): Promise<ChatResult> {
  if (session.busy) throw new CopilotError("BUSY");
  const ai = getClient();

  session.busy = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.geminiTimeoutMs);

  try {
    const contents: Content[] = [
      ...session.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: userText }] },
    ];

    const cards = new Map<number, ProductCard>();
    const toolsUsed: string[] = [];

    for (let round = 0; round <= LIMITS.maxToolRounds; round++) {
      const toolsAllowed = round < LIMITS.maxToolRounds;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.3,
          maxOutputTokens: 3000,
          abortSignal: controller.signal,
          tools: toolsAllowed
            ? [{ functionDeclarations: toolDeclarations }]
            : undefined,
          toolConfig: toolsAllowed
            ? { includeServerSideToolInvocations: true }
            : undefined,
        },
      });

      const candidates = response.candidates ?? [];
      const diagnosticParts = candidates.flatMap(
        (candidate) => candidate.content?.parts ?? [],
      );
      logSafe("gemini_response", {
        model: MODEL,
        round,
        toolsAllowed: toolsAllowed ? 1 : 0,
        functionCalls: (response.functionCalls ?? []).length,
        responseParts: diagnosticParts.map((part) => Object.keys(part).join(",")).join("|").slice(0, 300),
        finishReason: String(candidates[0]?.finishReason ?? "unknown"),
      });

      const calls = response.functionCalls ?? [];

      if (calls.length === 0 || !toolsAllowed) {
        const reply = response.text?.trim();
        if (!reply) throw new CopilotError("UPSTREAM_ERROR");
        appendTurn(session, userText, reply);
        return {
          reply,
          cards: [...cards.values()],
          toolsUsed: [...new Set(toolsUsed)],
          sources: [],
        };
      }

      const modelContent = response.candidates?.[0]?.content;
      if (!modelContent) throw new CopilotError("UPSTREAM_ERROR");
      contents.push(modelContent);

      const responseParts: Part[] = [];

      // نرسل FunctionResponse لكل استدعاء، لكن ننفّذ أربعة فقط في الدورة.
      for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const name = call.name ?? "";

        if (i >= LIMITS.maxToolCallsPerRound) {
          responseParts.push({
            functionResponse: {
              id: call.id,
              name,
              response: { output: { error: "tool_call_limit_reached" } },
            },
          });
          continue;
        }

        const args =
          call.args && typeof call.args === "object"
            ? (call.args as Record<string, unknown>)
            : {};

        toolsUsed.push(name);

        let output: Record<string, unknown>;
        try {
          const outcome = await executeTool(name, args);
          output = outcome.result;
          for (const card of outcome.cards) cards.set(card.id, card);
        } catch (err) {
          logSafe("tool_failed", {
            tool: name,
            name: err instanceof Error ? err.name : "unknown",
          });
          output = { error: "tool_failed" };
        }

        responseParts.push({
          functionResponse: { id: call.id, name, response: { output } },
        });
      }

      contents.push({ role: "user", parts: responseParts });
    }

    throw new CopilotError("INTERNAL");
  } catch (err) {
    throw mapUpstreamError(err, controller.signal.aborted);
  } finally {
    clearTimeout(timer);
    session.busy = false;
  }
}
