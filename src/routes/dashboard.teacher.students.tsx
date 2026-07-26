import { createFileRoute } from "@tanstack/react-router";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDerivedStudents } from "@/hooks/useTeacherStats";
import { useTeacherStats } from "@/hooks/useTeacherStats";
import { Users, UserCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

type Row = ReturnType<typeof useDerivedStudents>[number];

export const Route = createFileRoute("/dashboard/teacher/students")({
  head: () => ({ meta: [{ title: "Students — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: TeacherStudents,
});

function TeacherStudents() {
  const rows = useDerivedStudents();
  const stats = useTeacherStats();
  const cols: Column<Row>[] = [
    { key: "name", header: "Student", sortable: true, render: (u) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{u.name.split(" ").map((n) => n[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{u.name}</p>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
      </div>
    )},
    { key: "status", header: "Status", render: (u) => <StatusPill value={u.status} /> },
    { key: "enrolled", header: "Enrolled", sortable: true },
    { key: "spent", header: "Spent", sortable: true, render: (u) => `$${u.spent.toLocaleString()}` },
    { key: "joined", header: "Joined", sortable: true },
  ];
  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader title="Students" description="Everyone enrolled — updates automatically when new orders come in." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total students" value={stats.totalStudents.toLocaleString()} icon={Users} />
        <StatCard label="Active" value={stats.activeStudents.toLocaleString()} icon={UserCheck} />
        <StatCard label="Enrollments" value={stats.totalEnrollments.toLocaleString()} icon={ShoppingBag} />
      </div>
      <DataTable
        data={rows} columns={cols} searchKeys={["name", "email"]}
        filters={[{ key: "status", label: "Status", options: ["Active", "Pending", "Suspended"] }]}
        onView={() => toast.info("Student profile coming soon")}
        onEdit={() => toast.info("Message sent")}
      />
    </RoleDashboardLayout>
  );
}
