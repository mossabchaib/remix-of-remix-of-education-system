import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Receipt as ReceiptIcon, ShoppingBag } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { type Order } from "@/lib/lms-storage";
import { useOrders } from "@/hooks/useStudentData";

export const Route = createFileRoute("/dashboard/student/orders")({
  head: () => ({ meta: [{ title: "My orders — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: MyOrders,
});

function MyOrders() {
  const rows = useOrders();
  const navigate = useNavigate();

  const paid = rows.filter((r) => r.status === "paid");
  const totalSpent = paid.reduce((a, r) => a + r.amount, 0);

  const columns: Column<Order>[] = [
    { key: "invoice", header: "Invoice", sortable: true, render: (r) => <span className="font-mono text-xs">{r.invoice}</span> },
    { key: "courseTitle", header: "Course", sortable: true, render: (r) => <span className="font-medium">{r.courseTitle}</span> },
    { key: "amount", header: "Amount", sortable: true, render: (r) => `$${r.amount.toFixed(2)}` },
    { key: "method", header: "Method", sortable: true },
    { key: "status", header: "Status", sortable: true, render: (r) => (
      <StatusPill value={r.status === "paid" ? "Paid" : r.status === "failed" ? "Failed" : "Pending"} />
    )},
    { key: "date", header: "Date", sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.date.slice(0, 10)}</span> },
  ];

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title="My orders" description="Purchase history and simulated receipts." />
      {rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total orders" value={String(rows.length)} icon={ReceiptIcon} />
          <StatCard label="Paid" value={String(paid.length)} icon={ShoppingBag} />
          <StatCard label="Total spent" value={`$${totalSpent.toFixed(2)}`} icon={ReceiptIcon} />
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Purchase a course to see your orders and receipts here."
          action={<Button asChild><Link to="/courses"><ShoppingBag className="mr-1.5 h-4 w-4" /> Browse courses</Link></Button>}
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          searchKeys={["invoice", "courseTitle"]}
          filters={[
            { key: "status", label: "Status", options: ["paid","failed","pending"] },
            { key: "method", label: "Method", options: ["Card","PayPal","Free enrollment"] },
          ]}
          onView={(r) => navigate({ to: "/orders/$id/receipt", params: { id: r.id } })}
        />
      )}
    </RoleDashboardLayout>
  );
}
