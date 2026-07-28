import { useState } from "react";
import { Video, Users, Clock, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LiveService } from "@/services";
import type { LiveSession } from "@/lib/lms-storage";

type Props = {
  session: LiveSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JoinLiveSessionDialog({ session, open, onOpenChange }: Props) {
  const [joined, setJoined] = useState(false);

  if (!session) return null;

  const alreadyJoined = joined || LiveService.hasJoined(session.id);

  function handleJoin() {
    if (!session) return;
    LiveService.join(session);
    setJoined(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            {session.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Hosted by <span className="text-foreground font-medium">{session.host}</span></p>
          <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {session.startsAt} · {session.duration}</p>
          <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {session.attendees} attending</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {alreadyJoined ? (
            <Button disabled>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> You're in
            </Button>
          ) : (
            <Button onClick={handleJoin}>
              <Video className="mr-1.5 h-4 w-4" /> Join session
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}