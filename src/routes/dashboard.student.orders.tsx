import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  type Subscription,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/orders")({
  head: () => ({ meta: [{ title: "My Subscription — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: MySubscription,
});

/* ============ Plans (static catalog) ============
   Names, prices, and periods are stable identifiers used to build translation
   keys (plans.<id>.name / plans.<id>.features.<index>) — the display strings
   themselves are resolved through t() in the component. */
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

/* ============ Component ============ */
function MySubscription() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function statusLabel(status: Subscription["status"]) {
    switch (status) {
      case "active": return t("subscriptionPage.status.active");
      case "pending": return t("subscriptionPage.status.pending");
      case "expired": return t("subscriptionPage.status.expired");
      case "rejected": return t("subscriptionPage.status.rejected");
      case "cancelled": return t("subscriptionPage.status.cancelled");
      default: return status;
    }
  }

  async function load() {
    setLoading(true);
    const sub = await getMySubscription();
    setCurrent(sub);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const hasActive = current?.status === "active" && daysLeft(current.ends_at) > 0;
  const hasPending = current?.status === "pending";

  function openPlanDialog(plan: Plan) {
    setSelectedPlan(plan);
    setProofFile(null);
    setProofPreview(null);
    setDialogOpen(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error(t("subscriptionPage.toast.invalidFileType"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("subscriptionPage.toast.fileTooLarge"));
      return;
    }
    setProofFile(file);
    if (file.type.startsWith("image/")) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview(null);
    }
  }

  async function handleSubmit() {
    if (!selectedPlan || !proofFile) {
      toast.error(t("subscriptionPage.toast.missingProof"));
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
      toast.success(t("subscriptionPage.toast.submitSuccess"));
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || t("subscriptionPage.toast.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  const historyColumns: Column<Subscription>[] = [
    {
      key: "plan_name" as any,
      header: t("subscriptionPage.table.plan"),
      sortable: true,
      render: (r) => <span className="font-medium">{r.plan_name}</span>,
    },
    {
      key: "amount" as any,
      header: t("subscriptionPage.table.amount"),
      sortable: true,
      render: (r) => `$${Number(r.amount).toFixed(2)}`,
    },
    {
      key: "status" as any,
      header: t("subscriptionPage.table.status"),
      sortable: true,
      render: (r) => <StatusPill value={statusLabel(r.status)} />,
    },
    {
      key: "created_at" as any,
      header: t("subscriptionPage.table.submitted"),
      sortable: true,
      render: (r) => <span className="text-sm text-muted-foreground">{r.created_at?.slice(0, 10) ?? "—"}</span>,
    },
    {
      key: "ends_at" as any,
      header: t("subscriptionPage.table.expires"),
      render: (r) => <span className="text-sm text-muted-foreground">{r.ends_at ? r.ends_at.slice(0, 10) : "—"}</span>,
    },
  ];

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title={t("subscriptionPage.title")}
        description={t("subscriptionPage.description")}
      />

      {/* ---- Current status ---- */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : hasActive ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("subscriptionPage.stats.currentPlan")} value={current!.plan_name} icon={Sparkles} />
          <StatCard
            label={t("subscriptionPage.stats.daysRemaining")}
            value={String(daysLeft(current!.ends_at))}
            icon={Calendar}
          />
          <StatCard label={t("subscriptionPage.stats.status")} value={t("subscriptionPage.status.active")} icon={ShieldCheck} />
        </div>
      ) : hasPending ? (
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">
              {t("subscriptionPage.pending.title", { plan: current?.plan_name })}
            </p>
            <p className="text-sm text-muted-foreground">{t("subscriptionPage.pending.description")}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{t("subscriptionPage.noActive.title")}</p>
            <p className="text-sm text-muted-foreground">{t("subscriptionPage.noActive.description")}</p>
          </div>
        </div>
      )}

      {/* ---- Plans ---- */}
      {!hasActive && !hasPending && (
        <div className="mt-2 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const features = Array.from({ length: plan.featureCount }, (_, i) =>
              t(`subscriptionPage.plans.${plan.id}.features.${i}`),
            );
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
                  plan.highlighted ? "border-primary ring-1 ring-primary/40" : "border-border/60"
                )}
              >
                {plan.badge && (
                  <Badge className={cn(
                    "absolute -top-3 right-5",
                    plan.highlighted ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  )}>
                    {t(`subscriptionPage.badges.${plan.badge}`)}
                  </Badge>
                )}
                <p className="text-sm font-medium text-muted-foreground">
                  {t(`subscriptionPage.plans.${plan.id}.name`)}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    / {t(`subscriptionPage.plans.${plan.id}.period`)}
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
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => openPlanDialog(plan)}
                >
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  {t("subscriptionPage.choosePlan", { plan: t(`subscriptionPage.plans.${plan.id}.name`) })}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- History ---- */}
      <div className="mt-4 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground">{t("subscriptionPage.history")}</h2>
      </div>
      {current ? (
        <DataTable
          data={[current]}
          columns={historyColumns}
          searchKeys={["plan_name" as any]}
          filters={[
            {
              key: "status" as any,
              label: t("subscriptionPage.table.status"),
              options: ["active", "pending", "expired", "rejected", "cancelled"],
            },
          ]}
        />
      ) : (
        <EmptyState
          title={t("subscriptionPage.empty.title")}
          description={t("subscriptionPage.empty.description")}
        />
      )}

      {/* ---- Payment proof dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("subscriptionPage.dialog.title", {
                plan: selectedPlan ? t(`subscriptionPage.plans.${selectedPlan.id}.name`) : "",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("subscriptionPage.dialog.descriptionPrefix")}{" "}
              <span className="font-semibold text-foreground">${selectedPlan?.price}</span>{" "}
              {t("subscriptionPage.dialog.descriptionSuffix")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {!proofFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/70 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">{t("subscriptionPage.dialog.uploadPrompt")}</span>
                <span className="text-xs">{t("subscriptionPage.dialog.uploadHint")}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                {proofPreview ? (
                  <img src={proofPreview} alt={t("subscriptionPage.dialog.proofAlt")} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted">
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{proofFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(proofFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setProofFile(null); setProofPreview(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
              {t("subscriptionPage.dialog.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!proofFile || submitting}>
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
              )}
              {submitting ? t("subscriptionPage.dialog.submitting") : t("subscriptionPage.dialog.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleDashboardLayout>
  );
}