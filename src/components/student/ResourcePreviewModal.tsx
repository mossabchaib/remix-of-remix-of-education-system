import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileArchive, FileCode2, FileText, Video } from "lucide-react";
import type { Upload } from "@/lib/lms-storage";

const kindIcon = { video: Video, pdf: FileText, code: FileCode2, document: FileText, archive: FileArchive };
const kindLabel = { video: "Video", pdf: "PDF", code: "Source Code", document: "Document", archive: "Archive" };

export function ResourcePreviewModal({
  resource,
  open,
  onOpenChange,
  onDownload,
}: {
  resource: Upload | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDownload: (r: Upload) => void;
}) {
  if (!resource) return null;
  const Icon = kindIcon[resource.kind];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {resource.title}
          </DialogTitle>
          <DialogDescription>{resource.course}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{kindLabel[resource.kind]}</Badge>
          <Badge variant="outline">{resource.size}</Badge>
          <span className="text-xs text-muted-foreground self-center">Uploaded {resource.uploaded}</span>
        </div>

        {resource.description && (
          <p className="text-sm text-muted-foreground">{resource.description}</p>
        )}

        <div className="grid h-40 place-items-center rounded-lg border border-dashed border-border/60 bg-muted/30 text-sm text-muted-foreground">
          Preview not available — download to view full content
        </div>

        <DialogFooter>
          <Button onClick={() => onDownload(resource)}>
            <Download className="mr-1.5 h-4 w-4" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}