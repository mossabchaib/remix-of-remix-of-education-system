import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { ImagePlus, Save, Sparkles } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { categories, type Course } from "@/lib/mock-data";
import { CourseService } from "@/services";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/courses/new")({
  head: () => ({ meta: [{ title: "Create course — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: CreateCourse,
});

const covers = [
  "linear-gradient(135deg,#3b82f6,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#6366f1,#ec4899)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
];

function CreateCourse() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const [f, setF] = useState({
    title: "", subtitle: "", category: "", level: "Beginner" as Course["level"],
    price: "49", description: "", language: "English",
  });

  const buildCourse = (status: Course["status"]): Omit<Course, "id"> => ({
    title: f.title,
    slug: f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    category: f.category || categories[0].name,
    teacher: "You",
    price: Number(f.price) || 0,
    students: 0,
    rating: 0,
    level: f.level,
    hours: 0,
    lessons: 0,
    status,
    cover: covers[Math.floor(Math.random() * covers.length)],
    description: f.description || f.subtitle || "New course.",
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  const create = (status: Course["status"] = "Draft") => {
    if (!f.title) { toast.error(t("teacher.titleRequired")); return; }
    const created = CourseService.create(buildCourse(status));
    toast.success(status === "Published" ? t("teacher.coursePublished") : t("teacher.courseSavedDraft"));
    nav({ to: "/dashboard/teacher/courses/$id", params: { id: created.id } });
  };

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacher.createCourse")}
        description={t("teacher.createCourseDesc")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => create("Draft")}>{t("teacher.saveDraft")}</Button>
            <Button onClick={() => create("Published")}><Save className="mr-1.5 h-4 w-4" /> {t("teacher.publish")}</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-border/60 p-6 shadow-card space-y-5">
          <div className="space-y-2">
            <Label>{t("teacher.courseTitle")}</Label>
            <Input placeholder={t("teacher.courseTitlePlaceholder")} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>{t("teacher.courseSubtitle")}</Label>
            <Input placeholder={t("teacher.courseSubtitlePlaceholder")} value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("teacher.courseCategory")}</Label>
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                <SelectTrigger><SelectValue placeholder={t("teacher.categoryPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("teacher.courseLevel")}</Label>
              <Select value={f.level} onValueChange={(v) => setF({ ...f, level: v as Course["level"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Beginner", "Intermediate", "Advanced"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("teacher.coursePrice")}</Label>
              <Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("teacher.courseLanguage")}</Label>
              <Input value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("teacher.courseDescription")}</Label>
            <Textarea rows={6} placeholder={t("teacher.courseDescriptionPlaceholder")}
              value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">{t("teacher.coverImage")}</p>
            <div className="mt-3 grid h-40 place-items-center rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground">
              <div className="text-center">
                <ImagePlus className="mx-auto h-6 w-6" />
                <p className="mt-2 text-xs">{t("teacher.coverImageHint")}</p>
              </div>
            </div>
          </Card>
          <Card className="border-border/60 p-6 shadow-card">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" /><p className="text-sm font-semibold">{t("teacher.tips")}</p>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-4">
              <li>{t("teacher.tipTitle")}</li>
              <li>{t("teacher.tipSubtitle")}</li>
              <li>{t("teacher.tipContrast")}</li>
            </ul>
          </Card>
        </div>
      </div>
    </RoleDashboardLayout>
  );
}
