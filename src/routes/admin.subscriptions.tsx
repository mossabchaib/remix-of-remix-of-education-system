import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { Badge } from "@/components/ui/badge";
import { subscriptions as seed, type Subscription } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/subscriptions")({
  component: SubsAdmin,
});

function SubsAdmin() {
  const [rows, setRows] = useState<Subscription[]>(seed);
  const navigate = useNavigate();

  const columns: Column<Subscription>[] = [
    { key: "user", header: "Customer", sortable: true, render: (r) => <span className="font-medium">{r.user}</span> },
    { key: "plan", header: "Plan", sortable: true, render: (r) => <Badge variant="outline">{r.plan}</Badge> },
    { key: "amount", header: "Amount", sortable: true, render: (r) => `$${r.amount}/mo` },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill value={r.status} /> },
    { key: "renewsAt", header: "Renews", sortable: true, render: (r) => <span className="text-sm text-muted-foreground">{r.renewsAt}</span> },
  ];

  return (
    <>
      <PageHeader title="Subscriptions" description="Recurring plans across your customer base." />
      <DataTable
        data={rows}
        columns={columns}
        searchKeys={["user","plan"]}
        filters={[
          { key: "plan", label: "Plan", options: ["Free","Pro","Team","Enterprise"] },
          { key: "status", label: "Status", options: ["Active","Trialing","Canceled","Past due"] },
        ]}
        onView={(r) => navigate({ to: "/admin/subscriptions/$id", params: { id: r.id } })}
        onDelete={(r) => setRows((rows) => rows.filter((x) => x.id !== r.id))}
      />
    </>
  );
}
