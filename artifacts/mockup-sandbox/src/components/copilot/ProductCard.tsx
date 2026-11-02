import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ProductCardData } from "./types";

function formatPrice(price: number | null): string {
  return price === null ? "غير محدد" : `${price.toLocaleString("en-US")} د.ع`;
}

function statusLabel(status: string | null): { text: string; className: string } {
  if (status === "published") return { text: "منشور", className: "bg-teal-400/10 text-teal-300" };
  if (status === "draft") return { text: "مسودة", className: "bg-amber-400/10 text-amber-300" };
  if (status === null || status === "") return { text: "غير محدد", className: "bg-white/[0.06] text-slate-400" };
  return { text: status, className: "bg-white/[0.06] text-slate-300" };
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const status = statusLabel(product.status);
  return (
    <Card className="border-white/[0.08] bg-[#0f1a2b] text-slate-100 shadow-none transition hover:border-teal-300/30">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
          <Package size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div dir="auto" className="line-clamp-2 text-sm font-semibold leading-6 text-slate-100">
            {product.name}
          </div>
          <div className="mt-1.5 text-sm tabular-nums text-teal-200">{formatPrice(product.price)}</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] ${status.className}`}>{status.text}</span>
            <span className="text-[11px] text-slate-500">رقم {product.id}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
