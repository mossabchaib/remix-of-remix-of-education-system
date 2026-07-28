import { useState } from "react";
import { Video, Copy, ExternalLink, Users, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type LiveSession } from "@/lib/lms-storage";
import { joinSession } from "@/services/live";
import { toast } from "sonner";

interface JoinLiveModalProps {
  session: LiveSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinLiveModal({ session, open, onOpenChange }: JoinLiveModalProps) {
  const [copied, setCopied] = useState(false);
  if (!session) return null;

  const link = session.joinUrl ?? `https://meet.lumen-lms.app/room/${session.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Meeting link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleJoin = () => {
    joinSession(session); // يمر عبر الـ Service فقط: يسجل النشاط
    toast.success(`Joining ${session.title}…`);
    window.open(link, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
              <Video className="h-4 w-4" />
            </div>
            <DialogTitle>{session.title}</DialogTitle>
          </div>
          <DialogDescription>{session.course} · Hosted by {session.host}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {session.startsAt} · {session.duration}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {session.attendees} attendees expected
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
            <span className="flex-1 truncate text-xs">{link}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copied && <Badge variant="outline">Link copied</Badge>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleJoin} className="gap-2">
            <ExternalLink className="h-4 w-4" /> Join now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}