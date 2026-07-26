import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Tags, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Category } from "@/lib/mock-data";
import { getAdminCategories, setAdminCategories } from "@/lib/lms-storage";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesAdmin,
});

function CategoriesAdmin() {
  const [rows, setRows] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  useEffect(() => { setRows(getAdminCategories()); }, []);
  useEffect(() => { if (rows.length) setAdminCategories(rows); }, [rows]);

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          {c.image ? (
            <img src={c.image} alt={c.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: c.color + "22", color: c.color }}>
              <Tags className="h-4 w-4" />
            </span>
          )}
          <div>
            <p className="text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "courses", header: "Courses", sortable: true },
    { key: "color", header: "Color", render: (c) => (
      <span className="inline-flex items-center gap-2 text-xs"><span className="h-4 w-4 rounded" style={{ background: c.color }} /> {c.color}</span>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group courses into browsable categories."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> New category</Button></DialogTrigger>
            <DialogContent>
              <Form
                initial={editing ?? undefined}
                onSubmit={(c) => {
                  if (editing) setRows((r) => r.map((x) => (x.id === editing.id ? { ...editing, ...c } : x)));
                  else setRows((r) => [{ ...c, id: `c${Date.now()}` } as Category, ...r]);
                  toast.success(editing ? "Category updated" : "Category created");
                  setOpen(false); setEditing(null);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable
        data={rows}
        columns={columns}
        searchKeys={["name","slug"]}
        onEdit={(c) => { setEditing(c); setOpen(true); }}
        onDelete={(c) => setRows((r) => r.filter((x) => x.id !== c.id))}
      />
    </>
  );
}

function Form({ initial, onSubmit }: { initial?: Category; onSubmit: (c: Omit<Category, "id">) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      toast.error("Image must be under 800KB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
        <DialogDescription>Give it a clear name, slug, and image.</DialogDescription>
      </DialogHeader>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, slug: slug || name.toLowerCase().replace(/\s+/g, "-"), color, image, courses: initial?.courses ?? 0 });
        }}
      >
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated" /></div>
        <div className="space-y-1.5">
          <Label>Image</Label>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg border border-border/60 bg-muted/40">
              {image ? (
                <img src={image} alt="preview" className="h-full w-full object-cover" />
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
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" /> {image ? "Replace" : "Upload"}
              </Button>
              {image && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setImage(undefined)}>
                  <X className="mr-1.5 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Color</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-24" /></div>
        <DialogFooter><Button type="submit">Save</Button></DialogFooter>
      </form>
    </>
  );
}
