import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileText, FileVideo, Trash2, UploadCloud } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { pdfResources } from "@/lib/lms-storage";
import { UploadService } from "@/services";
import { useUploads } from "@/hooks/useUploads";
import { useTeacherCourses } from "@/hooks/useTeacherCourses";
import { EmptyState } from "@/components/common/EmptyState";
import { notifyResourceUploaded } from "@/lib/notification-events";
import { courses as allCourses } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/uploads")({
  head: () => ({ meta: [{ title: "Uploads — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Uploads,
});

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Uploads() {
  const uploads = useUploads();
  const courses = useTeacherCourses();
  const [tab, setTab] = useState<"videos" | "pdfs">("videos");
  const [course, setCourse] = useState<string>(courses[0]?.title ?? "General");
  const fileRef = useRef<HTMLInputElement>(null);

  const videos = uploads.filter((u) => u.kind === "video");
  const pdfs = uploads.filter((u) => u.kind === "pdf");

  function pickFiles() { fileRef.current?.click(); }
  function handleFiles(files: File[]) {
    if (!files.length) return;
    files.forEach((f) => {
      const isVideo = f.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(f.name);
      UploadService.create({
        title: f.name,
        course,
        size: humanSize(f.size),
        kind: isVideo ? "video" : "pdf",
        progress: 100,
      });
      notifyResourceUploaded({
        courseId: allCourses.find((c) => c.title === course)?.id,
        courseTitle: course,
        title: f.name,
        kind: isVideo ? "video" : "pdf",
      });
    });
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded — students notified`);
  }
  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files ?? []));
  }

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Uploads"
        description="Manage your course videos and PDF resources."
        actions={
          <div className="flex items-center gap-2">
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => <SelectItem key={c.id} value={c.title}>{c.title}</SelectItem>)}
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="video/*,application/pdf"
              onChange={onFiles}
              className="hidden"
            />
            <Button onClick={pickFiles}>
              <UploadCloud className="mr-1.5 h-4 w-4" /> Upload
            </Button>
          </div>
        }
      />
      <Card
        className="border-2 border-dashed border-border p-10 text-center shadow-card cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={pickFiles}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 text-sm font-semibold">Drop files here to upload</p>
        <p className="mt-1 text-xs text-muted-foreground">Videos up to 2 GB · PDFs up to 25 MB</p>
      </Card>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "videos" | "pdfs")}>
        <TabsList>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="pdfs">PDFs ({pdfs.length + pdfResources.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="videos">
          {videos.length === 0 ? (
            <EmptyState title="No videos yet" description="Upload your first course video." />
          ) : (
            <div className="grid gap-3">
              {videos.map((v) => (
                <Card key={v.id} className="flex flex-wrap items-center gap-4 border-border/60 p-4 shadow-card">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                    <FileVideo className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{v.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{v.course} · {v.size} · {v.uploaded}</p>
                  </div>
                  {v.progress < 100 ? (
                    <div className="w-40">
                      <Progress value={v.progress} className="h-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">Uploading {v.progress}%</p>
                    </div>
                  ) : <Badge variant="outline" className="bg-success/10 text-success border-success/20">Ready</Badge>}
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { UploadService.remove(v.id); toast.success("Removed"); }}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="pdfs">
          <div className="grid gap-3">
            {pdfs.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center gap-4 border-border/60 p-4 shadow-card">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.course} · {r.size} · {r.uploaded}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { UploadService.remove(r.id); toast.success("Removed"); }}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Card>
            ))}
            {pdfResources.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center gap-4 border-border/60 p-4 shadow-card">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.course} · {r.size} · {r.pages} pages</p>
                </div>
                <Badge variant="outline">Updated {r.updatedAt}</Badge>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </RoleDashboardLayout>
  );
}
