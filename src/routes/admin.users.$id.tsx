import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft, Mail, Shield, User as UserIcon,
  Receipt, GraduationCap, Users as UsersIcon, Star,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserService } from "@/services";
import { paymentsForUser, coursesForTeacher } from "@/lib/analytics";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({ meta: [{ title: "User details — Admin · Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ params }) => {
    const user:any = await UserService.get(params.id);
    if (!user) throw notFound();
    const payments = paymentsForUser(user.email);
    const taughtCourses = user?.role === "teacher" ? coursesForTeacher(user?.full_name) : [];
    return { user, payments, taughtCourses };
  },
  notFoundComponent: () => (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">User not found</h1>
      <Button asChild className="mt-4"><Link to="/admin/users">Back to users</Link></Button>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Retry</Button>
    </div>
  ),
  component: UserDetail,
});

function UserDetail() {
  const { user: u, payments, taughtCourses } = Route.useLoaderData();
  const initials = (u.full_name || "?").split(" ").map((n:any) => n[0]).join("").slice(0, 2).toUpperCase();

  const totalSpent = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalStudentsTaught = taughtCourses.reduce((sum:number, c:any) => sum + c?.students, 0);

  return (
    <>
      <PageHeader
        title="User details"
        description="View account information."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link>
          </Button>
        }
      />

      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-16 w-16">
            {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
            <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold truncate">{u.full_name}</h2>
            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">{u.role}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoTile icon={UserIcon} label="ID" value={u.id ?? "—"} mono />
        <InfoTile icon={Mail} label="Email" value={u.email} />
        <InfoTile icon={Shield} label="Role" value={u.role ?? "—"} />
      </div>

      {/* ── Payment history ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total spent" value={`$${totalSpent.toLocaleString()}`} icon={Receipt} />
        <StatCard label="Orders" value={String(payments.length)} icon={Receipt} />
      </div>

      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Payment history</p>
            <p className="text-xs text-muted-foreground">All purchases made by this user</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Receipt className="h-3 w-3" /> {payments.length}
          </Badge>
        </div>

        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No purchases yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border/60">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.courseTitle}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.invoice} · {p.method} · {p.date}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill value={p.status} />
                  <p className="w-16 text-right text-sm font-semibold">${p.amount}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Courses taught (Teacher only) ───────────────────────── */}
      {u.role === "teacher" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Courses taught" value={String(taughtCourses.length)} icon={GraduationCap} />
            <StatCard label="Students reached" value={totalStudentsTaught.toLocaleString()} icon={UsersIcon} />
          </div>

          <Card className="border-border/60 p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Courses taught</p>
                <p className="text-xs text-muted-foreground">Courses authored by this teacher</p>
              </div>
            </div>

            {taughtCourses.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No courses yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {taughtCourses.map((c:any) => (
                  <div
                    key={c.id}
                    className="overflow-hidden rounded-xl border border-border/60 bg-card"
                  >
                    <div className="h-20 w-full" style={{ background: c.cover }} />
                    <div className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <StatusPill value={c.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <UsersIcon className="h-3.5 w-3.5" /> {c.students.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {c.rating.toFixed(1)}
                        </span>
                        <span className="font-medium text-foreground">
                          {c.price === 0 ? "Free" : `$${c.price}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function InfoTile({ icon: Icon, label, value, mono }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <Card className="border-border/60 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={mono ? "truncate font-mono text-xs" : "truncate text-sm font-medium"}>{value}</p>
        </div>
      </div>
    </Card>
  );
}