import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, Shield, Calendar, User as UserIcon, Trash2, Save } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserService } from "@/services";
import type { User } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({ meta: [{ title: "User details — Admin · Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params }) => {
    const user = UserService.get(params.id);
    if (!user) throw notFound();
    return { user };
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
  const { user } = Route.useLoaderData();
  const nav = useNavigate();
  const [u, setU] = useState<User>(user);
  const initials = u.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  const save = () => {
    UserService.save(u);
    toast.success("User saved");
  };
  const remove = () => {
    UserService.remove(u.id);
    toast.success("User deleted");
    nav({ to: "/admin/users" });
  };

  return (
    <>
      <PageHeader
        title="User details"
        description="View and edit account information."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/admin/users"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Link></Button>
            <Button variant="outline" size="sm" onClick={remove}><Trash2 className="mr-1.5 h-4 w-4" /> Delete</Button>
            <Button size="sm" onClick={save}><Save className="mr-1.5 h-4 w-4" /> Save</Button>
          </div>
        }
      />

      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold truncate">{u.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{u.role}</Badge>
            <StatusPill value={u.status} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile icon={UserIcon} label="ID" value={u.id} mono />
        <InfoTile icon={Mail} label="Email" value={u.email} />
        <InfoTile icon={Shield} label="Role" value={u.role} />
        <InfoTile icon={Calendar} label="Joined" value={u.joined} />
      </div>

      <Card className="border-border/60 p-6 shadow-card space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Edit profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={u.name} onChange={(e) => setU({ ...u, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={u.email} onChange={(e) => setU({ ...u, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={u.role} onValueChange={(v) => setU({ ...u, role: v as User["role"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Admin","Teacher","Student"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={u.status} onValueChange={(v) => setU({ ...u, status: v as User["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Active","Suspended","Pending"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
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
