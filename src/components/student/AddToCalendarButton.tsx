import { CalendarPlus, Bell, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type LiveSession } from "@/lib/lms-storage";
import { setReminder, buildICSDataUrl } from "@/services/live";
import { useLiveReminders } from "@/hooks/useTeacherData";
import { toast } from "sonner";

interface AddToCalendarModalProps {
  session: LiveSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToCalendarModal({ session, open, onOpenChange }: AddToCalendarModalProps) {
  // الـ hook يُستدعى دائماً بدون شرط (قاعدة Hooks) — القراءة عبر lms:storage-change تلقائياً
  const reminders = useLiveReminders();

  if (!session) return null;

  const reminderOn = reminders.includes(session.id);

  const handleToggle = (checked: boolean) => {
    setReminder(session, checked); // الكتابة فقط عبر LiveService، لا حاجة لـ setState محلي
    toast.success(checked ? "In-app reminder enabled" : "Reminder removed");
  };

  const handleDownloadIcs = () => {
    const url = buildICSDataUrl(session);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    toast.success("Calendar file downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to calendar</DialogTitle>
          <DialogDescription>{session.title} · {session.startsAt}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4 text-primary" /> In-app reminder
            </div>
            <Switch checked={reminderOn} onCheckedChange={handleToggle} />
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleDownloadIcs}>
            <Download className="h-4 w-4" /> Download .ics for Google/Outlook/Apple Calendar
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}