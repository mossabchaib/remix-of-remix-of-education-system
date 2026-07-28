import { useState } from "react";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AssignmentService } from "@/services";
import type { Assignment } from "@/lib/lms-storage";

type Props = {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SubmitAssignmentDialog({ assignment, open, onOpenChange }: Props) {
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!assignment) return null;

  function handleSubmit() {
    if (!assignment) return;
    AssignmentService.submit(assignment, notes);
    setSubmitted(true);
  }

  function handleClose(o: boolean) {
    if (!o) {
      setNotes("");
      setSubmitted(false);
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            {assignment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {assignment.course} · Due {assignment.due}
          </p>

          {submitted ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Your submission has been recorded.
            </div>
          ) : (
            <Textarea
              placeholder="Add a note or link to your work (optional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          {!submitted && (
            <Button onClick={handleSubmit}>
              <ClipboardList className="mr-1.5 h-4 w-4" /> Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}