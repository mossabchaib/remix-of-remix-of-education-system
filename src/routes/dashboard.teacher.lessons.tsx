import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileVideo, ListChecks, BookOpen, Plus, Loader2, Layers, Clock, ArrowUpRight, Trash2,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  resolvedModules, addStoredLesson, updateStoredLesson, deleteStoredLesson,
  setStoredModules, deleteStoredModule,
  getTeacherCourses, storageKeys, STORAGE_EVENT,
  type Module, type Lesson,
} from "@/lib/lms-storage";
import { toast } from "sonner";

// Minimal shape we rely on for a teacher's course. Kept local since the
// removed hook did not expose a dedicated type for it.
interface TeacherCourse {
  id: string;
  title: string;
}

type Row = Lesson & {
  course: string;
  courseId: string;
  module: string;
  moduleId: string;
};

type ModuleRow = {
  id: string;
  title: string;
  courseId: string;
  course: string;
  lessonsCount: number;
};

type ActiveTab = "lessons" | "modules";

// A module that hasn't been persisted yet (created locally, not yet saved)
// never has a real id — mirrors the same check used in the course builder
// when deciding whether an id is safe to send to the delete API.
const isTempId = (id?: string) => !!id && (id.startsWith("m-") || id.startsWith("l-"));

export const Route = createFileRoute("/dashboard/teacher/lessons")({
  head: () => ({ meta: [{ title: "Lessons — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Lessons,
});

function Lessons() {
  const { t } = useTranslation();

  const KIND_META: Record<Lesson["kind"], { label: string; icon: typeof FileVideo; className: string }> = {
    video: { label: t("teacherLessons.kind.video"), icon: FileVideo, className: "border-blue-500/30 bg-blue-500/10 text-blue-600" },
    reading: { label: t("teacherLessons.kind.reading"), icon: BookOpen, className: "border-violet-500/30 bg-violet-500/10 text-violet-600" },
  };

  // --- Tab switcher: Lessons view <-> Modules view ---
  const [activeTab, setActiveTab] = useState<ActiveTab>("lessons");

  // --- Courses: previously sourced from useTeacherCourses(), now read
  // directly from lms-storage and kept in sync via its storage events. ---
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        const result = await getTeacherCourses();
        if (!isMounted) return;
        const list: TeacherCourse[] = Array.isArray(result)
          ? result
          : (result as any)?.data || (result as any)?.courses || [];
        setCourses(list);
      } catch (err) {
        console.error("Failed to load teacher courses:", err);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setCoursesLoading(false);
      }
    }

    loadCourses();

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (!detail || detail.key === storageKeys.teacherCourses) loadCourses();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === storageKeys.teacherCourses) loadCourses();
    };

    window.addEventListener(STORAGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);

    return () => {
      isMounted = false;
      window.removeEventListener(STORAGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const [modulesByCourse, setModulesByCourse] = useState<Record<string, Module[]>>({});
  const [modulesLoading, setModulesLoading] = useState(true);

  // --- Lesson dialogs / loading ---
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Module dialogs / loading (mirrors the lesson state above) ---
  const [editingModule, setEditingModule] = useState<ModuleRow | null>(null);
  const [creatingModule, setCreatingModule] = useState(false);
  const [moduleDeleteTarget, setModuleDeleteTarget] = useState<ModuleRow | null>(null);
  const [savingModuleEdit, setSavingModuleEdit] = useState(false);
  const [savingModuleCreate, setSavingModuleCreate] = useState(false);
  const [deletingModule, setDeletingModule] = useState(false);

  // Shared loading gate for both tables: neither courses nor their
  // modules/lessons have finished loading yet.
  const loading = coursesLoading || modulesLoading;

  const loadCourseModules = async (courseId: string) => {
    const mods = await resolvedModules(courseId);
    setModulesByCourse((prev) => ({ ...prev, [courseId]: mods }));
    return mods;
  };

  useEffect(() => {
    if (coursesLoading) return;

    if (!courses.length) {
      setModulesByCourse({});
      setModulesLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setModulesLoading(true);
      try {
        const entries = await Promise.all(
          courses.map(async (c) => [c.id, await resolvedModules(c.id)] as const),
        );
        if (!cancelled) setModulesByCourse(Object.fromEntries(entries));
      } catch (err) {
        console.error("Failed to load lessons:", err);
        toast.error(t("teacherLessons.toast.loadFailed"));
      } finally {
        if (!cancelled) setModulesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [courses, coursesLoading, t]);

  // ================= LESSONS =================

  const rows = useMemo<Row[]>(() => {
    return courses.flatMap((c) =>
      (modulesByCourse[c.id] || []).flatMap((m) =>
        (m.lessons || []).map((l) => ({
          ...l, course: c.title, courseId: c.id, module: m.title, moduleId: m.id,
        })),
      ),
    );
  }, [courses, modulesByCourse]);

  const stats = useMemo(() => {
    const byKind = { video: 0, quiz: 0, reading: 0 } as Record<Lesson["kind"], number>;
    rows.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
    return { total: rows.length, ...byKind };
  }, [rows]);

  const moduleFilterOptionsForLessons = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.module) set.add(r.module); });
    return Array.from(set);
  }, [rows]);

  const cols: Column<Row>[] = [
    {
      key: "title", header: t("teacherLessons.table.lesson"), sortable: true, render: (r) => {
        const meta = KIND_META[r.kind] || KIND_META.video;
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2.5">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${meta.className}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{r.title}</p>
              {r.is_preview && (
                <span className="text-[11px] font-medium text-emerald-600">
                  {t("teacherLessons.freePreview")}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    { key: "course", header: t("teacherLessons.table.course"), sortable: true, render: (r) => (
      <span className="text-sm text-muted-foreground">{r.course}</span>
    ) },
    { key: "module", header: t("teacherLessons.table.module"), render: (r) => (
      <span className="text-sm text-muted-foreground">{r.module}</span>
    ) },
    { key: "kind", header: t("teacherLessons.table.type"), render: (r) => {
      const meta = KIND_META[r.kind] || KIND_META.video;
      return <Badge variant="outline" className={meta.className}>{meta.label}</Badge>;
    } },
    { key: "duration", header: t("teacherLessons.table.duration"), render: (r) => (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> {r.duration || "—"}
      </span>
    ) },
  ];

  async function saveEdit(next: Lesson) {
    if (!editing) return;
    try {
      setSavingEdit(true);
      await updateStoredLesson(editing.id, {
        title: next.title,
        duration: next.duration,
        kind: next.kind,
        content_url: next.content_url,
        is_preview: next.is_preview,
      });
      await loadCourseModules(editing.courseId);
      toast.success(t("teacherLessons.toast.updated"));
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.toast.updateFailed"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteStoredLesson(deleteTarget.id);
      await loadCourseModules(deleteTarget.courseId);
      toast.success(t("teacherLessons.toast.removed"));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.toast.removeFailed"));
    } finally {
      setDeleting(false);
    }
  }

  async function createLesson(payload: {
    courseId: string; moduleId: string; title: string; duration: string; kind: Lesson["kind"];
  }) {
    try {
      setSavingCreate(true);
      await addStoredLesson(payload.moduleId, {
        title: payload.title,
        duration: payload.duration,
        kind: payload.kind,
        content_url: "",
        is_preview: false,
      });
      await loadCourseModules(payload.courseId);
      toast.success(t("teacherLessons.toast.created"));
      setCreating(false);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.toast.createFailed"));
    } finally {
      setSavingCreate(false);
    }
  }

  // ================= MODULES =================
  // Same shape/flow as lessons: a flattened table, an edit dialog, a create
  // dialog, and a delete confirmation — all wired through resolvedModules /
  // setStoredModules / deleteStoredModule (there's no dedicated "add" or
  // "update" endpoint for a single module, so we read the course's current
  // modules, apply the change, and persist the whole list back).

  const moduleRows = useMemo<ModuleRow[]>(() => {
    return courses.flatMap((c) =>
      (modulesByCourse[c.id] || []).map((m) => ({
        id: m.id, title: m.title, courseId: c.id, course: c.title, lessonsCount: (m.lessons || []).length,
      })),
    );
  }, [courses, modulesByCourse]);

  const courseFilterOptionsForModules = useMemo(() => courses.map((c) => c.title), [courses]);

  const moduleCols: Column<ModuleRow>[] = [
    {
      key: "title", header: t("teacherLessons.modules.table.module"), sortable: true, render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600">
            <Layers className="h-4 w-4" />
          </span>
          <p className="truncate font-medium leading-tight">{r.title}</p>
        </div>
      ),
    },
    { key: "course", header: t("teacherLessons.modules.table.course"), sortable: true, render: (r) => (
      <span className="text-sm text-muted-foreground">{r.course}</span>
    ) },
    { key: "lessonsCount", header: t("teacherLessons.modules.table.lessons"), render: (r) => (
      <Badge variant="outline">{t("builder.lessonsCount", { count: r.lessonsCount })}</Badge>
    ) },
  ];

  async function saveModuleEdit(title: string) {
    if (!editingModule) return;
    try {
      setSavingModuleEdit(true);
      const mods = await resolvedModules(editingModule.courseId);
      const updated = mods.map((m) => (m.id === editingModule.id ? { ...m, title } : m));
      await setStoredModules(editingModule.courseId, updated);
      await loadCourseModules(editingModule.courseId);
      toast.success(t("teacherLessons.modules.toast.updated"));
      setEditingModule(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.modules.toast.updateFailed"));
    } finally {
      setSavingModuleEdit(false);
    }
  }

  async function confirmDeleteModule() {
    if (!moduleDeleteTarget) return;
    try {
      setDeletingModule(true);
      if (!isTempId(moduleDeleteTarget.id)) {
        await deleteStoredModule(moduleDeleteTarget.id);
      }
      await loadCourseModules(moduleDeleteTarget.courseId);
      toast.success(t("teacherLessons.modules.toast.removed"));
      setModuleDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.modules.toast.removeFailed"));
    } finally {
      setDeletingModule(false);
    }
  }

  async function createModule(payload: { courseId: string; title: string }) {
    try {
      setSavingModuleCreate(true);
      const mods = await resolvedModules(payload.courseId);
      const updated:any = [...mods, { title: payload.title, order_index: mods.length, lessons: [] }];
      await setStoredModules(payload.courseId, updated);
      await loadCourseModules(payload.courseId);
      toast.success(t("teacherLessons.modules.toast.created"));
      setCreatingModule(false);
    } catch (err: any) {
      toast.error(err?.message || t("teacherLessons.modules.toast.createFailed"));
    } finally {
      setSavingModuleCreate(false);
    }
  }

  const hasCourses = !!courses.length;

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacherLessons.title")}
        description={t("teacherLessons.description")}
        actions={
          activeTab === "lessons" ? (
            <Button onClick={() => setCreating(true)} disabled={!hasCourses}>
              <Plus className="mr-1.5 h-4 w-4" /> {t("teacherLessons.newLesson")}
            </Button>
          ) : (
            <Button onClick={() => setCreatingModule(true)} disabled={!hasCourses}>
              <Plus className="mr-1.5 h-4 w-4" /> {t("teacherLessons.modules.newModule")}
            </Button>
          )
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ListChecks className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.total")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{stats.total}</p>
        </Card>
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-blue-600">
            <FileVideo className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.videos")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{stats.video}</p>
        </Card>
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-violet-600">
            <BookOpen className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.articles")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{stats.reading}</p>
        </Card>
        <Card className="border-border/60 p-4 transition-colors hover:border-border">
          <div className="flex items-center gap-2 text-amber-600">
            <Layers className="h-4 w-4" /><span className="text-xs">{t("teacherLessons.stats.modules")}</span>
          </div>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{moduleRows.length}</p>
        </Card>
      </div>

      {/* Tab switcher: Lessons <-> Modules */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="lessons" className="gap-1.5">
            <ListChecks className="h-4 w-4" /> {t("teacherLessons.tabs.lessons")}
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5">
            <Layers className="h-4 w-4" /> {t("teacherLessons.tabs.modules")}
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <Card className="mt-4 flex flex-col items-center justify-center gap-3 border-border/60 p-16 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("teacherLessons.loading")}</p>
          </Card>
        ) : !hasCourses ? (
          <Card className="mt-4 flex flex-col items-center justify-center gap-2 border-dashed border-border/60 p-16 text-center">
            <Layers className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">{t("teacherLessons.emptyCourses.title")}</p>
            <p className="text-xs text-muted-foreground">{t("teacherLessons.emptyCourses.description")}</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/dashboard/teacher/courses">
                {t("teacherLessons.emptyCourses.cta")} <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>
        ) : (
          <>
            {/* ================= LESSONS TAB ================= */}
            <TabsContent value="lessons" className="mt-4">
              {!rows.length ? (
                <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-border/60 p-16 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">{t("teacherLessons.emptyLessons.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("teacherLessons.emptyLessons.description")}</p>
                  <Button size="sm" className="mt-2" onClick={() => setCreating(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> {t("teacherLessons.newLesson")}
                  </Button>
                </Card>
              ) : (
                <Card className="border-border/60 p-1 shadow-card">
                  <DataTable
                    data={rows} columns={cols} searchKeys={["title", "course"]}
                    filters={[
                      { key: "kind", label: t("teacherLessons.table.type"), options: ["video", "reading"] },
                      { key: "module", label: t("teacherLessons.table.module"), options: moduleFilterOptionsForLessons },
                    ]}
                    pageSize={10}
                    onEdit={(r) => setEditing(r)}
                    onDelete={(r) => setDeleteTarget(r)}
                  />
                </Card>
              )}
            </TabsContent>

            {/* ================= MODULES TAB ================= */}
            <TabsContent value="modules" className="mt-4">
              {!moduleRows.length ? (
                <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-border/60 p-16 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">{t("teacherLessons.modules.emptyModules.title")}</p>
                  <p className="text-xs text-muted-foreground">{t("teacherLessons.modules.emptyModules.description")}</p>
                  <Button size="sm" className="mt-2" onClick={() => setCreatingModule(true)}>
                    <Plus className="mr-1.5 h-4 w-4" /> {t("teacherLessons.modules.newModule")}
                  </Button>
                </Card>
              ) : (
                <Card className="border-border/60 p-1 shadow-card">
                  <DataTable
                    data={moduleRows} columns={moduleCols} searchKeys={["title", "course"]}
                    filters={[
                      { key: "course", label: t("teacherLessons.modules.table.course"), options: courseFilterOptionsForModules },
                    ]}
                    pageSize={10}
                    onEdit={(r) => setEditingModule(r)}
                    onDelete={(r) => setModuleDeleteTarget(r)}
                  />
                </Card>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* ================= LESSON DIALOGS ================= */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherLessons.editDialog.title")}</DialogTitle>
            <DialogDescription>{editing?.course} · {editing?.module}</DialogDescription>
          </DialogHeader>
          {editing && <LessonForm initial={editing} saving={savingEdit} onSubmit={saveEdit} t={t} />}
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherLessons.newDialog.title")}</DialogTitle>
            <DialogDescription>{t("teacherLessons.newDialog.description")}</DialogDescription>
          </DialogHeader>
          <NewLessonForm
            courses={courses}
            modulesByCourse={modulesByCourse}
            saving={savingCreate}
            onSubmit={createLesson}
            onOpenModuleManager={() => { setCreating(false); setCreatingModule(true); }}
            t={t}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherLessons.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherLessons.deleteDialog.description", { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("teacherLessons.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {deleting ? t("teacherLessons.deleteDialog.deleting") : t("teacherLessons.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================= MODULE DIALOGS ================= */}
      <Dialog open={!!editingModule} onOpenChange={(o) => !o && !savingModuleEdit && setEditingModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherLessons.modules.editDialog.title")}</DialogTitle>
            <DialogDescription>{editingModule?.course}</DialogDescription>
          </DialogHeader>
          {editingModule && (
            <ModuleEditForm
              initialTitle={editingModule.title}
              saving={savingModuleEdit}
              onSubmit={saveModuleEdit}
              t={t}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={creatingModule} onOpenChange={(o) => !o && !savingModuleCreate && setCreatingModule(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("teacherLessons.modules.newDialog.title")}</DialogTitle>
            <DialogDescription>{t("teacherLessons.modules.newDialog.description")}</DialogDescription>
          </DialogHeader>
          <NewModuleForm courses={courses} saving={savingModuleCreate} onSubmit={createModule} t={t} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!moduleDeleteTarget} onOpenChange={(o) => !o && !deletingModule && setModuleDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherLessons.modules.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherLessons.modules.deleteDialog.description", { title: moduleDeleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingModule}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDeleteModule(); }}
              disabled={deletingModule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingModule ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {deletingModule ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleDashboardLayout>
  );
}

function LessonForm({ initial, saving, onSubmit, t }: {
  initial: Lesson; saving: boolean; onSubmit: (l: Lesson) => void; t: (key: string) => string;
}) {
  const [f, setF] = useState<Lesson>(initial);
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(f); }}>
      <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.title")}</Label>
        <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.type")}</Label>
          <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as Lesson["kind"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t("teacherLessons.kind.video")}</SelectItem>
              <SelectItem value="reading">{t("teacherLessons.kind.reading")}</SelectItem>
              {/* <SelectItem value="quiz">{t("teacherLessons.kind.quiz")}</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.duration")}</Label>
          <Input
            value={f.duration || ""}
            onChange={(e) => setF({ ...f, duration: e.target.value })}
            placeholder={t("teacherLessons.form.durationPlaceholder")}
          />
        </div>
      </div>
      {/* <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.contentUrl")}</Label>
        <Input
          value={f.content_url || ""}
          onChange={(e) => setF({ ...f, content_url: e.target.value })}
          placeholder="https://..."
        />
      </div> */}
      {/* <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={!!f.is_preview}
          onChange={(e) => setF({ ...f, is_preview: e.target.checked })}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        {t("teacherLessons.form.allowPreview")}
      </label> */}
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {saving ? t("teacherLessons.form.saving") : t("teacherLessons.form.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function NewLessonForm({ courses, modulesByCourse, saving, onSubmit, onOpenModuleManager, t }: {
  courses: TeacherCourse[];
  modulesByCourse: Record<string, Module[]>;
  saving: boolean;
  onSubmit: (p: { courseId: string; moduleId: string; title: string; duration: string; kind: Lesson["kind"] }) => void;
  onOpenModuleManager: (courseId: string) => void;
  t: (key: string, opts?: any) => string;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const mods = courseId ? modulesByCourse[courseId] || [] : [];
  const [moduleId, setModuleId] = useState(mods[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("10 min");
  const [kind, setKind] = useState<Lesson["kind"]>("video");

  useEffect(() => {
    const list = courseId ? modulesByCourse[courseId] || [] : [];
    setModuleId(list[0]?.id ?? "");
  }, [courseId, modulesByCourse]);

  const noModules = !!courseId && mods.length === 0;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!moduleId) return;
        onSubmit({ courseId, moduleId, title, duration, kind });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.course")}</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.module")}</Label>
          <Select value={moduleId} onValueChange={setModuleId} disabled={noModules}>
            <SelectTrigger>
              <SelectValue placeholder={noModules ? t("teacherLessons.form.noModules") : undefined} />
            </SelectTrigger>
            <SelectContent>{mods.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {noModules && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span>{t("teacherLessons.form.noModulesHint")}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenModuleManager(courseId)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> {t("teacherLessons.form.addModule")}
          </Button>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.title")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder={t("teacherLessons.form.titlePlaceholder")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.type")}</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as Lesson["kind"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="video">{t("teacherLessons.kind.video")}</SelectItem>
              <SelectItem value="reading">{t("teacherLessons.kind.reading")}</SelectItem>
              {/* <SelectItem value="quiz">{t("teacherLessons.kind.quiz")}</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("teacherLessons.form.duration")}</Label>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder={t("teacherLessons.form.durationPlaceholder")}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || noModules}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {saving ? t("teacherLessons.form.creating") : t("teacherLessons.form.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}

// --- Module forms: mirror LessonForm / NewLessonForm above ---

function ModuleEditForm({ initialTitle, saving, onSubmit, t }: {
  initialTitle: string; saving: boolean; onSubmit: (title: string) => void; t: (key: string) => string;
}) {
  const [title, setTitle] = useState(initialTitle);
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(title); }}>
      <div className="space-y-1.5">
        <Label>{t("teacherLessons.modules.form.title")}</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {saving ? t("teacherLessons.modules.form.saving") : t("teacherLessons.modules.form.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function NewModuleForm({ courses, saving, onSubmit, t }: {
  courses: TeacherCourse[];
  saving: boolean;
  onSubmit: (p: { courseId: string; title: string }) => void;
  t: (key: string) => string;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [title, setTitle] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => { e.preventDefault(); onSubmit({ courseId, title }); }}
    >
      <div className="space-y-1.5">
        <Label>{t("teacherLessons.form.course")}</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t("teacherLessons.modules.form.title")}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder={t("teacherLessons.modules.form.titlePlaceholder")}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={saving || !courseId}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {saving ? t("teacherLessons.modules.form.creating") : t("teacherLessons.modules.form.create")}
        </Button>
      </DialogFooter>
    </form>
  );
}