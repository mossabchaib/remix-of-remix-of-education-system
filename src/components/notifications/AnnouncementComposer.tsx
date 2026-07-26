import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";
import { sendAnnouncement } from "@/lib/notification-events";
import type { NotifAudience } from "@/lib/lms-storage";
import { toast } from "sonner";

type ScopeKey = "all" | "role-student" | "role-teacher" | "course" | "user";

export function AnnouncementComposer({
  presetScopes,
  courseOptions = [],
  defaultScope = "role-student",
  trigger,
}: {
  presetScopes: ScopeKey[];
  courseOptions?: { id: string; title: string }[];
  defaultScope?: ScopeKey;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<ScopeKey>(defaultScope);
  const [courseId, setCourseId] = useState(courseOptions[0]?.id ?? "");
  const [userId, setUserId] = useState("");

  const label: Record<ScopeKey, string> = {
    all: "Everyone",
    "role-student": "All students",
    "role-teacher": "All teachers",
    course: "Students in a specific course",
    user: "A specific user (email)",
  };

  function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    let audience: NotifAudience;
    if (scope === "all") audience = { scope: "all" };
    else if (scope === "role-student") audience = { scope: "role", role: "student" };
    else if (scope === "role-teacher") audience = { scope: "role", role: "teacher" };
    else if (scope === "course") {
      if (!courseId) return toast.error("Pick a course");
      audience = { scope: "course", courseId };
    } else {
      if (!userId.trim()) return toast.error("Enter a user email");
      audience = { scope: "user", userId: userId.trim() };
    }
    sendAnnouncement({ title: title.trim(), body: body.trim(), audience });
    toast.success("Announcement sent");
    setTitle(""); setBody(""); setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button><Send className="mr-1.5 h-4 w-4" /> New announcement</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Send announcement</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Recipients</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as ScopeKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {presetScopes.map((s) => <SelectItem key={s} value={s}>{label[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {scope === "course" && courseOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courseOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {scope === "user" && (
            <div className="space-y-1.5">
              <Label>User email</Label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="learner@example.com" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Live class rescheduled" />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}><Send className="mr-1.5 h-4 w-4" /> Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
