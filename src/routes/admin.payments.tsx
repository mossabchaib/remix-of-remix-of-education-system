import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { payments as seed, type Payment } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsAdmin,
});

function PaymentsAdmin() {
  const [rows, setRows] = useState<Payment[]>(seed);
  const navigate = useNavigate();

  const columns: Column<Payment>[] = [
    { key: "invoice", header: "Invoice", sortable: true, render: (r) => <span className="font-mono text-xs">{r.invoice}</span> },
    { key: "user", header: "Customer", sortable: true },
    { key: "method", header: "Method", sortable: true },
    { key: "amount", header: "Amount", sortable: true, render: (r) => `$${r.amount.toFixed(2)}` },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill value={r.status} /> },
    { key: "date", header: "Date", sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.date}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Transactions processed across all plans."
        actions={<Button size="sm" variant="outline"><Download className="mr-1.5 h-4 w-4" /> Export CSV</Button>}
      />
      <DataTable
        data={rows}
        columns={columns}
        searchKeys={["user","invoice"]}
        filters={[
          { key: "method", label: "Method", options: ["Card","PayPal","Bank"] },
          { key: "status", label: "Status", options: ["Paid","Refunded","Failed","Pending"] },
        ]}
        onView={(r) => navigate({ to: "/admin/payments/$id", params: { id: r.id } })}
        onDelete={(r) => setRows((rows) => rows.filter((x) => x.id !== r.id))}
      />
    </>
  );
}
