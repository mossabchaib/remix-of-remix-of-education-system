import { createFileRoute } from "@tanstack/react-router";
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
  const [darkEnabled, setDarkEnabled] = useState(false);
  return (
    <>
      <PageHeader title="Settings" description="Manage your workspace, branding, and preferences." />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">Workspace</p>
            <p className="text-xs text-muted-foreground">Public details visible to your learners.</p>
            <Separator className="my-5" />
            <form className="grid gap-4 max-w-2xl" onSubmit={(e) => { e.preventDefault(); toast.success("Settings saved"); }}>
              <div className="space-y-1.5"><Label>Workspace name</Label><Input defaultValue="Lumen Academy" /></div>
              <div className="space-y-1.5"><Label>Support email</Label><Input type="email" defaultValue="hello@lumen.school" /></div>
              <div className="space-y-1.5"><Label>Tagline</Label><Textarea rows={3} defaultValue="A premium learning platform for teams and individuals." /></div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div><p className="text-sm font-medium">Enable dark mode by default</p><p className="text-xs text-muted-foreground">Applies to new learners.</p></div>
                <Switch checked={darkEnabled} onCheckedChange={setDarkEnabled} />
              </div>
              <div><Button type="submit"><Save className="mr-1.5 h-4 w-4" /> Save changes</Button></div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl">
            <div className="grid gap-4">
              <div className="space-y-1.5"><Label>Primary color</Label><Input type="color" defaultValue="#3b82f6" className="h-10 w-28" /></div>
              <div className="space-y-1.5"><Label>Logo URL</Label><Input defaultValue="/favicon.ico" /></div>
              <Button className="w-fit"><Save className="mr-1.5 h-4 w-4" /> Save</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl">
            <p className="text-sm font-semibold">Current plan</p>
            <p className="mt-1 text-2xl font-semibold">Team · <span className="text-primary">$49/mo</span></p>
            <p className="text-xs text-muted-foreground">Renews Feb 12, 2026 · 12 seats used of 25</p>
            <div className="mt-5 flex gap-2"><Button>Upgrade to Enterprise</Button><Button variant="outline">Manage seats</Button></div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl divide-y divide-border/60">
            {[
              ["Weekly summary","A digest every Monday morning."],
              ["Payment receipts","Emailed for each successful charge."],
              ["Product updates","Occasional emails about new features."],
            ].map(([t, d]) => (
              <div key={t} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div><p className="text-sm font-medium">{t}</p><p className="text-xs text-muted-foreground">{d}</p></div>
                <Switch defaultChecked />
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
