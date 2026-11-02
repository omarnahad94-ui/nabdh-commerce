import { useEffect, useState } from "react";
import { Info, Loader2, MessageSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "./types";

interface ItemProps {
  conversation: Conversation;
  active: boolean;
  pending: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({ conversation, active, pending, onSelect, onDelete }: ItemProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const count = conversation.messages.length;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-xl border px-2 py-1.5 transition",
          active ? "border-teal-400/20 bg-teal-400/10" : "border-transparent hover:bg-white/[0.04]",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          aria-current={active ? "true" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-start"
        >
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              active ? "bg-teal-400/15 text-teal-300" : "bg-white/[0.04] text-slate-500",
            )}
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
          </span>
          <span className="min-w-0">
            <span
              dir="auto"
              className={cn("block truncate text-sm", active ? "font-semibold text-teal-100" : "text-slate-300")}
            >
              {conversation.title}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              {count === 0 ? "فارغة" : `${count} رسالة`}
            </span>
          </span>
        </button>

        {confirming ? (
          <button
            type="button"
            onClick={onDelete}
            className="shrink-0 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/25"
          >
            تأكيد الحذف
          </button>
        ) : (
          <button
            type="button"
            aria-label="حذف المحادثة"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-lg p-2 text-slate-500 opacity-100 transition hover:bg-white/[0.06] hover:text-rose-300 focus-visible:opacity-100 xl:opacity-0 xl:group-hover:opacity-100"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </li>
  );
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string;
  pendingIds: string[];
  onSelect: (localId: string) => void;
  onNew: () => void;
  onDelete: (localId: string) => void;
}

export function ConversationSidebar({
  conversations,
  activeId,
  pendingIds,
  onSelect,
  onNew,
  onDelete,
}: ConversationSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <button
        type="button"
        onClick={onNew}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200/30 bg-gradient-to-l from-teal-200 to-teal-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-[0_5px_22px_rgba(45,212,191,0.16)] transition hover:brightness-105 active:scale-[0.98]"
      >
        <Plus size={17} /> محادثة جديدة
      </button>

      <div className="mb-2 px-2 text-[10px] font-semibold tracking-[0.18em] text-slate-600">
        محادثات هذه الجلسة
      </div>

      <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.localId}
            conversation={conversation}
            active={conversation.localId === activeId}
            pending={pendingIds.includes(conversation.localId)}
            onSelect={() => onSelect(conversation.localId)}
            onDelete={() => onDelete(conversation.localId)}
          />
        ))}
      </ul>

      <div className="mt-4 flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-[11px] leading-6 text-amber-100/80">
        <Info size={14} className="mt-1 shrink-0" />
        <p>
          المحادثات مؤقتة: تبقى في هذه الصفحة فقط وتختفي عند تحديثها، وقد تنتهي جلساتها على الخادم عند إعادة تشغيله.
        </p>
      </div>
    </div>
  );
}
