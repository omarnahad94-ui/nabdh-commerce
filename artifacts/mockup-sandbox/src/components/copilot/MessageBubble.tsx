import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Check, Copy, Database, ExternalLink } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { RichText } from "./RichText";
import type { ChatMessage } from "./types";

const TOOL_LABELS: Record<string, string> = {
  search_products: "بحث في المنتجات",
  get_product: "تفاصيل منتج",
  compare_products: "مقارنة منتجات",
  get_catalog_stats: "إحصاءات المنتجات",
};

const MAX_VISIBLE_CARDS = 6;

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ننتقل إلى الطريقة الاحتياطية
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function BotAvatar() {
  return (
    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/20">
      <Bot size={19} />
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <BotAvatar />
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0d1523] px-4 py-3.5">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 animate-bounce rounded-full bg-teal-300/80 motion-reduce:animate-none"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
        <span className="text-sm text-slate-400">المساعد يعدّ الرد…</span>
      </div>
    </div>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [showAllCards, setShowAllCards] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (message.role === "user") {
    return (
      <motion.div
        data-msg-id={message.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="flex justify-end"
      >
        <div
          dir="auto"
          className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl border border-teal-300/20 bg-teal-400/[0.13] px-4 py-3 text-start text-[15px] leading-8 text-slate-50 sm:max-w-[75%]"
        >
          {message.content}
        </div>
      </motion.div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyText(message.content);
    setCopyState(ok ? "copied" : "failed");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
  };

  const toolLabels = [
    ...new Set(
      message.toolsUsed
        .map((tool) => TOOL_LABELS[tool])
        .filter((label): label is string => typeof label === "string"),
    ),
  ];

  const visibleCards = showAllCards ? message.cards : message.cards.slice(0, MAX_VISIBLE_CARDS);
  const hiddenCount = message.cards.length - MAX_VISIBLE_CARDS;

  return (
    <motion.div
      data-msg-id={message.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      <BotAvatar />
      <div className="min-w-0 max-w-3xl flex-1 space-y-3">
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d1523] px-4 py-3">
          <RichText text={message.content} />
        </div>

        {message.sources.length > 0 && (
          <div className="space-y-2 rounded-xl border border-teal-400/15 bg-teal-400/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-200">
              <ExternalLink size={14} />
              مصادر البحث والتحقق
            </div>
            <div className="space-y-2">
              {message.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:border-teal-400/25 hover:bg-white/[0.04]"
                >
                  <span className="min-w-0">
                    <span className="block break-words text-xs font-medium text-slate-200">
                      {source.title}
                    </span>
                    <span className="mt-1 block truncate text-[10px] text-slate-500" dir="ltr">
                      {source.domain}
                    </span>
                  </span>
                  <ExternalLink size={13} className="mt-0.5 shrink-0 text-teal-300" />
                </a>
              ))}
            </div>
          </div>
        )}

        {message.cards.length > 0 && (
          <div className="space-y-2">
            <div className="px-1 text-[11px] font-semibold text-slate-500">المنتجات المرتبطة بالإجابة</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleCards.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllCards((v) => !v)}
                className="px-1 text-xs text-teal-300 hover:text-teal-200"
              >
                {showAllCards ? "عرض أقل" : `عرض كل المنتجات (${message.cards.length})`}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label="نسخ الرد"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:border-teal-400/30 hover:text-teal-300"
          >
            {copyState === "copied" ? <Check size={13} className="text-teal-300" /> : <Copy size={13} />}
            {copyState === "copied" ? "تم النسخ" : copyState === "failed" ? "تعذّر النسخ" : "نسخ"}
          </button>

          {toolLabels.length > 0 && (
            <>
              <span className="text-[11px] text-slate-500">رجع المساعد إلى بيانات المنتجات:</span>
              {toolLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/20 bg-teal-400/[0.06] px-2.5 py-1 text-[11px] text-teal-200"
                >
                  <Database size={11} />
                  {label}
                </span>
              ))}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
