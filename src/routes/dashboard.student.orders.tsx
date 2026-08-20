import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState, useRef } from "react";
import {
  CreditCard,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  History,
  ShieldCheck,
  Calendar,
  FileImage,
  X,
  Loader2,
  BookOpen,
  Heart,
  Search,
  ShoppingCart,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  submitSubscription,
  getMySubscription,
  getAllCourses,
  getWishlist,
  toggleWishlist,
  type MySubscriptions,
  type Subscription,
  type CourseAccess,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/orders")({
  head: () => ({ meta: [{ title: "My Subscription — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: MySubscription,
});

/* ============ Plans (static catalog) ============ */
type Plan = {
  id: "monthly" | "quarterly" | "yearly";
  price: number;
  featureCount: number;
  badge?: string;
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  { id: "monthly", price: 29, featureCount: 3 },
  { id: "quarterly", price: 75, badge: "save14", highlighted: true, featureCount: 3 },
  { id: "yearly", price: 249, badge: "bestValue", featureCount: 3 },
];

/* ============ Course shape for individual purchase ============ */
type RawCourse = {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  image_cover?: string;
  price?: number | string;
  category?: string;
  categories?: { name?: string };
};

/* ============ Helpers ============ */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function daysLeft(endsAt?: string | null) {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function coursePrice(c: RawCourse): number {
  const n = Number(c.price);
  return Number.isFinite(n) ? n : 0;
}

/* ============ Component ============ */
function MySubscription() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<MySubscriptions>({ plan: null, courses: [] });
  const [loading, setLoading] = useState(true);

  // purchase tab: "plans" | "courses"
  const [purchaseTab, setPurchaseTab] = useState<"plans" | "courses">("plans");

  // --- plan purchase dialog ---
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // --- course purchase dialog ---
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [allCourses, setAllCourses] = useState<RawCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseQuery, setCourseQuery] = useState("");
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [wishlist, setWishlistState] = useState<string[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // shared proof state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function statusLabel(status: Subscription["status"]) {
    switch (status) {
      case "active": return t("subscriptionPaged.status.active");
      case "pending": return t("subscriptionPaged.status.pending");
      case "expired": return t("subscriptionPaged.status.expired");
      case "rejected": return t("subscriptionPaged.status.rejected");
      case "cancelled": return t("subscriptionPaged.status.cancelled");
      default: return status;
    }
  }

  async function load() {
    setLoading(true);
    const res = await getMySubscription();
    console.log("res:",res)
    setData(res);
    setLoading(false);
  }

  useEffect(() => {
    load();
    setWishlistState(getWishlist());
  }, []);

  const { plan, courses: purchasedCourses } = data;

  const hasActivePlan = plan?.status === "active" && daysLeft(plan.ends_at) > 0;
  const hasPendingPlan = plan?.status === "pending";

  // course ids the student already has (active or pending) — excluded from the buy list
  const takenCourseIds = useMemo(
    () => new Set(purchasedCourses.filter((c) => c.status !== "rejected" && c.status !== "cancelled").map((c) => c.course_id)),
    [purchasedCourses],
  );

  /* ---------- Plan purchase flow ---------- */
  function openPlanDialog(p: Plan) {
    setSelectedPlan(p);
    setProofFile(null);
    setProofPreview(null);
    setPlanDialogOpen(true);
  }

  /* ---------- Course purchase flow ---------- */
  async function openCourseDialog() {
    setSelectedCourseIds([]);
    setCourseQuery("");
    setWishlistOnly(false);
    setCourseDialogOpen(true);
    setLoadingCourses(true);
    const res = await getAllCourses();
    setAllCourses(Array.isArray(res) ? res : []);
    setLoadingCourses(false);
  }

  function toggleCourseSelected(id: string) {
    setSelectedCourseIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function handleToggleWishlist(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setWishlistState(toggleWishlist(id));
  }

  const availableCourses = useMemo(() => {
    const q = courseQuery.trim().toLowerCase();
    return allCourses.filter((c) => {
      if (c.status && c.status !== "published") return false;
      if (takenCourseIds.has(c.id)) return false;
      if (wishlistOnly && !wishlist.includes(c.id)) return false;
      if (q && !c.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allCourses, takenCourseIds, wishlistOnly, wishlist, courseQuery]);

  const selectedCourses = useMemo(
    () => allCourses.filter((c) => selectedCourseIds.includes(c.id)),
    [allCourses, selectedCourseIds]
  );
  const selectedTotal = useMemo(
    () => selectedCourses.reduce((sum, c) => sum + coursePrice(c), 0),
    [selectedCourses],
  );

  function proceedToCoursePayment() {
    if (selectedCourseIds.length === 0) {
      toast.error(t("subscriptionPaged.courses.toast.selectAtLeastOne"));
      return;
    }
    setProofFile(null);
    setProofPreview(null);
    setCourseDialogOpen(false);
    setPurchaseTab("courses");
    setTimeout(() => setPlanDialogOpen(false), 0);
    setCoursePaymentOpen(true);
  }

  const [coursePaymentOpen, setCoursePaymentOpen] = useState(false);

  /* ---------- Shared file input ---------- */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error(t("subscriptionPaged.toast.invalidFileType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("subscriptionPaged.toast.fileTooLarge"));
      return;
    }
    setProofFile(file);
    if (file.type.startsWith("image/")) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview(null);
    }
  }

  async function handleSubmitPlan() {
    if (!selectedPlan || !proofFile) {
      toast.error(t("subscriptionPaged.toast.missingProof"));
      return;
    }
    setSubmitting(true);
    try {
      const base64 = await fileToBase64(proofFile);
      await submitSubscription({
        plan_name: t(`subscriptionPage.plans.${selectedPlan.id}.name`),
        amount: selectedPlan.price,
        payment_proof: base64,
      });
      toast.success(t("subscriptionPaged.toast.submitSuccess"));
      setPlanDialogOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("subscriptionPaged.toast.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitCourses() {
    if (selectedCourseIds.length === 0 || !proofFile) {
      toast.error(t("subscriptionPaged.toast.missingProof"));
      return;
    }
    setSubmitting(true);
    try {
      const base64 = await fileToBase64(proofFile);
      await submitSubscription({
        course_ids: selectedCourseIds,
        amount: selectedTotal,
        payment_proof: base64,
      });
      toast.success(t("subscriptionPaged.toast.submitSuccess"));
      setCoursePaymentOpen(false);
      setSelectedCourseIds([]);
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("subscriptionPaged.toast.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- History tables ---------- */
  const planHistoryColumns: Column<Subscription>[] = [
    {
      key: "plan_name" as any,
      header: t("subscriptionPaged.table.plan"),
      sortable: true,
      render: (r) => <span className="font-medium">{r.plan_name}</span>,
    },
    {
      key: "amount" as any,
      header: t("subscriptionPaged.table.amount"),
      sortable: true,
      render: (r) => `$${Number(r.amount).toFixed(2)}`,
    },
    {
      key: "status" as any,
      header: t("subscriptionPaged.table.status"),
      sortable: true,
      render: (r) => <StatusPill value={statusLabel(r.status)} />,
    },
    {
      key: "created_at" as any,
      header: t("subscriptionPaged.table.submitted"),
      sortable: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.created_at?.slice(0, 10) ?? "—"}</span>,
    },
    {
      key: "ends_at" as any,
      header: t("subscriptionPaged.table.expires"),
      render: (r) => <span className="text-sm text-muted-foreground">{r.ends_at ? r.ends_at.slice(0, 10) : "—"}</span>,
    },
  ];

  const courseHistoryColumns: Column<CourseAccess>[] = [
    {
      key: "course" as any,
      header: t("subscriptionPaged.table.course"),
      render: (r) => <span className="font-medium">{r.course?.title ?? r.course_id}</span>,
    },
    {
      key: "status" as any,
      header: t("subscriptionPaged.table.status"),
      sortable: true,
      render: (r) => <StatusPill value={statusLabel(r.status)} />,
    },
    {
      key: "starts_at" as any,
      header: t("subscriptionPaged.table.submitted"),
      render: (r) => <span className="text-sm text-muted-foreground">{r.starts_at?.slice(0, 10) ?? "—"}</span>,
    },
    {
      key: "ends_at" as any,
      header: t("subscriptionPaged.table.expires"),
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.status === "active" ? t("subscriptionPaged.table.lifetime") : r.ends_at ? r.ends_at.slice(0, 10) : "—"}
        </span>
      ),
    },
  ];

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title={t("subscriptionPaged.title")}
        description={t("subscriptionPaged.description")}
      />

      {/* ---- Current plan status ---- */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : hasActivePlan ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("subscriptionPaged.stats.currentPlan")} value={plan!.plan_name ?? "—"} icon={Sparkles} />
          <StatCard
            label={t("subscriptionPaged.stats.daysRemaining")}
            value={String(daysLeft(plan!.ends_at))}
            icon={Calendar}
          />
          <StatCard label={t("subscriptionPaged.stats.status")} value={t("subscriptionPaged.status.active")} icon={ShieldCheck} />
        </div>
      ) : hasPendingPlan ? (
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">
              {t("subscriptionPaged.pending.title", { plan: plan?.plan_name })}
            </p>
            <p className="text-sm text-muted-foreground">{t("subscriptionPaged.pending.description")}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{t("subscriptionPaged.noActive.title")}</p>
            <p className="text-sm text-muted-foreground">{t("subscriptionPaged.noActive.description")}</p>
          </div>
        </div>
      )}

      {/* ---- Purchased courses summary (always shown if any) ---- */}
      {!loading && purchasedCourses.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card p-4">
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">{t("subscriptionPaged.courses.ownedLabel")}</span>
          {purchasedCourses.map((c) => (
            <Badge key={c.subscription_id + c.course_id} variant={c.status === "active" ? "default" : "outline"}>
              {c.course?.title ?? c.course_id}
            </Badge>
          ))}
        </div>
      )}

      {/* ---- Purchase options: plans vs individual courses ---- */}
      {!hasActivePlan && !hasPendingPlan && (
        <>
          <Tabs value={purchaseTab} onValueChange={(v) => setPurchaseTab(v as "plans" | "courses")}>
            <TabsList>
              <TabsTrigger value="plans">{t("subscriptionPaged.tabs.plans")}</TabsTrigger>
              <TabsTrigger value="courses">{t("subscriptionPaged.tabs.courses")}</TabsTrigger>
            </TabsList>
          </Tabs>

          {purchaseTab === "plans" ? (
            <div className="mt-2 grid gap-5 md:grid-cols-3">
              {PLANS.map((p) => {
                const features = Array.from({ length: p.featureCount }, (_, i) =>
                  t(`subscriptionPage.plans.${p.id}.features.${i}`),
                );
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
                      p.highlighted ? "border-primary ring-1 ring-primary/40" : "border-border/60"
                    )}
                  >
                    {p.badge && (
                      <Badge className={cn(
                        "absolute -top-3 right-5",
                        p.highlighted ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      )}>
                        {t(`subscriptionPage.badges.${p.badge}`)}
                      </Badge>
                    )}
                    <p className="text-sm font-medium text-muted-foreground">
                      {t(`subscriptionPage.plans.${p.id}.name`)}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">${p.price}</span>
                      <span className="text-sm text-muted-foreground">
                        / {t(`subscriptionPage.plans.${p.id}.period`)}
                      </span>
                    </div>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6"
                      variant={p.highlighted ? "default" : "outline"}
                      onClick={() => openPlanDialog(p)}
                    >
                      <CreditCard className="mr-1.5 h-4 w-4" />
                      {t("subscriptionPaged.choosePlan", { plan: t(`subscriptionPage.plans.${p.id}.name`) })}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{t("subscriptionPaged.courses.title")}</p>
                  <p className="text-sm text-muted-foreground">{t("subscriptionPaged.courses.description")}</p>
                </div>
                <Button onClick={openCourseDialog}>
                  <ShoppingCart className="mr-1.5 h-4 w-4" />
                  {t("subscriptionPaged.courses.browse")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---- History ---- */}
      <div className="mt-4 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground">{t("subscriptionPaged.history")}</h2>
      </div>

      {plan && (
        <DataTable
          data={[plan]}
          columns={planHistoryColumns}
          searchKeys={["plan_name" as any]}
          filters={[
            {
              key: "status" as any,
              label: t("subscriptionPaged.table.status"),
              options: ["active", "pending", "expired", "rejected", "cancelled"],
            },
          ]}
        />
      )}

      {purchasedCourses.length > 0 ? (
        <DataTable
          data={purchasedCourses}
          columns={courseHistoryColumns}
          searchKeys={[]}
          filters={[
            {
              key: "status" as any,
              label: t("subscriptionPaged.table.status"),
              options: ["active", "pending", "expired", "rejected", "cancelled"],
            },
          ]}
        />
      ) : !plan ? (
        <EmptyState
          title={t("subscriptionPaged.empty.title")}
          description={t("subscriptionPaged.empty.description")}
        />
      ) : null}

      {/* ---- Plan payment proof dialog ---- */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("subscriptionPaged.dialog.title", {
                plan: selectedPlan ? t(`subscriptionPage.plans.${selectedPlan.id}.name`) : "",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("subscriptionPaged.dialog.descriptionPrefix")}{" "}
              <span className="font-semibold text-foreground">${selectedPlan?.price}</span>{" "}
              {t("subscriptionPaged.dialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>

          <ProofUploader
            fileInputRef={fileInputRef}
            proofFile={proofFile}
            proofPreview={proofPreview}
            onFileChange={handleFileChange}
            onClear={() => { setProofFile(null); setProofPreview(null); }}
            t={t}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanDialogOpen(false)} disabled={submitting}>
              {t("subscriptionPaged.dialog.cancel")}
            </Button>
            <Button onClick={handleSubmitPlan} disabled={!proofFile || submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              {submitting ? t("subscriptionPaged.dialog.submitting") : t("subscriptionPaged.dialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Course selection dialog ---- */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("subscriptionPaged.courses.dialog.title")}</DialogTitle>
            <DialogDescription>{t("subscriptionPaged.courses.dialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={courseQuery}
                onChange={(e) => setCourseQuery(e.target.value)}
                placeholder={t("catalog.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              variant={wishlistOnly ? "default" : "outline"}
              onClick={() => setWishlistOnly((v) => !v)}
              className="gap-1.5"
            >
              <Heart className={`h-4 w-4 ${wishlistOnly ? "fill-current" : ""}`} />
              {t("student.wishlist")}
              {wishlist.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {wishlist.length}
                </Badge>
              )}
            </Button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {loadingCourses ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableCourses.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("subscriptionPaged.courses.dialog.empty")}
              </p>
            ) : (
              availableCourses.map((c) => {
                const checked = selectedCourseIds.includes(c.id);
                const wished = wishlist.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                      checked ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={checked}
                      onChange={() => toggleCourseSelected(c.id)}
                    />
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg bg-muted bg-cover bg-center"
                      style={c.image_cover ? { backgroundImage: `url(${c.image_cover})` } : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      {c.subtitle && <p className="truncate text-xs text-muted-foreground">{c.subtitle}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold">${coursePrice(c).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(c.id, e)}
                      className="shrink-0 rounded-full p-1.5 hover:bg-muted"
                      aria-label={wished ? t("student.removeFromWishlist") : t("student.addToWishlist")}
                    >
                      <Heart className={`h-4 w-4 ${wished ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                  </label>
                );
              })
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">
              {t("subscriptionPaged.courses.dialog.selectedCount", { count: selectedCourseIds.length })}
              {selectedCourseIds.length > 0 && <> · <span className="font-semibold text-foreground">${selectedTotal.toFixed(2)}</span></>}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCourseDialogOpen(false)}>
                {t("subscriptionPaged.dialog.cancel")}
              </Button>
              <Button onClick={proceedToCoursePayment} disabled={selectedCourseIds.length === 0}>
                <CreditCard className="mr-1.5 h-4 w-4" />
                {t("subscriptionPaged.courses.dialog.proceed")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Course payment proof dialog ---- */}
      <Dialog open={coursePaymentOpen} onOpenChange={setCoursePaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("subscriptionPaged.courses.paymentDialog.title", { count: selectedCourseIds.length })}
            </DialogTitle>
            <DialogDescription>
              {t("subscriptionPaged.dialog.descriptionPrefix")}{" "}
              <span className="font-semibold text-foreground">${selectedTotal.toFixed(2)}</span>{" "}
              {t("subscriptionPaged.dialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-1.5">
            {selectedCourses.map((c) => (
              <Badge key={c.id} variant="secondary">{c.title}</Badge>
            ))}
          </div>

          <ProofUploader
            fileInputRef={fileInputRef}
            proofFile={proofFile}
            proofPreview={proofPreview}
            onFileChange={handleFileChange}
            onClear={() => { setProofFile(null); setProofPreview(null); }}
            t={t}
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCoursePaymentOpen(false)} disabled={submitting}>
              {t("subscriptionPaged.dialog.cancel")}
            </Button>
            <Button onClick={handleSubmitCourses} disabled={!proofFile || submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              {submitting ? t("subscriptionPaged.dialog.submitting") : t("subscriptionPaged.dialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}

/* ============ Reusable proof uploader ============ */
function ProofUploader({
  fileInputRef,
  proofFile,
  proofPreview,
  onFileChange,
  onClear,
  t,
}: {
  fileInputRef: React.RefObject<HTMLInputElement>;
  proofFile: File | null;
  proofPreview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onFileChange}
      />

      {!proofFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/70 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Upload className="h-6 w-6" />
          <span className="text-sm font-medium">{t("subscriptionPaged.dialog.uploadPrompt")}</span>
          <span className="text-xs">{t("subscriptionPaged.dialog.uploadHint")}</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
          {proofPreview ? (
            <img src={proofPreview} alt={t("subscriptionPaged.dialog.proofAlt")} className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
              <FileImage className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{proofFile.name}</p>
            <p className="text-xs text-muted-foreground">{(proofFile.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}