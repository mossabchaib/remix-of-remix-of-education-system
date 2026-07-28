import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Eye, FileArchive, FileCode2, FileText, Search, Video } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { ResourcePreviewModal } from "@/components/student/ResourcePreviewModal";
import { useUploads } from "@/services/useUploads";
import { useEnrollments } from "@/services/useEnrollments";
import { baseCourses, type Upload, type UploadKind } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/resources")({
  head: () => ({ meta: [{ title: "Resources — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Resources,
});

const kindIcon: Record<UploadKind, typeof FileText> = {
  video: Video, pdf: FileText, code: FileCode2, document: FileText, archive: FileArchive,
};
const kindLabel: Record<UploadKind, string> = {
  video: "Video", pdf: "PDF", code: "Code", document: "Document", archive: "Archive",
};
const filterTabs: Array<{ value: "all" | UploadKind; label: string }> = [
  { value: "all", label: "All" },
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Video" },
  { value: "code", label: "Code" },
  { value: "document", label: "Slides" },
  { value: "archive", label: "Archives" },
];

function Resources() {
  const uploads = useUploads();
  const enrolledIds = useEnrollments();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | UploadKind>("all");
  const [active, setActive] = useState<Upload | null>(null);
  const [open, setOpen] = useState(false);

  const enrolledTitles = useMemo(
    () => new Set(baseCourses.filter((c) => enrolledIds.includes(c.id)).map((c) => c.title)),
    [enrolledIds],
  );

  const availableResources = useMemo(
    () =>
      uploads.filter((u) =>
        u.courseId ? enrolledIds.includes(u.courseId) : enrolledTitles.has(u.course),
      ),
    [uploads, enrolledIds, enrolledTitles],
  );

  const filtered = availableResources.filter((r) => {
    const matchesQuery =
      r.title.toLowerCase().includes(q.toLowerCase()) || r.course.toLowerCase().includes(q.toLowerCase());
    const matchesKind = kind === "all" || r.kind === kind;
    return matchesQuery && matchesKind;
  });

  function handleDownload(r: Upload) {
    toast.success(`${r.title} downloaded`);
  }

  function openPreview(r: Upload) {
    setActive(r);
    setOpen(true);
  }

  return (
    <RoleDashboardLayout role="student">
      <PageHeader
        title="Resources"
        description="Files and attachments from courses you're enrolled in."
        actions={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources or course" className="pl-9" />
          </div>
        }
      />

      <Tabs value={kind} onValueChange={(v) => setKind(v as "all" | UploadKind)} className="mb-4">
        <TabsList>
          {filterTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {availableResources.length === 0 ? (
        <EmptyState
          title="No resources yet"
          description="Resources will appear here once your enrolled courses publish materials."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matches" description="Try a different search term or filter." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const Icon = kindIcon[r.kind];
            return (
              <Card key={r.id} className="border-border/60 p-5 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.course}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{kindLabel[r.kind]}</Badge>
                      <Badge variant="outline" className="text-xs">{r.size}</Badge>
                      <span className="text-xs text-muted-foreground">Updated {r.uploaded}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => handleDownload(r)}>
                    <Download className="mr-1.5 h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" onClick={() => openPreview(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ResourcePreviewModal
        resource={active}
        open={open}
        onOpenChange={setOpen}
        onDownload={handleDownload}
      />
    </RoleDashboardLayout>
  );
}