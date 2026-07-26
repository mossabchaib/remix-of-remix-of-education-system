import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, History, UploadCloud } from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/admin/StatusPill";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { type Assignment, addSubmission, upsertAssignment } from "@/lib/lms-storage";
import { useAssignments } from "@/hooks/useTeacherData";
import { useSubmissions } from "@/hooks/useStudentData";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/student/assignments")({
  head: () => ({ meta: [{ title: "Assignments — Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Assignments,
});

function Assignments() {
  const items = useAssignments();
  const submissions = useSubmissions();
  const [note, setNote] = useState("");
  const [active, setActive] = useState<Assignment | null>(null);

  const submit = () => {
    if (!active) return;
    addSubmission(active.id, note.trim() || "(no notes)");
    upsertAssignment({ ...active, status: "Submitted" });
    toast.success("Assignment submitted");
    setActive(null);
    setNote("");
  };

  const pending = useMemo(() => items.filter((a) => a.status === "Pending"), [items]);
  const submitted = useMemo(() => items.filter((a) => a.status === "Submitted"), [items]);
  const graded = useMemo(() => items.filter((a) => a.status === "Graded"), [items]);

  return (
    <RoleDashboardLayout role="student">
      <PageHeader title="Assignments" description="Track your submissions and grades." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={String(pending.length)} icon={Clock} />
        <StatCard label="Submitted" value={String(submitted.length)} icon={UploadCloud} />
        <StatCard label="Graded" value={String(graded.length)} icon={CheckCircle2} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
          <TabsTrigger value="graded">Graded ({graded.length})</TabsTrigger>
        </TabsList>
        {[
          { v: "all", d: items },
          { v: "pending", d: pending },
          { v: "submitted", d: submitted },
          { v: "graded", d: graded },
        ].map((t) => (
          <TabsContent key={t.v} value={t.v}>
            <div className="grid gap-3">
              {t.d.map((a) => {
                const history = submissions[a.id] ?? [];
                return (
                  <Card key={a.id} className="border-border/60 p-4 shadow-card">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.course} · Due {a.due}</p>
                      </div>
                      <StatusPill value={a.status} />
                      {a.grade && <Badge variant="outline">Grade {a.grade}</Badge>}
                      <Dialog
                        open={active?.id === a.id}
                        onOpenChange={(o) => {
                          if (!o) { setActive(null); setNote(""); }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant={a.status === "Pending" ? "default" : "outline"}
                            onClick={() => setActive(a)}
                          >
                            {a.status === "Pending" ? "Submit" : "View"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{a.title}</DialogTitle>
                            <DialogDescription>{a.course} · Due {a.due}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            {a.status === "Pending" ? (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  Attach notes or a link to your work.
                                </p>
                                <Textarea
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                                  placeholder="Notes, links, or a description of your submission…"
                                  rows={5}
                                />
                                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                                  <UploadCloud className="h-4 w-4" /> Drop files here or click to browse
                                </div>
                              </>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <StatusPill value={a.status} />
                                  {a.grade && <Badge variant="outline">Grade {a.grade}</Badge>}
                                </div>
                                {history.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No submission history recorded.</p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      <History className="h-3 w-3" /> Submission history
                                    </p>
                                    {history.map((s) => (
                                      <div key={s.id} className="rounded-lg border border-border/60 p-3 text-sm">
                                        <p className="whitespace-pre-wrap">{s.notes}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                          {new Date(s.at).toLocaleString()}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setActive(null); setNote(""); }}>
                              Close
                            </Button>
                            {a.status === "Pending" && (
                              <Button onClick={submit}>Submit assignment</Button>
                            )}
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {history.length > 0 && a.status !== "Pending" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Last submitted {new Date(history[0].at).toLocaleString()} · {history.length} submission
                        {history.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </Card>
                );
              })}
              {t.d.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                  Nothing here.
                </p>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </RoleDashboardLayout>
  );
}
