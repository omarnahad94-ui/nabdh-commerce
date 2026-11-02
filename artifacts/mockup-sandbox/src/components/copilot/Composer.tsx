import { useLayoutEffect, type KeyboardEvent, type RefObject } from "react";
import { Loader2, Send } from "lucide-react";
import { MAX_MESSAGE_CHARS } from "./types";

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function Composer({ value, onChange, onSubmit, pending, textareaRef }: ComposerProps) {
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, textareaRef]);

  const length = value.trim().length;
  const tooLong = length > MAX_MESSAGE_CHARS;
  const canSend = !pending && length > 0 && !tooLong;

  const submit = () => {
    if (canSend) onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2">
        <div className="neon-field min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            dir="auto"
            aria-label="اكتب رسالتك"
            placeholder="اسأل عن منتجاتك، أو اطلب تحليلاً أو خطة…"
            className="max-h-[200px] resize-none overflow-y-auto px-4 py-3 text-[15px] leading-7 text-slate-100 placeholder:text-slate-600"
          />
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="إرسال"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-teal-200/30 bg-gradient-to-l from-teal-200 to-teal-400 text-slate-950 shadow-[0_5px_22px_rgba(45,212,191,0.16)] transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="-scale-x-100" />}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-500">
        <span>المساعد للقراءة والتحليل فقط، ولا ينفّذ أي تعديل على منتجاتك.</span>
        <span className="flex shrink-0 items-center gap-3">
          {length >= 1600 && (
            <span className={tooLong ? "text-rose-300" : "text-slate-400"}>
              {length}/{MAX_MESSAGE_CHARS}
            </span>
          )}
          <span className="hidden sm:inline">Enter للإرسال · Shift+Enter لسطر جديد</span>
        </span>
      </div>
    </form>
  );
}
