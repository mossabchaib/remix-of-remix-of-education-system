import { Download, PlayCircle, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type LiveSession, logActivity } from "@/lib/lms-storage";
import { toast } from "sonner";

interface RecordingPlayerModalProps {
  session: LiveSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordingPlayerModal({ session, open, onOpenChange }: RecordingPlayerModalProps) {
  if (!session) return null;

  const src = session.recordingUrl ?? null;

  const handleDownloadNote = () => {
    logActivity({ kind: "lesson", label: `Viewed recording · ${session.title}`, refId: session.id });
    toast.info("Transcript download will be available once processing finishes.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>{session.course} · Hosted by {session.host}</DialogDescription>
        </DialogHeader>

        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-black">
          {src ? (
            <video controls className="h-full w-full" src={src} />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <PlayCircle className="h-10 w-10 opacity-60" />
              <p className="text-sm">Recording is being processed and will be available soon.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Recorded {session.startsAt} · {session.duration}
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadNote}>
            <Download className="h-3.5 w-3.5" /> Transcript
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}