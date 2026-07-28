import { useRef } from "react";
import { Award, Download, Printer, Share2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Certificate } from "@/lib/lms-storage";

type CertificateModalProps = {
  certificate: Certificate | null;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CertificateModal({
  certificate,
  studentName,
  open,
  onOpenChange,
}: CertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!certificate) return null;

  const handlePrint = () => {
    const node = printRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>${certificate.credential}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 40px; }
            .cert { border: 2px solid #1d4ed8; border-radius: 16px; padding: 48px; text-align: center; }
            .brand { color: #1d4ed8; letter-spacing: 4px; text-transform: uppercase; font-size: 12px; }
            .name { font-size: 32px; font-weight: 700; margin: 16px 0; }
            .course { font-size: 20px; font-weight: 600; margin-top: 4px; }
            .meta { margin-top: 32px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="cert">
            <div class="brand">Lumen LMS · Certificate of Completion</div>
            <p class="name">${studentName}</p>
            <p style="color:#666;font-size:13px;">has successfully completed</p>
            <p class="course">${certificate.course}</p>
            ${certificate.teacher ? `<p style="color:#666;font-size:13px;">Instructor: ${certificate.teacher}</p>` : ""}
            <div class="meta">
              Issued ${certificate.issued} &middot; Credential ${certificate.credential}
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownload = () => {
    const blob = new Blob(
      [
        `LUMEN LMS — Certificate of Completion\n\n` +
          `Awarded to: ${studentName}\n` +
          `Course: ${certificate.course}\n` +
          (certificate.teacher ? `Instructor: ${certificate.teacher}\n` : "") +
          `Credential: ${certificate.credential}\n` +
          `Issued: ${certificate.issued}\n`,
      ],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${certificate.credential}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Certificate downloaded");
  };

  const handleShare = async () => {
    const shareText = `${certificate.credential} · ${certificate.course}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Lumen Certificate", text: shareText });
        return;
      } catch {
        // user canceled — fall through to clipboard
      }
    }
    navigator.clipboard?.writeText(shareText);
    toast.success("Share link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="sr-only">Certificate preview</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="px-6">
          <div className="gradient-brand rounded-xl p-8 text-center text-primary-foreground">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest opacity-90">
              <Award className="h-4 w-4" /> Certificate of completion
            </div>
            <p className="mt-6 text-3xl font-semibold tracking-tight">{studentName}</p>
            <p className="mt-1 text-xs opacity-80">has successfully completed</p>
            <p className="mt-3 text-lg font-medium">{certificate.course}</p>
            {certificate.teacher && (
              <p className="mt-1 text-xs opacity-80">Instructor: {certificate.teacher}</p>
            )}
            <Badge className="mt-4 border-transparent bg-white/20 text-white hover:bg-white/20">
              Verified
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 p-4 text-xs text-muted-foreground">
          <div>
            <p>Issued {certificate.issued}</p>
            <p className="font-mono">{certificate.credential}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}