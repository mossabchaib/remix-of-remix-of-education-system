import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Receipt as ReceiptIcon, ShoppingBag, Eye, RefreshCcw } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { ReceiptModal } from "@/components/student/ReceiptModal";
import { type Order } from "@/lib/lms-storage";
import { useOrders } from "@/hooks/useStudentData";
import { OrderService } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/orders")({
  head: () => ({ meta: [{ title: "My orders — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: MyOrders,
});

function MyOrders() {
  const { t } = useTranslation();
  const rows = useOrders();

  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const paid = rows.filter((r) => r.status === "paid");
  const totalSpent = paid.reduce((a, r) => a + r.amount, 0);

  const openPreview = (order: Order) => {
    setPreviewOrder(order);
    setPreviewOpen(true);
  };

  const retry = (order: Order) => {
    const retried = OrderService.retryPayment(order);
    toast.success(t("student.paymentRetried", { invoice: retried.invoice }));
  };

  const columns: Column<Order>[] = [
    { key: "invoice", header: t("admin.id"), sortable: true, render: (r) => <span className="font-mono text-xs">{r.invoice}</span> },
    { key: "courseTitle", header: t("admin.course"), sortable: true, render: (r) => <span className="font-medium">{r.courseTitle}</span> },
    { key: "amount", header: t("admin.price"), sortable: true, render: (r) => `$${r.amount.toFixed(2)}` },
    { key: "method", header: t("common.filter"), sortable: true },
    {
      key: "status",
      header: t("common.status"),
      sortable: true,
      render: (r) => (
        <StatusPill value={r.status === "paid" ? "Paid" : r.status === "failed" ? "Failed" : "Pending"} />
      ),
    },
    { key: "date", header: t("admin.updated"), sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.date.slice(0, 10)}</span> },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => openPreview(r)} title={t("student.quickPreview")}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/orders/$id/receipt" params={{ id: r.id }}>
              <ReceiptIcon className="mr-1.5 h-4 w-4" /> {t("student.receipt")}
            </Link>
          </Button>
          {r.status === "failed" && (
            <Button size="sm" onClick={() => retry(r)}>
              <RefreshCcw className="mr-1.5 h-4 w-4" /> {t("student.retry")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title={t("student.myOrdersTitle")} description={t("student.ordersDesc")} />
      {rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("student.totalOrders")} value={String(rows.length)} icon={ReceiptIcon} />
          <StatCard label={t("student.paid")} value={String(paid.length)} icon={ShoppingBag} />
          <StatCard label={t("student.totalSpent")} value={`$${totalSpent.toFixed(2)}`} icon={ReceiptIcon} />
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState
          title={t("student.noOrdersYet")}
          description={t("student.ordersEmptyDesc")}
          action={<Button asChild><Link to="/courses"><ShoppingBag className="mr-1.5 h-4 w-4" /> {t("student.browseCourses")}</Link></Button>}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          searchKeys={["invoice", "courseTitle"]}
          filters={[
            { key: "status", label: t("common.status"), options: ["paid", "failed", "pending"] },
            { key: "method", label: t("common.filter"), options: ["Card", "PayPal", "Free enrollment"] },
          ]}
        />
      )}

      <ReceiptModal order={previewOrder} open={previewOpen} onOpenChange={setPreviewOpen} />
    </RoleDashboardLayout>
  );
}