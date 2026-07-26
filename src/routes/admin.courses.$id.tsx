import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Star, Users, Clock, BookOpen, DollarSign, Calendar, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { courses } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/courses/$id")({
  loader: ({ params }) => {
    const course = courses.find((c) => c.id === params.id);
    if (!course) throw notFound();
    return { course };
  },
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Course not found</h1>
      <Button asChild className="mt-4"><Link to="/admin/courses">Back to courses</Link></Button>
    </div>
  ),
  component: CourseAdminDetail,
});

function CourseAdminDetail() {
  const { course } = Route.useLoaderData();
  const stats = [
    { icon: Users, label: "Students", value: course.students.toLocaleString() },
    { icon: Star, label: "Rating", value: `${course.rating.toFixed(1)} / 5.0` },
    { icon: Clock, label: "Duration", value: `${course.hours}h` },
    { icon: BookOpen, label: "Lessons", value: course.lessons },
    { icon: DollarSign, label: "Price", value: course.price === 0 ? "Free" : `$${course.price}` },
    { icon: Calendar, label: "Updated", value: course.updatedAt },
  ];

  return (
    <>
      <PageHeader
        title="Course details"
        description="Read-only view of course information."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/courses"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden border-border/60 p-0 shadow-card">
        <div className="h-40" style={{ backgroundImage: course.cover }} />
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{course.category}</Badge>
            <Badge variant="outline">{course.level}</Badge>
            <StatusPill value={course.status} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{course.title}</h2>
          <p className="text-sm text-muted-foreground">{course.description}</p>
          <div className="flex items-center gap-3 pt-2 border-t border-border/60">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Instructor</p>
              <p className="text-sm font-medium">{course.teacher}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-base font-semibold">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Metadata</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div><dt className="text-muted-foreground">Slug</dt><dd className="font-mono text-xs">{course.slug}</dd></div>
          <div><dt className="text-muted-foreground">ID</dt><dd className="font-mono text-xs">{course.id}</dd></div>
        </dl>
      </Card>
    </>
  );
}
