import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings")({
  component: Settings,
});

function Settings() {
  const { t } = useTranslation();
  const [darkEnabled, setDarkEnabled] = useState(false);
  return (
    <>
      <PageHeader title={t("admin.settings")} description={t("admin.settingsDesc")} />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("admin.general")}</TabsTrigger>
          <TabsTrigger value="branding">{t("admin.branding")}</TabsTrigger>
          <TabsTrigger value="billing">{t("admin.billing")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("admin.notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">{t("admin.workspaceSection")}</p>
            <p className="text-xs text-muted-foreground">{t("admin.workspaceSectionDesc")}</p>
            <Separator className="my-5" />
            <form className="grid gap-4 max-w-2xl" onSubmit={(e) => { e.preventDefault(); toast.success("Settings saved"); }}>
              <div className="space-y-1.5"><Label>{t("admin.workspaceName")}</Label><Input defaultValue="Lumen Academy" /></div>
              <div className="space-y-1.5"><Label>{t("admin.supportEmail")}</Label><Input type="email" defaultValue="hello@lumen.school" /></div>
              <div className="space-y-1.5"><Label>{t("admin.tagline")}</Label><Textarea rows={3} defaultValue="A premium learning platform for teams and individuals." /></div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div><p className="text-sm font-medium">{t("admin.enableDarkMode")}</p><p className="text-xs text-muted-foreground">{t("admin.darkModeDescription")}</p></div>
                <Switch checked={darkEnabled} onCheckedChange={setDarkEnabled} />
              </div>
              <div><Button type="submit"><Save className="mr-1.5 h-4 w-4" /> {t("common.saveChanges")}</Button></div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl">
            <div className="grid gap-4">
              <div className="space-y-1.5"><Label>{t("admin.primaryColor")}</Label><Input type="color" defaultValue="#3b82f6" className="h-10 w-28" /></div>
              <div className="space-y-1.5"><Label>{t("admin.logoUrl")}</Label><Input defaultValue="/favicon.ico" /></div>
              <Button className="w-fit"><Save className="mr-1.5 h-4 w-4" /> {t("common.save")}</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl">
            <p className="text-sm font-semibold">{t("admin.currentPlan")}</p>
            <p className="mt-1 text-2xl font-semibold">Team · <span className="text-primary">$49/mo</span></p>
            <p className="text-xs text-muted-foreground">Renews Feb 12, 2026 · 12 seats used of 25</p>
            <div className="mt-5 flex gap-2"><Button>{t("admin.upgradeEnterprise")}</Button><Button variant="outline">{t("admin.manageSeats")}</Button></div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl divide-y divide-border/60">
            {[
              ["Weekly summary","A digest every Monday morning."],
              ["Payment receipts","Emailed for each successful charge."],
              ["Product updates","Occasional emails about new features."],
            ].map(([t, d]) => (
              <div key={label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{d}</p></div>
                <Switch defaultChecked />
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
