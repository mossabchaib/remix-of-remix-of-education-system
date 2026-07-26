import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { categories, courses as seed, type Course } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/courses")({
  component: CoursesAdmin,
});

function CoursesAdmin() {
  const navigate = useNavigate();

  const columns: Column<Course>[] = [
    {
      key: "title",
      header: "Course",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-14 shrink-0 rounded-md" style={{ backgroundImage: c.cover }} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.title}</p>
            <p className="truncate text-xs text-muted-foreground">{c.category} · {c.level}</p>
          </div>
        </div>
      ),
    },
    { key: "teacher", header: "Instructor", sortable: true },
    { key: "students", header: "Students", sortable: true, render: (c) => c.students.toLocaleString() },
    { key: "rating", header: "Rating", sortable: true, render: (c) => (
      <span className="inline-flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-primary text-primary" /> {c.rating.toFixed(1)}</span>
    )},
    { key: "price", header: "Price", sortable: true, render: (c) => c.price === 0 ? "Free" : `$${c.price}` },
    { key: "status", header: "Status", sortable: true, render: (c) => <StatusPill value={c.status} /> },
  ];

  return (
    <>
      <PageHeader title="Courses" description="Browse the learning catalog." />
      <DataTable
        data={seed}
        columns={columns}
        searchKeys={["title", "teacher", "category"]}
        filters={[
          { key: "category", label: "Category", options: categories.map((c) => c.name) },
          { key: "level", label: "Level", options: ["Beginner","Intermediate","Advanced"] },
          { key: "status", label: "Status", options: ["Published","Draft","Archived"] },
        ]}
        onView={(c) => navigate({ to: "/admin/courses/$id", params: { id: c.id } })}
      />
    </>
  );
}
