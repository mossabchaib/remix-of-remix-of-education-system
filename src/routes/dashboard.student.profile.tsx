import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Camera, Save, Loader2 } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getProfile, setProfile, type ProfileData } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/profile")({
  head: () => ({ meta: [{ title: "Profile — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: () => <ProfilePage role="student" />,
});

const EMPTY_PROFILE: ProfileData = { full_name: "", email: "" };

export function ProfilePage({ role }: { role: "student" | "teacher" }) {
  const { t } = useTranslation();
  const [p, setP] = useState<ProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    getProfile().then((data) => {
      if (mounted) {
        setP(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await setProfile({ full_name: p.full_name, avatar_url: p.avatar_url });
      setP((prev) => ({ ...prev, ...updated }));
      toast.success(t("student.profileSaved"));
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setP((prev) => ({ ...prev, avatar_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  const initials = p.full_name
    ? p.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (loading) {
    return (
      <RoleDashboardLayout role={role}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </RoleDashboardLayout>
    );
  }

  return (
    <RoleDashboardLayout role={role}>
      <PageHeader
        title={t("student.profileTitle")}
        description={t("student.profileDesc")}
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="border-border/60 p-6 shadow-card text-center">
          <div className="relative mx-auto w-24">
            <Avatar className="h-24 w-24">
              {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload">
              <Button
                asChild
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full cursor-pointer"
              >
                <span>
                  <Camera className="h-4 w-4" />
                </span>
              </Button>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          <p className="mt-4 text-base font-semibold">{p.full_name}</p>
          <p className="text-xs text-muted-foreground">{p.email}</p>
          <Badge variant="outline" className="mt-3 capitalize">
            {p.role ?? role}
          </Badge>
        </Card>
        <Card className="border-border/60 p-6 shadow-card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("student.fullName")}
              value={p.full_name}
              onChange={(v) => setP({ ...p, full_name: v })}
            />
            <Field label={t("student.email")} value={p.email} onChange={() => {}} disabled />
          </div>
        </Card>
      </div>
    </RoleDashboardLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}