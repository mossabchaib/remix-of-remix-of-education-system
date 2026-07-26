import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Save } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getProfile, setProfile } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/profile")({
  head: () => ({ meta: [{ title: "Profile — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: () => <ProfilePage role="student" />,
});

export function ProfilePage({ role }: { role: "student" | "teacher" }) {
  const [p, setP] = useState(() => getProfile());
  return (
    <RoleDashboardLayout role={role}>
      <PageHeader
        title="Profile"
        description="How you appear to instructors and classmates."
        actions={
          <Button onClick={() => { setProfile(p); toast.success("Profile saved"); }}>
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-border/60 p-6 shadow-card text-center">
          <div className="relative mx-auto w-24">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {p.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 h-8 w-8 rounded-full">
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-4 text-base font-semibold">{p.name}</p>
          <p className="text-xs text-muted-foreground">{p.email}</p>
          <Badge variant="outline" className="mt-3 capitalize">{role}</Badge>
        </Card>
        <Card className="border-border/60 p-6 shadow-card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={p.name} onChange={(v) => setP({ ...p, name: v })} />
            <Field label="Email" value={p.email} onChange={(v) => setP({ ...p, email: v })} />
            <Field label="Timezone" value={p.timezone} onChange={(v) => setP({ ...p, timezone: v })} />
            <Field label="Language" value={p.language} onChange={(v) => setP({ ...p, language: v })} />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea rows={5} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} />
          </div>
        </Card>
      </div>
    </RoleDashboardLayout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
