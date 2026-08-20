import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Loader2, Save, Sparkles, Upload, X } from "lucide-react";
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
import { getAdminCategories, upsertTeacherCourse } from "@/lib/lms-storage";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/courses/new")({
  head: () => ({ meta: [{ title: "Create course — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: CreateCourse,
});

const COVER_GRADIENTS = [
  "linear-gradient(135deg,#3b82f6,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#22d3ee)",
  "linear-gradient(135deg,#6366f1,#ec4899)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
];

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type SaveStatus = "draft" | "published";

function CreateCourse() {
  const nav = useNavigate();
  const { t } = useTranslation();

  const LEVELS = [
    { value: "beginner", label: t("teacher.levels.beginner") },
    { value: "intermediate", label: t("teacher.levels.intermediate") },
    { value: "advanced", label: t("teacher.levels.advanced") },
  ];

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [savingStatus, setSavingStatus] = useState<SaveStatus | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    category_id: "",
    level: "beginner",
    description: "",
    language: "English",
    image_cover: "",
    price: "",
  });

  useEffect(() => {
    async function fetchCategories() {
      setIsLoadingCategories(true);
      try {
        const res: any = await getAdminCategories();
        const data = Array.isArray(res) ? res : res?.categories || [];
        setCategoriesList(data);
        if (data.length > 0) {
          setForm((prev) => ({ ...prev, category_id: data[0].id }));
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        toast.error(t("teacher.categoriesLoadError"));
      } finally {
        setIsLoadingCategories(false);
      }
    }
    fetchCategories();
  }, [t]);

  // Convert the uploaded image to Base64 so it can be sent to the backend directly.
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("teacher.invalidImageType"));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t("teacher.imageTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((prev) => ({ ...prev, image_cover: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview("");
    setForm((prev) => ({ ...prev, image_cover: "" }));
  };

  // Only digits (and empty string) are allowed; DA prices are whole numbers.
  const handlePriceChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "");
    setForm((prev) => ({ ...prev, price: cleaned }));
  };

  const handleSave = async (status: SaveStatus) => {
    if (!form.title.trim()) {
      toast.error(t("teacher.titleRequired"));
      return;
    }

    const parsedPrice = form.price.trim() === "" ? 0 : Number(form.price);
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error(t("teacher.invalidPrice", "Please enter a valid price"));
      return;
    }

    try {
      setSavingStatus(status);
      const payload = {
        title: form.title,
        slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        subtitle: form.subtitle,
        description: form.description,
        category_id: form.category_id,
        level: form.level,
        language: form.language,
        price: parsedPrice,
        status,
        image_cover: form.image_cover || COVER_GRADIENTS[0],
      };

      const res: any = await upsertTeacherCourse(payload);
      const createdId = res?.id || res?.data?.id;

      toast.success(status === "published" ? t("teacher.coursePublished") : t("teacher.courseSavedDraft"));
      if (createdId) {
        nav({ to: "/dashboard/teacher/courses/$id", params: { id: createdId } });
      } else {
        nav({ to: "/dashboard/teacher/courses" });
      }
    } catch (err: any) {
      console.error("Error creating course:", err);
      toast.error(err?.message || t("teacher.createCourseError"));
    } finally {
      setSavingStatus(null);
    }
  };

  const isSaving = savingStatus !== null;

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title={t("teacher.createCourse")}
        description={t("teacher.createCourseDesc")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled={isSaving} onClick={() => handleSave("draft")}>
              {savingStatus === "draft" ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("teacher.savingDraft")}</>
              ) : (
                t("teacher.saveDraft")
              )}
            </Button>
            <Button disabled={isSaving} onClick={() => handleSave("published")}>
              {savingStatus === "published" ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t("teacher.publishing")}</>
              ) : (
                <><Save className="mr-1.5 h-4 w-4" /> {t("teacher.publish")}</>
              )}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Core course information */}
        <Card className="border-border/60 p-6 shadow-card space-y-5 bg-card">
          <div className="space-y-2">
            <Label className="font-medium">{t("teacher.courseTitle")}</Label>
            <Input
              placeholder={t("teacher.courseTitlePlaceholder")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">{t("teacher.courseSubtitle")}</Label>
            <Input
              placeholder={t("teacher.courseSubtitlePlaceholder")}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-medium">{t("teacher.courseCategory")}</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
                disabled={isLoadingCategories}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingCategories ? t("teacher.loadingCategories") : t("teacher.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">{t("teacher.courseLevel")}</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((lvl) => (
                    <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">{t("teacher.courseLanguage")}</Label>
              <Input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">{t("teacher.coursePrice", "Price")}</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="pe-12"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground">
                  {t("common.currency", "DA")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("teacher.coursePriceHint", "Leave at 0 to publish this course for free.")}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-medium">{t("teacher.courseDescription")}</Label>
            <Textarea
              rows={6}
              placeholder={t("teacher.courseDescriptionPlaceholder")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </Card>

        {/* Cover image upload and tips */}
        <div className="space-y-5">
          <Card className="border-border/60 p-6 shadow-card space-y-3 bg-card">
            <p className="text-sm font-semibold">{t("teacher.coverImage")}</p>

            <div className="relative group overflow-hidden rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/30 transition-all flex flex-col items-center justify-center h-48">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    aria-label={t("teacher.removeImage")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground shadow-sm transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-4 text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-2 group-hover:scale-105 transition-transform">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-foreground">{t("teacher.coverImageHint")}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t("teacher.coverImageSizeHint")}</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </Card>

          <Card className="border-border/60 p-6 shadow-card bg-card/50">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="h-4 w-4" />
              <p className="text-sm font-semibold">{t("teacher.tips")}</p>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4 leading-relaxed">
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