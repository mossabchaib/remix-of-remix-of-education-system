import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Clock, Wallet, Users, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPendingSubscriptions,
  getAllSubscriptions,
  approveSubscription,
  rejectSubscription,
  type Subscription,
} from "@/lib/lms-storage";
import { SubscriptionReviewDialog } from "@/components/admin/SubscriptionReviewDialog";

export const Route = createFileRoute("/admin/subscriptions/")({
  component: SubsAdmin,
});

function SubsAdmin() {
  const { t } = useTranslation();

  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [rows, setRows] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Subscription | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch subscriptions for the active tab
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data =
        tab === "pending"
          ? await getPendingSubscriptions()
          : await getAllSubscriptions();
      setRows(data);
    } catch (err: any) {
      console.error("Failed to load subscriptions:", err);
      toast.error(err?.message || t("admin.subscription.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [tab, t]);

  useEffect(() => {
    load();
  }, [load]);

  const isCourseSub = (r: any) =>
    !!r.subscription_courses && r.subscription_courses.length > 0;

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const activeCount = rows.filter((r) => r.status === "active").length;
  const totalRevenue = rows
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // عدد الأشخاص الفريدين اللي عندهم اشتراك كورس نشط (وليس باقة)
  const courseBuyersCount = new Set(
    rows
      .filter((r) => r.status === "active" && isCourseSub(r))
      .map((r) => r.user_id)
  ).size;

  function openReview(sub: Subscription) {
    setSelected(sub);
    setReviewOpen(true);
  }

  async function handleApprove(days: number) {
    if (!selected) return;
    try {
      setIsProcessing(true);
      await approveSubscription(selected.id, days);
      toast.success(t("admin.subscription.toast.approved"));
      setReviewOpen(false);
      await load();
    } catch (err: any) {
      console.error("Approve error:", err);
      toast.error(err?.message || t("admin.subscription.errors.approveFailed"));
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    try {
      setIsProcessing(true);
      await rejectSubscription(selected.id);
      toast.success(t("admin.subscription.toast.rejected"));
      setReviewOpen(false);
      await load();
    } catch (err: any) {
      console.error("Reject error:", err);
      toast.error(err?.message || t("admin.subscription.errors.rejectFailed"));
    } finally {
      setIsProcessing(false);
    }
  }

  const columns: Column<Subscription>[] = [
    {
      key: "profiles" as any,
      header: t("admin.subscription.table.customer"),
      render: (r) => (
        <div>
          <p className="font-medium">{r.profiles?.full_name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">
            {r.profiles?.email ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "plan_name" as any,
      header: t("admin.subscription.table.plan"),
      render: (r:any) =>
        isCourseSub(r) ? (
          <div className="flex flex-wrap gap-1">
            {r.subscription_courses!.map((sc:any) => (
              <Badge key={sc.course_id} variant="secondary">
                {sc.courses?.title ?? sc.course_id}
              </Badge>
            ))}
          </div>
        ) : (
          <Badge variant="outline">{r.plan_name}</Badge>
        ),
    },
    {
      key: "amount" as any,
      header: t("admin.subscription.table.amount"),
      sortable: true,
      render: (r) => `DA ${Number(r.amount).toFixed(2)}`,
    },
    {
      key: "status" as any,
      header: t("admin.subscription.table.status"),
      sortable: true,
      render: (r) => (
        <StatusPill value={r.status.charAt(0).toUpperCase() + r.status.slice(1)} />
      ),
    },
    {
      key: "created_at" as any,
      header: t("admin.subscription.table.submitted"),
      sortable: true,
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.created_at?.slice(0, 10) ?? "—"}
        </span>
      ),
    },
    {
      key: "ends_at" as any,
      header: t("admin.subscription.table.expires"),
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {isCourseSub(r)
            ? t("admin.subscription.table.lifetime")
            : r.ends_at
            ? r.ends_at.slice(0, 10)
            : "—"}
        </span>
      ),
    },
    {
      key: "id" as any,
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant={r.status === "pending" ? "default" : "outline"}
          onClick={() => openReview(r)}
        >
          {r.status === "pending"
            ? t("admin.subscription.actions.review")
            : t("admin.subscription.actions.view")}
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.subscription.title")}
        description={t("admin.subscription.description")}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label={t("admin.subscription.stats.pending")}
          value={String(pendingCount)}
          icon={Clock}
        />
        <StatCard
          label={t("admin.subscription.stats.active")}
          value={String(activeCount)}
          icon={Users}
        />
        <StatCard
          label={t("admin.subscription.stats.courseBuyers")}
          value={String(courseBuyersCount)}
          icon={GraduationCap}
        />
        <StatCard
          label={t("admin.subscription.stats.revenue")}
          value={`DA ${totalRevenue.toFixed(2)}`}
          icon={Wallet}
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "all")}>
        <TabsList>
          <TabsTrigger value="pending">
            {t("admin.subscription.tabs.pending")}
            {pendingCount > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            {t("admin.subscription.tabs.all")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border/60 bg-card py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 bg-card py-16 text-center">
          <p className="text-sm font-medium">
            {t("admin.subscription.empty.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {tab === "pending"
              ? t("admin.subscription.empty.pendingHint")
              : t("admin.subscription.empty.allHint")}
          </p>
        </div>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          searchKeys={["plan_name" as any]}
          filters={[
            {
              key: "status" as any,
              label: t("admin.subscription.filters.status"),
              options: ["pending", "active", "expired", "rejected", "cancelled"],
            },
          ]}
        />
      )}

      <SubscriptionReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!isProcessing) setReviewOpen(open);
        }}
        subscription={selected}
        onApprove={handleApprove}
        onReject={handleReject}
        isProcessing={isProcessing}
      />
    </>
  );
}