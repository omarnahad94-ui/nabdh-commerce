import { useEffect, useState, type ComponentType } from "react";
import {
  Activity, BarChart3, Bot, Boxes, ChevronDown, CircleHelp,
  Clock3, LayoutDashboard, MessageCircle, Package, Plus,
  RefreshCw, Search, Settings, ShieldCheck, ShoppingBag,
  Sparkles, TrendingUp, X
} from "lucide-react";
import { modules as discoveredModules } from "./.generated/mockup-components";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;
type Product = {
  id: number;
  name: string;
  description: string | null;
  price: string | number | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
};

function _resolveComponent(mod: Record<string, unknown>, name: string): ComponentType | undefined {
  const fns = Object.values(mod).filter((v) => typeof v === "function") as ComponentType[];
  return (mod.default as ComponentType) || (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) || fns[fns.length - 1];
}

function PreviewRenderer({ componentPath, modules }: { componentPath: string; modules: ModuleMap }) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setComponent(null);
    setError(null);
    async function loadComponent() {
      const loader = modules[`./components/mockups/${componentPath}.tsx`];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }
      try {
        const mod = await loader();
        if (cancelled) return;
        const comp = _resolveComponent(mod, componentPath.split("/").pop()!);
        if (!comp) {
          setError(`No exported React component found in ${componentPath}.tsx`);
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    void loadComponent();
    return () => { cancelled = true; };
  }, [componentPath, modules]);

  if (error) return <pre className="p-8 text-red-500">{error}</pre>;
  if (!Component) return null;
  return <Component />;
}

const navItems = [
  { label: "الرئيسية", icon: LayoutDashboard, active: true },
  { label: "المنتجات", icon: Package },
  { label: "المنشورات", icon: ShoppingBag },
  { label: "مساعد المبيعات", icon: MessageCircle },
  { label: "التحليلات", icon: BarChart3 },
  { label: "الجدولة", icon: Clock3 },
];

function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("الكل");
  const [section, setSection] = useState("الرئيسية");
  const [showProductForm, setShowProductForm] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [formError, setFormError] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  async function analyzeProductImage() {
    if (!uploadedImageUrl) {
      setFormError("ارفع صورة المنتج أولاً");
      return;
    }
    setAnalyzingImage(true);
    setFormError("");
    try {
      const response = await fetch("/api/products/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedImageUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر تحليل الصورة");
      setFormName(data.suggestion.name);
      setFormDescription(data.suggestion.description);
      setFormError("تم إنشاء اقتراحات Gemini. يمكنك تعديلها قبل الحفظ.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذّر تحليل الصورة");
    } finally {
      setAnalyzingImage(false);
    }
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingProduct(true);
    setFormError("");
    try {
      const imageUrl = uploadedImageUrl || formImageUrl.trim() || null;

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          price: formPrice.trim() ? formPrice.trim() : null,
          imageUrl,
          status: "draft",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر حفظ المنتج");
      setFormName("");
      setFormDescription("");
      setFormPrice("");
      setFormImageUrl("");
      setSelectedImage(null);
      setUploadedImageUrl("");
      setShowProductForm(false);
      await loadProducts();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "تعذّر حفظ المنتج");
    } finally {
      setSavingProduct(false);
    }
  }

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setError("تعذّر تحميل المنتجات من الخادم. تأكد من تشغيل خدمة API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProducts(); }, []);

  const filtered = products.filter((p) => {
    const matchesSearch = `${p.name} ${p.description ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "الكل" || p.status === status;
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price: Product["price"]) =>
    price == null || price === "" ? "غير محدد" : `${Number(price).toLocaleString("en-US")} د.ع`;

  return (
    <div dir="rtl" className="min-h-screen bg-[#080d17] text-slate-100">
      <aside className="fixed right-0 top-0 z-20 hidden h-screen w-[250px] flex-col border-l border-white/[0.07] bg-[#0b1220] p-5 lg:flex">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/20">
            <Bot size={25} />
          </div>
          <div>
            <div className="text-base font-bold tracking-wide">نبض التجارة</div>
            <div className="mt-1 text-[11px] text-slate-500">لوحة إدارة ذكية</div>
          </div>
        </div>

        <div className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-600">القائمة الرئيسية</div>
        <nav className="space-y-1">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button key={label} onClick={() => setSection(label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${section === label ? "bg-teal-400/10 font-semibold text-teal-300 ring-1 ring-teal-400/15" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}>
              <Icon size={18} /> <span>{label}</span>
              {label === "مساعد المبيعات" && <span className="mr-auto h-2 w-2 rounded-full bg-teal-400" />}
            </button>
          ))}
        </nav>

        <div className="mb-3 mt-9 px-3 text-[10px] font-semibold tracking-[0.18em] text-slate-600">النظام</div>
        <button onClick={() => setSection("الإعدادات")} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/[0.04]">
          <Settings size={18} /> الإعدادات
        </button>
        <button onClick={() => setSection("المساعدة")} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-white/[0.04]">
          <CircleHelp size={18} /> المساعدة
        </button>

        <div className="mt-auto rounded-2xl border border-teal-400/15 bg-gradient-to-br from-teal-400/[0.10] to-blue-500/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-200"><Sparkles size={16} /> مساعد الذكاء الاصطناعي</div>
          <p className="text-xs leading-6 text-slate-400">مركز واحد لتنظيم منتجاتك ومتابعة نشاط قناتك.</p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><span className="h-2 w-2 rounded-full bg-teal-400" /> واجهة أولية</div>
        </div>
      </aside>

      <main className="min-h-screen lg:mr-[250px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#080d17]/90 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-teal-300 lg:hidden"><Bot size={21} /></div>
            <div>
              <div className="text-sm font-semibold">{section}</div>
              <div className="mt-1 text-[11px] text-slate-500">مساحة إدارة المنتجات والتجارة</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/[0.06] px-3 py-2 text-[11px] text-teal-300 sm:flex">
              <span className="h-2 w-2 rounded-full bg-teal-400" /> واجهة الإدارة
            </div>
            <button onClick={() => void loadProducts()} title="تحديث المنتجات" className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-slate-400 hover:text-teal-300"><RefreshCw size={17} /></button>
            <button className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-400/15 text-xs font-bold text-blue-300">م</span>
              <span className="hidden sm:inline">المدير</span><ChevronDown size={14} className="text-slate-500" />
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] space-y-7 p-4 sm:p-8">
          <section className="relative overflow-hidden rounded-3xl border border-teal-400/15 bg-gradient-to-l from-[#102d35] via-[#101d2b] to-[#111827] p-6 sm:p-8">
            <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-teal-400/[0.07] blur-3xl" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/[0.08] px-3 py-1.5 text-[11px] text-teal-200"><Sparkles size={13} /> مساحة عملك الذكية</div>
                <h1 className="text-2xl font-bold leading-relaxed sm:text-3xl">أهلاً بك في لوحة التحكم</h1>
                <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">نظّم منتجاتك، جهّز منشوراتك، وتابع أعمال قناتك من مكان واحد.</p>
                <button onClick={() => { setShowProductForm(v => !v); setFormError(""); }} className="group relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-xl border border-teal-200/30 bg-gradient-to-l from-teal-200 to-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_5px_22px_rgba(45,212,191,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-teal-100 hover:shadow-[0_10px_30px_rgba(45,212,191,0.30)] active:translate-y-0 active:scale-95">
                  <Plus size={18} className="transition-transform duration-500 group-hover:rotate-90 group-active:rotate-180" /> {showProductForm ? "إغلاق النموذج" : "إضافة منتج"}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300"><ShieldCheck size={25} /></div>
                <div><div className="text-sm font-semibold">قاعدة المنتجات</div><div className="mt-1 text-xs text-slate-500">اتصال عبر API</div></div>
                <Activity size={16} className="mr-2 text-teal-300" />
              </div>
            </div>
          </section>

          {showProductForm && (
            <div className="fixed inset-0 z-50">
              <button
                type="button"
                aria-label="إغلاق اللوحة"
                onClick={() => { setShowProductForm(false); setFormError(""); }}
                className="absolute inset-0 h-full w-full bg-black/70 backdrop-blur-sm"
              />
              <aside dir="rtl" className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-teal-400/20 bg-[#0b1220] shadow-2xl shadow-black/50">
                <section className="h-full overflow-y-auto p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">إضافة منتج جديد</h2>
                  <p className="mt-1 text-xs text-slate-500">سيُحفظ المنتج كمسودة في قاعدة البيانات.</p>
                </div>
                <button type="button" onClick={() => { setShowProductForm(false); setFormError(""); }} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:border-teal-400/40 hover:text-teal-300">إغلاق ✕</button>
              </div>
              <form onSubmit={saveProduct} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-300">اسم المنتج *
                  <div className="neon-field mt-2"><input required maxLength={200} value={formName} onChange={e => setFormName(e.target.value)} className="px-3 py-3 text-sm" placeholder="اسم المنتج" /></div>
                </label>
                <label className="text-sm text-slate-300">السعر بالدينار العراقي
                  <div className="neon-field mt-2"><input type="number" min="0" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} className="px-3 py-3 text-sm" placeholder="مثال: 25000" /></div>
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">الوصف
                  <div className="neon-field mt-2"><textarea rows={3} maxLength={5000} value={formDescription} onChange={e => setFormDescription(e.target.value)} className="px-3 py-3 text-sm" placeholder="تفاصيل المنتج ومميزاته" /></div>
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">اختيار صورة من الجهاز (اختياري)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async e => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        setFormError("حجم الصورة يجب ألا يتجاوز 10 ميغابايت");
                        e.target.value = "";
                        setSelectedImage(null);
                        return;
                      }
                      setFormError("");
                      setSelectedImage(file);
                      setUploadedImageUrl("");
                      setUploadingImage(true);
                      try {
                        const imageData = new FormData();
                        imageData.append("image", file);
                        const response = await fetch("/api/products/upload-image", { method: "POST", body: imageData });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error || "تعذّر رفع الصورة");
                        setUploadedImageUrl(data.imageUrl);
                        setFormError("تم رفع الصورة بنجاح");
                      } catch (err) {
                        setSelectedImage(null);
                        setFormError(err instanceof Error ? err.message : "تعذّر رفع الصورة");
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                    className="mt-2 w-full rounded-xl border border-white/[0.09] bg-[#080d17] px-3 py-3 text-sm outline-none focus:border-teal-400/50"
                  />
                  {uploadingImage && <span className="mt-2 block text-xs text-amber-300">جارٍ رفع الصورة...</span>}
                  {selectedImage && <span className="mt-2 block text-xs text-teal-300">{selectedImage.name}</span>}
                  {uploadedImageUrl && <img src={uploadedImageUrl} alt="معاينة صورة المنتج" className="mt-3 h-40 w-40 rounded-xl border border-white/10 object-cover" />}
                  {uploadedImageUrl && (
                    <button
                      type="button"
                      onClick={analyzeProductImage}
                      disabled={analyzingImage || uploadingImage}
                      className="mt-3 rounded-xl border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm font-bold text-teal-300 disabled:opacity-50"
                    >
                      {analyzingImage ? "جارٍ تحليل الصورة..." : "تحليل الصورة بالذكاء الاصطناعي"}
                    </button>
                  )}

                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">أو رابط صورة المنتج (اختياري)
                  <div className="neon-field mt-2"><input type="url" value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} className="px-3 py-3 text-sm" placeholder="https://..." /></div>
                </label>
                {formError && <p role="alert" className="text-sm text-rose-300 sm:col-span-2">{formError}</p>}
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button type="submit" disabled={savingProduct || uploadingImage} className="rounded-xl bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{savingProduct ? "جارٍ الحفظ..." : "حفظ المنتج"}</button>
                  <button type="button" onClick={() => { setShowProductForm(false); setFormError(""); }} className="rounded-xl border border-white/[0.1] px-5 py-3 text-sm text-slate-300">إلغاء</button>
                </div>
              </form>
                </section>
              </aside>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "إجمالي المنتجات", value: String(products.length), icon: Boxes, note: "من قاعدة البيانات", color: "text-teal-300", bg: "bg-teal-400/10" },
              { label: "مسودات المنتجات", value: String(products.filter(p => p.status === "draft").length), icon: Package, note: "تحتاج إلى المراجعة", color: "text-blue-300", bg: "bg-blue-400/10" },
              { label: "المنتجات المنشورة", value: String(products.filter(p => p.status === "published").length), icon: TrendingUp, note: "بحسب الحالة المسجلة", color: "text-violet-300", bg: "bg-violet-400/10" },
              { label: "حالة الاتصال", value: loading ? "جارٍ الفحص" : error ? "غير متصل" : "متصل", icon: Activity, note: "خادم المنتجات", color: error ? "text-rose-300" : "text-teal-300", bg: error ? "bg-rose-400/10" : "bg-teal-400/10" },
            ].map(({ label, value, icon: Icon, note, color, bg }) => (
              <div key={label} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111d2d] to-[#0b1422] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-teal-300/25 hover:shadow-[0_14px_36px_rgba(20,184,166,0.09)]">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}><Icon size={19} /></div>
                </div>
                <div className={`mt-5 text-3xl font-bold tracking-tight tabular-nums leading-none ${color}`}>{value}</div>
                <div className="mt-2 text-[11px] text-slate-500">{note}</div>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1523]">
            <div className="flex flex-col justify-between gap-4 border-b border-teal-300/[0.10] bg-gradient-to-l from-[#111d2d] to-[#0d1523] p-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h2 className="text-base font-bold">المنتجات</h2>
                <p className="mt-1.5 text-xs text-slate-500">المنتجات المحفوظة في قاعدة البيانات</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج..." className="w-full rounded-xl border border-white/[0.09] bg-[#080d17] py-2.5 pr-9 pl-9 text-sm outline-none placeholder:text-slate-600 focus:border-teal-400/40 sm:w-52" />
                  {search && <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={14} /></button>}
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-white/[0.09] bg-[#080d17] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-teal-400/40">
                  <option value="الكل">كل الحالات</option><option value="draft">مسودة</option><option value="published">منشور</option>
                </select>
              </div>
            </div>

            {error && <div className="m-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm leading-6 text-rose-200">{error}<button onClick={() => void loadProducts()} className="mr-3 underline">إعادة المحاولة</button></div>}

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-14 text-slate-400"><RefreshCw size={22} className="animate-spin text-teal-300" /><span className="text-sm">جارٍ تحميل المنتجات...</span></div>
            ) : !error && filtered.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-400/15 bg-teal-400/[0.06] text-teal-300"><Package size={28} /></div>
                <h3 className="mt-5 text-base font-semibold">{products.length === 0 ? "ما عندك منتجات محفوظة بعد" : "ما لقينا منتجات مطابقة"}</h3>
                <p className="mt-2 max-w-sm text-sm leading-7 text-slate-500">{products.length === 0 ? "اتصال قاعدة البيانات يعمل، لكن جدول المنتجات فارغ حاليًا. سنضيف نموذج إدخال المنتجات في الخطوة التالية." : "جرّب تغيير كلمة البحث أو فلتر الحالة."}</p>
                {search && <button onClick={() => { setSearch(""); setStatus("الكل"); }} className="mt-4 text-sm text-teal-300 hover:text-teal-200">مسح البحث والتصفية</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-right text-sm">
                  <thead className="bg-white/[0.02] text-[11px] text-slate-500"><tr><th className="px-6 py-4 font-medium">المنتج</th><th className="px-6 py-4 font-medium">السعر</th><th className="px-6 py-4 font-medium">الحالة</th><th className="px-6 py-4 font-medium">تاريخ الإضافة</th></tr></thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {filtered.map(p => <tr key={p.id} className="transition-colors duration-200 hover:bg-teal-300/[0.035]">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] text-slate-500">{p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={18} />}</div><div><div className="font-medium text-slate-200">{p.name}</div><div className="mt-1 max-w-xs truncate text-xs text-slate-500">{p.description || "لا يوجد وصف"}</div></div></div></td>
                      <td className="px-6 py-4 text-slate-300">{formatPrice(p.price)}</td>
                      <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] ${p.status === "published" ? "bg-teal-400/10 text-teal-300" : "bg-amber-400/10 text-amber-300"}`}>{p.status === "published" ? "منشور" : p.status === "draft" ? "مسودة" : p.status}</span></td>
                      <td className="px-6 py-4 text-xs text-slate-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString("ar-IQ") : "—"}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-4 text-[11px] text-slate-500 sm:px-6">
              <span>عدد النتائج: {filtered.length}</span><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-teal-400" /> تحديث يدوي متاح</span>
            </div>
          </section>

          <footer className="flex flex-col justify-between gap-2 pb-4 text-[11px] text-slate-600 sm:flex-row">
            <span>نبض التجارة · لوحة إدارة المنتجات</span><span>نسخة أولية قيد التطوير</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function getBasePath() { return import.meta.env.BASE_URL.replace(/\/$/, ""); }
function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const pathname = window.location.pathname;
  const local = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const previewPath = getPreviewPath();
  return previewPath
    ? <PreviewRenderer componentPath={previewPath} modules={discoveredModules} />
    : <Dashboard />;
}

export default App;
