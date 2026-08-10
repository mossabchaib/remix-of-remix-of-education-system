import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft, FileVideo, GripVertical, ListChecks, Loader2, Plus, Save, Trash2,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getTeacherCourseById, upsertTeacherCourse, getAdminCategories,
  resolvedModules, setStoredModules, deleteStoredModule, deleteStoredLesson,
  type Module, type Lesson,
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

const isTempId = (id: string) => id.startsWith("m-") || id.startsWith("l-");

type DeleteTarget =
  | { type: "module"; moduleIndex: number; title: string }
  | { type: "lesson"; moduleIndex: number; lessonIndex: number; title: string };

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

  const LESSON_KINDS = useMemo(() => [
    { value: "video", label: t("builder.lessonKinds.video") },
    { value: "quiz", label: t("builder.lessonKinds.quiz") },
    { value: "article", label: t("builder.lessonKinds.article") },
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

  // --- Curriculum state ---
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [savingCurriculum, setSavingCurriculum] = useState(false);

  // --- Delete confirmation state (shared for modules & lessons) ---
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

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
      setForm({
        title: course.title || "",
        price: String(course.price || 0),
        description: course.description || "",
        subtitle: course.subtitle || "",
        level: course.level || "beginner",
        language: course.language || "English",
        status: course.status || "draft",
        image_cover: course.image_cover || "",
        category_id: course.category_id || "",
      });
      setImagePreview(course.image_cover || "");
    }
  }, [course]);

  useEffect(() => {
    if (!course?.course?.id) {
      setLoadingModules(false);
      return;
    }
    (async () => {
      setLoadingModules(true);
      try {
        const mods = await resolvedModules(course.course.id);
        setModules(mods);
      } catch (err) {
        console.error("Failed to load curriculum:", err);
        setModules([]);
      } finally {
        setLoadingModules(false);
      }
    })();
  }, [course?.course?.id]);

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

  // --- Save course details only ---
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

  // --- Save curriculum only ---
  const saveCurriculum = async () => {
    if (!course?.course?.id) return;
    try {
      setSavingCurriculum(true);
      const normalized = modules.map((m, mi) => ({
        ...m,
        order_index: mi,
        lessons: (m.lessons || []).map((l, li) => ({ ...l, order_index: li })),
      }));
      await setStoredModules(course.course.id, normalized);
      const fresh = await resolvedModules(course.course.id);
      setModules(fresh);
      toast.success(t("builder.curriculumSaved"));
    } catch (err: any) {
      toast.error(err?.message || t("builder.curriculumSaveError"));
    } finally {
      setSavingCurriculum(false);
    }
  };

  const addModule = () => setModules((m:any) => [...m, {
    title: t("builder.newModuleName", { count: m.length + 1 }), order_index: m.length, lessons: [],
  }]);

  const addLesson = (mi: number) => setModules((m) => m.map((mod:any, i:any) =>
    i !== mi ? mod : { ...mod, lessons: [...(mod.lessons || []), {
      title: t("builder.newLessonName"),
      duration: "10 min",
      kind: "video" as const,
      content_url: "",
      order_index: (mod.lessons || []).length,
      is_preview: false,
    }]}));

  // --- Request delete (opens confirmation dialog) ---
  const requestRemoveModule = (mi: number) => {
    setDeleteTarget({ type: "module", moduleIndex: mi, title: modules[mi]?.title || t("builder.untitledModule") });
  };

  const requestRemoveLesson = (mi: number, li: number) => {
    setDeleteTarget({
      type: "lesson",
      moduleIndex: mi,
      lessonIndex: li,
      title: modules[mi]?.lessons?.[li]?.title || t("builder.untitledLesson"),
    });
  };

  // --- Confirmed delete, hits the server when the item is already persisted ---
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingItem(true);
    try {
      if (deleteTarget.type === "module") {
        const mod = modules[deleteTarget.moduleIndex];
        if (mod?.id && !isTempId(mod.id)) {
          await deleteStoredModule(mod.id);
        }
        setModules((m) => m.filter((_, i) => i !== deleteTarget.moduleIndex));
        toast.success(t("builder.moduleDeleted"));
      } else {
        const lesson = modules[deleteTarget.moduleIndex]?.lessons?.[deleteTarget.lessonIndex];
        if (lesson?.id && !isTempId(lesson.id)) {
          await deleteStoredLesson(lesson.id);
        }
        setModules((m) => m.map((mod, i) =>
          i !== deleteTarget.moduleIndex
            ? mod
            : { ...mod, lessons: mod.lessons.filter((_, j) => j !== deleteTarget.lessonIndex) }));
        toast.success(t("builder.lessonDeleted"));
      }
      setDeleteTarget(null);
    } catch (err) {
      toast.error(deleteTarget.type === "module" ? t("builder.moduleDeleteError") : t("builder.lessonDeleteError"));
    } finally {
      setIsDeletingItem(false);
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

      <Tabs defaultValue="curriculum" className="space-y-4">
        <TabsList>
          <TabsTrigger value="curriculum">{t("builder.tabs.curriculum")}</TabsTrigger>
          <TabsTrigger value="details">{t("builder.tabs.details")}</TabsTrigger>
        </TabsList>

        {/* ================= CURRICULUM ================= */}
        <TabsContent value="curriculum" className="space-y-4">
          <div className="flex justify-end">
            <Button disabled={savingCurriculum || loadingModules} onClick={saveCurriculum}>
              {savingCurriculum ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("common.saving")}</>
              ) : (
                <><Save className="mr-1.5 h-4 w-4" /> {t("builder.saveCurriculum")}</>
              )}
            </Button>
          </div>

          {loadingModules ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center border-border/60 shadow-card">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("builder.loadingCurriculum")}</p>
            </Card>
          ) : (
            <>
              {modules.map((mod, mi) => (
                <Card key={mod.id || mi} className="border-border/60 p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={mod.title}
                      onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? { ...m, title: e.target.value } : m))}
                      className="max-w-md font-semibold"
                    />
                    <Badge variant="outline" className="ml-auto">
                      {t("builder.lessonsCount", { count: (mod.lessons || []).length })}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => requestRemoveModule(mi)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-4 divide-y divide-border/60">
                    {(mod.lessons || []).map((l, li) => (
                      <div key={l.id || li} className="flex flex-wrap items-center gap-3 py-2">
                        {l.kind === "quiz" ? <ListChecks className="h-4 w-4 text-primary" /> : <FileVideo className="h-4 w-4 text-primary" />}
                        <Input
                          value={l.title}
                          onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? {
                            ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, title: e.target.value } : x),
                          } : m))}
                          className="flex-1 min-w-[140px]"
                        />
                        <Select
                          value={l.kind}
                          onValueChange={(v) => setModules((all) => all.map((m, i) => i === mi ? {
                            ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, kind: v as Lesson["kind"] } : x),
                          } : m))}
                        >
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LESSON_KINDS.map((k) => (
                              <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder={t("builder.contentUrlPlaceholder")}
                          value={l.content_url || ""}
                          onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? {
                            ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, content_url: e.target.value } : x),
                          } : m))}
                          className="w-40"
                        />
                        <Input
                          value={l.duration || ""}
                          onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? {
                            ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, duration: e.target.value } : x),
                          } : m))}
                          className="w-24"
                        />
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={!!l.is_preview}
                            onChange={(e) => setModules((all) => all.map((m, i) => i === mi ? {
                              ...m, lessons: m.lessons.map((x, j) => j === li ? { ...x, is_preview: e.target.checked } : x),
                            } : m))}
                          />
                          {t("builder.preview")}
                        </label>
                        <Button variant="ghost" size="icon" onClick={() => requestRemoveLesson(mi, li)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => addLesson(mi)}>
                    <Plus className="mr-1.5 h-4 w-4" /> {t("builder.addLesson")}
                  </Button>
                </Card>
              ))}
              <Button variant="outline" onClick={addModule}><Plus className="mr-1.5 h-4 w-4" /> {t("builder.addModule")}</Button>
            </>
          )}
        </TabsContent>

        {/* ================= DETAILS ================= */}
        <TabsContent value="details">
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
        </TabsContent>
      </Tabs>

      {/* ================= DELETE CONFIRMATION ================= */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeletingItem && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "module" ? t("builder.deleteModuleTitle") : t("builder.deleteLessonTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "module"
                ? t("builder.deleteModuleDesc", { title: deleteTarget?.title })
                : t("builder.deleteLessonDesc", { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingItem}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeletingItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingItem ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("common.deleting")}</>
              ) : (
                t("common.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}