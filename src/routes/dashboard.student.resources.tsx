import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, ExternalLink, FileText, Search } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { pdfResources } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/resources")({
  head: () => ({ meta: [{ title: "PDF resources — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Resources,
});

function Resources() {
  const [q, setQ] = useState("");
  const items = pdfResources.filter(
    (r) => r.title.toLowerCase().includes(q.toLowerCase()) || r.course.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Resources"
        description="Cheat sheets, reference guides, and workbooks from your courses."
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources" className="pl-9" />
          </div>
        }
      />
      {items.length === 0 ? (
        <EmptyState title="No resources" description="Try a different search term." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id} className="border-border/60 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.course}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">PDF · {r.pages}p</Badge>
                    <Badge variant="outline" className="text-xs">{r.size}</Badge>
                    <span className="text-xs text-muted-foreground">Updated {r.updatedAt}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => toast.success(`${r.title} downloaded`)}
                >
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info("Opening preview")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </RoleDashboardLayout>
  );
}
