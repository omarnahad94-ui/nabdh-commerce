import { motion } from "framer-motion";
import { BarChart3, Bot, ListChecks, Megaphone, Scale, Search, type LucideIcon } from "lucide-react";

interface Suggestion {
  title: string;
  hint: string;
  icon: LucideIcon;
  action: "send" | "fill";
  text: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    title: "اعطني إحصائيات المنتجات",
    hint: "عدد المنتجات والحالات ونطاق الأسعار",
    icon: BarChart3,
    action: "send",
    text: "اعطني إحصائيات المنتجات",
  },
  {
    title: "ابحث عن منتج",
    hint: "اكتب اسم المنتج أو كلمة من وصفه",
    icon: Search,
    action: "fill",
    text: "ابحث لي عن منتج اسمه ",
  },
  {
    title: "قارن بين منتجات",
    hint: "فروقات الأسعار والحالات بين منتجين أو أكثر",
    icon: Scale,
    action: "fill",
    text: "قارن بين المنتجين: ",
  },
  {
    title: "اقترح خطة تسويقية",
    hint: "أفكار عملية مبنية على منتجاتك الحالية",
    icon: Megaphone,
    action: "send",
    text: "اقترح خطة تسويقية لمنتجاتي الحالية",
  },
  {
    title: "ساعدني في تنظيم العمل",
    hint: "ترتيب المهام اليومية لإدارة المتجر",
    icon: ListChecks,
    action: "send",
    text: "ساعدني في تنظيم العمل اليومي لإدارة متجري",
  },
];

interface WelcomeStateProps {
  onSend: (text: string) => void;
  onFill: (text: string) => void;
}

export function WelcomeState({ onSend, onFill }: WelcomeStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex max-w-3xl flex-col items-center py-6 text-center sm:py-10"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/20">
        <Bot size={34} />
      </div>
      <h2 className="mt-5 text-2xl font-bold">مساعد نبض التجارة</h2>
      <p className="mt-3 max-w-xl text-sm leading-8 text-slate-400">
        أنا مساعدك التجاري الذكي. أقرأ منتجاتك المحفوظة وأحلّلها وأقارن بينها، وأساعدك في التسويق والتخطيط وتنظيم العمل.
      </p>
      <p className="mt-2 max-w-xl text-xs leading-7 text-slate-500">
        أجيب اعتماداً على بيانات المنتجات فقط؛ لا تتوفر لدي بيانات مبيعات أو طلبات أو زبائن.
      </p>

      <div className="mt-8 grid w-full gap-3 text-start sm:grid-cols-2 lg:grid-cols-3">
        {SUGGESTIONS.map(({ title, hint, icon: Icon, action, text }) => (
          <button
            key={title}
            type="button"
            onClick={() => (action === "send" ? onSend(text) : onFill(text))}
            className="group flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111d2d] to-[#0b1422] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/30 hover:shadow-[0_10px_28px_rgba(20,184,166,0.09)] active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
              <Icon size={19} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-100">{title}</span>
              <span className="mt-1 block text-[11px] leading-5 text-slate-500">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
