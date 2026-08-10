import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Tags, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Data layer (lms-storage)
import {
  getAdminCategories,
  upsertCategory,
  deleteAdminCategory,
} from "@/lib/lms-storage";

// Category interface definition
export interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const { t } = useTranslation();

  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch categories from the API
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await getAdminCategories();

      const categoriesList = Array.isArray(data)
        ? data
        : data?.categories || data?.data || [];

      setRows(categoriesList);
    } catch (err: any) {
      console.error("Failed to load categories:", err);
      toast.error(err?.message || t("admin.categorie.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Create / update handler
  const handleSave = async (formData: Record<string, any>) => {
    try {
      // Explicitly include the id when updating an existing category
      const payload = editing ? { ...formData, id: editing.id } : formData;

      await upsertCategory(payload);

      toast.success(
        editing
          ? t("admin.categorie.toast.updated")
          : t("admin.categorie.toast.created")
      );
      setFormOpen(false);
      setEditing(null);

      await loadCategories();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || t("admin.categorie.errors.saveFailed"));
    }
  };

  // Delete handler, triggered after confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      await deleteAdminCategory(deleteTarget.id);
      setRows((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      toast.success(t("admin.categorie.toast.deleted"));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || t("admin.categorie.errors.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Table columns: Image -> Name -> Slug
  const columns: Column<Category>[] = [
    {
      key: "image",
      header: t("admin.categorie.table.image"),
      render: (category) => {
        const imgSrc = category.image_url || category.image;
        return imgSrc ? (
          <img
            src={imgSrc}
            alt={category.name}
            className="h-10 w-10 rounded-lg object-cover border border-border/50"
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Tags className="h-5 w-5" />
          </span>
        );
      },
    },
    {
      key: "name",
      header: t("admin.categorie.table.name"),
      sortable: true,
      render: (category) => (
        <span className="font-medium text-sm">{category.name}</span>
      ),
    },
    {
      key: "slug",
      header: t("admin.categorie.table.slug"),
      sortable: true,
      render: (category) => (
        <span className="text-xs text-muted-foreground font-mono">
          /{category.slug}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t("admin.categorie.title")}
        description={t("admin.categorie.description")}
        actions={
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("admin.categorie.actions.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CategoryForm
                initial={editing ?? undefined}
                onSubmit={handleSave}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={rows}
        columns={columns}
        searchKeys={["name", "slug"]}
        loading={loading}
        onEdit={(category) => {
          setEditing(category);
          setFormOpen(true);
        }}
        onDelete={(category) => setDeleteTarget(category)}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.categorie.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.categorie.deleteDialog.description", {
                name: deleteTarget?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("admin.categorie.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  {t("admin.categorie.deleteDialog.deleting")}
                </>
              ) : (
                t("admin.categorie.deleteDialog.confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Category create/edit form
function CategoryForm({
  initial,
  onSubmit,
}: {
  initial?: Category;
  onSubmit: (category: Record<string, any>) => Promise<void> | void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [image, setImage] = useState<string | undefined>(
    initial?.image_url || initial?.image
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form fields whenever a different category is being edited
  useEffect(() => {
    setName(initial?.name ?? "");
    setSlug(initial?.slug ?? "");
    setImage(initial?.image_url || initial?.image);
  }, [initial]);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      toast.error(t("admin.categorie.form.imageTooLarge"));
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...(initial?.id ? { id: initial.id } : {}),
        name,
        slug: slug || name.toLowerCase().trim().replace(/\s+/g, "-"),
        image_url: image,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {initial
            ? t("admin.categorie.form.editTitle")
            : t("admin.categorie.form.createTitle")}
        </DialogTitle>
        <DialogDescription>
          {initial
            ? t("admin.categorie.form.editDescription")
            : t("admin.categorie.form.createDescription")}
        </DialogDescription>
      </DialogHeader>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label>{t("admin.categorie.form.nameLabel")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("admin.categorie.form.namePlaceholder")}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("admin.categorie.form.slugLabel")}</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={t("admin.categorie.form.slugPlaceholder")}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("admin.categorie.form.imageLabel")}</Label>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/60 bg-muted/40">
              {image ? (
                <img
                  src={image}
                  alt={t("admin.categorie.form.imagePreviewAlt")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Tags className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-1 items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {image
                  ? t("admin.categorie.form.replaceImage")
                  : t("admin.categorie.form.uploadImage")}
              </Button>

              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImage(undefined)}
                >
                  <X className="mr-1.5 h-4 w-4" />
                  {t("admin.categorie.form.removeImage")}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("admin.categorie.form.imageHint")}
          </p>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                {t("admin.categorie.form.saving")}
              </>
            ) : initial ? (
              t("admin.categorie.form.updateButton")
            ) : (
              t("admin.categorie.form.saveButton")
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}