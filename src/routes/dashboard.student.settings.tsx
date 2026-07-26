import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getPreferences, setPreferences, type PreferencesData } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/settings")({
  head: () => ({ meta: [{ title: "Settings — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: () => <SettingsPage role="student" />,
});

export function SettingsPage({ role }: { role: "student" | "teacher" }) {
  const [p, setP] = useState<PreferencesData>(() => getPreferences());
  const set = (k: keyof PreferencesData) => (v: boolean) => setP({ ...p, [k]: v });
  const groups: { title: string; items: { key: keyof PreferencesData; label: string; description: string }[] }[] = [
    { title: "Notifications", items: [
      { key: "emailUpdates", label: "Email updates", description: "Weekly summary of activity across your courses." },
      { key: "weeklyDigest", label: "Weekly digest", description: "Curated highlights every Monday morning." },
      { key: "liveReminders", label: "Live session reminders", description: "Get a nudge 30 minutes before sessions." },
    ]},
    { title: "Playback", items: [
      { key: "autoplay", label: "Autoplay next lesson", description: "Automatically play the next lesson when one ends." },
      { key: "captions", label: "Show captions by default", description: "Enable captions on every video player." },
    ]},
    { title: "Appearance", items: [
      { key: "darkMode", label: "Dark mode", description: "Use the darker theme across the workspace." },
    ]},
  ];
  return (
    <RoleDashboardLayout role={role}>
      <PageHeader
        title="Settings"
        description="Personalize notifications, playback and appearance."
        actions={
          <Button onClick={() => { setPreferences(p); toast.success("Preferences saved"); }}>
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
        }
      />
      <div className="space-y-4">
        {groups.map((g) => (
          <Card key={g.title} className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">{g.title}</p>
            <div className="mt-4 divide-y divide-border/60">
              {g.items.map((it) => (
                <div key={it.key} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <Label className="text-sm font-medium">{it.label}</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>
                  </div>
                  <Switch checked={p[it.key]} onCheckedChange={set(it.key)} />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </RoleDashboardLayout>
  );
}
