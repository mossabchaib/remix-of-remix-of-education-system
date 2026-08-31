import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, Loader2, Plus, Save, Trash2,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getTeacherCourseById, upsertTeacherCourse, getAdminCategories,
} from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/courses/$id")({
  head: () => ({ meta: [{ title: "Course builder — Lumen" }, { name: "robots", content: "noindex" }] }),
  loader: async ({ params }) => {
    try {
      const course = await getTeacherCourseById(params.id);
      if (!course) throw notFound();
      return { course };
    } catch (err) {
      throw notFound();
    }
  },
  component: Builder,
  errorComponent: ({ error, reset }) => {
    const { t } = useTranslation();
    return (
      <RoleDashboardLayout role="teacher">
        <Card className="p-10 text-center border-border/60 shadow-card">
          <p className="text-sm font-semibold">{t("builder.somethingWrong")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{error?.message || t("builder.failedLoadCourse")}</p>
          <Button className="mt-4" onClick={reset}>{t("builder.retry")}</Button>
        </Card>
      </RoleDashboardLayout>
    );
  },
  notFoundComponent: () => {
    const { t } = useTranslation();
    return (
      <RoleDashboardLayout role="teacher">
        <Card className="p-10 text-center border-border/60 shadow-card">{t("builder.courseNotFound")}</Card>
      </RoleDashboardLayout>
    );
  },
});

function Builder() {
  const { course } = Route.useLoaderData();
  const { t } = useTranslation();

  const LEVELS = useMemo(() => [
    { value: "beginner", label: t("builder.levels.beginner") },
    { value: "intermediate", label: t("builder.levels.intermediate") },
    { value: "advanced", label: t("builder.levels.advanced") },
  ], [t]);

  const STATUSES = useMemo(() => [
    { value: "draft", label: t("builder.statuses.draft") },
    { value: "published", label: t("builder.statuses.published") },
  ], [t]);

  // --- Course details state ---
  const [savingDetails, setSavingDetails] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(course?.image_cover || "");
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: course?.title || "",
    price: String(course?.price || 0),
    description: course?.description || "",
    subtitle: course?.subtitle || "",
    level: course?.level || "beginner",
    language: course?.language || "English",
    status: course?.status || "draft",
    image_cover: course?.image_cover || "",
    category_id: course?.category_id || "",
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res: any = await getAdminCategories();
        const data = Array.isArray(res) ? res : res?.categories || [];
        setCategoriesList(data);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        toast.error(t("builder.categoriesLoadError"));
      }
    }
    fetchCategories();
  }, [t]);

  useEffect(() => {
    if (course) {
      const courseDetails = course?.course ?? [];
      setForm({
        title: courseDetails.title || "",
        price: String(courseDetails.price || 0),
        description: courseDetails.description || "",
        subtitle: courseDetails.subtitle || "",
        level: courseDetails.level || "beginner",
        language: courseDetails.language || "English",
        status: courseDetails.status || "draft",
        image_cover: courseDetails.image_cover || "",
        category_id: courseDetails.category_id || "",
      });
      setImagePreview(courseDetails.image_cover || "");
    }
  }, [course]);

  const completion = useMemo(() => {
    const fields = [form.title, form.subtitle, form.description, form.category_id, form.image_cover];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [form.title, form.subtitle, form.description, form.category_id, form.image_cover]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setForm((prev) => ({ ...prev, image_cover: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setForm((prev) => ({ ...prev, image_cover: "" }));
  };

  // --- Save course details ---
  const saveDetails = async () => {
    try {
      setSavingDetails(true);
      const payload = {
        ...course,
        title: form.title,
        slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        price: Number(form.price) || 0,
        description: form.description,
        subtitle: form.subtitle,
        level: form.level,
        language: form.language,
        status: form.status,
        image_cover: form.image_cover,
        category_id: form.category_id,
        updated_at: new Date().toISOString(),
      };
      await upsertTeacherCourse(payload);
      toast.success(t("builder.detailsSaved"));
    } catch (err: any) {
      toast.error(err?.message || t("builder.detailsSaveError"));
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <RoleDashboardLayout role="teacher">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2">
          <Link to="/dashboard/teacher/courses"><ChevronLeft className="mr-1 h-4 w-4" /> {t("builder.backToCourses")}</Link>
        </Button>
        <span>/</span><span className="truncate">{course?.title}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{course?.title}</h1>
          <p className="text-sm text-muted-foreground">{t("builder.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={
              form.status === "published"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                : "border-border/60 bg-muted/40 text-muted-foreground"
            }
          >
            {form.status === "published" ? t("builder.published") : t("builder.draft")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main info */}
        <div className="space-y-6">
          <Card className="border-border/60 p-6 shadow-card space-y-5 bg-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t("builder.courseInformation")}</p>
              <span className="text-xs text-muted-foreground">{t("builder.percentComplete", { percent: completion })}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">{t("builder.titleLabel")}</Label>
              <Input
                placeholder={t("builder.titlePlaceholder")}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">{t("builder.subtitleLabel")}</Label>
              <Input
                placeholder={t("builder.subtitlePlaceholder")}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">{t("builder.categoryLabel")}</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder={t("builder.categoryPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {categoriesList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">{t("builder.languageLabel")}</Label>
                <Input
                  placeholder={t("builder.languagePlaceholder")}
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">{t("builder.descriptionLabel")}</Label>
              <Textarea
                rows={7}
                placeholder={t("builder.descriptionPlaceholder")}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </Card>

          <Card className="border-border/60 p-6 shadow-card space-y-4 bg-card">
            <p className="text-sm font-semibold">{t("builder.levelStatus")}</p>

            <div className="space-y-2">
              <Label className="font-medium text-xs text-muted-foreground">{t("builder.difficultyLevel")}</Label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => setForm({ ...form, level: lvl.value })}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-medium transition-all " +
                      (form.level === lvl.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="font-medium text-xs text-muted-foreground">{t("builder.visibility")}</Label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, status: s.value })}
                    className={
                      "rounded-full border px-4 py-1.5 text-xs font-medium transition-all " +
                      (form.status === s.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40")
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button disabled={savingDetails} onClick={saveDetails}>
              {savingDetails ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("common.saving")}</>
              ) : (
                <><Save className="mr-1.5 h-4 w-4" /> {t("builder.saveChanges")}</>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/60 p-6 shadow-card space-y-3 bg-card">
            <p className="text-sm font-semibold">{t("builder.coverImage")}</p>

            <div className="relative group overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/30 transition-all flex flex-col items-center justify-center h-48">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 text-foreground shadow-sm transition-all hover:bg-background"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center p-4 text-center">
                  <div className="mb-2 rounded-full bg-primary/10 p-3 text-primary transition-transform group-hover:scale-105">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{t("builder.uploadCoverImage")}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{t("builder.uploadHint")}</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </Card>

          <Card className="border-border/60 p-6 shadow-card space-y-4 bg-card">
            <p className="text-sm font-semibold">{t("builder.pricing")}</p>
            <div className="space-y-2">
              <Label className="font-medium">{t("builder.priceLabel")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-6"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{t("builder.priceHint")}</p>
            </div>
          </Card>

          <Card className="border-border/60 bg-card/50 p-6 shadow-card">
            <p className="mb-2 text-sm font-semibold text-primary">{t("builder.tips")}</p>
            <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">
              <li>{t("builder.tip1")}</li>
              <li>{t("builder.tip2")}</li>
              <li>{t("builder.tip3")}</li>
            </ul>
          </Card>
        </div>
      </div>
    </RoleDashboardLayout>
  );
}