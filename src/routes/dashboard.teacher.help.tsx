import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen, GraduationCap, LifeBuoy, Mail, MessageSquare, PlayCircle, Rocket, Send, ShieldAlert,
} from "lucide-react";
import { RoleDashboardLayout } from "@/components/dashboard/RoleDashboardLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/teacher/help")({
  head: () => ({ meta: [{ title: "Help & Support — Teacher · Lumen" }, { name: "robots", content: "noindex" }] }),
  component: Help,
});

const faqs = [
  { q: "How do I create my first course?", a: "Open Create course from the sidebar, fill in the essentials, then use the course builder to add modules and lessons." },
  { q: "Where do uploads live?", a: "Videos and PDFs uploaded in the Uploads tab are stored against your account and automatically appear in the corresponding course lessons." },
  { q: "How do quizzes reach students?", a: "Any quiz you create is instantly available in the Student Dashboard for the linked course." },
  { q: "How is revenue calculated?", a: "Revenue combines the simulated catalog value (price × enrolled students per course) with real orders captured through the student checkout flow." },
  { q: "Can I archive a course?", a: "Yes — set the course status to Archived in the course builder. It will remain in your list but hidden from new students." },
  { q: "How do live sessions notify students?", a: "Scheduling a live session emits a notification and adds it to every enrolled student's calendar." },
];

const guides = [
  { title: "Getting started", icon: Rocket, body: "Set up your instructor profile, publish your first course, and invite students." },
  { title: "Course builder", icon: BookOpen, body: "Structure your course into modules and lessons, attach uploads, and mark prerequisites." },
  { title: "Assessments", icon: GraduationCap, body: "Create quizzes and assignments that flow directly into student dashboards and grade books." },
  { title: "Live teaching", icon: PlayCircle, body: "Schedule live sessions, share materials, and manage attendance." },
];

function Help() {
  const [contact, setContact] = useState({ subject: "", message: "" });
  const [report, setReport] = useState({ area: "", details: "" });

  return (
    <RoleDashboardLayout role="teacher">
      <PageHeader
        title="Help & Support"
        description="Answers, guides and a direct line to the Lumen team."
      />

      <Tabs defaultValue="faq" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="faq"><LifeBuoy className="mr-1.5 h-4 w-4" /> FAQ</TabsTrigger>
          <TabsTrigger value="contact"><Mail className="mr-1.5 h-4 w-4" /> Contact</TabsTrigger>
          <TabsTrigger value="report"><ShieldAlert className="mr-1.5 h-4 w-4" /> Report a problem</TabsTrigger>
          <TabsTrigger value="docs"><BookOpen className="mr-1.5 h-4 w-4" /> Documentation</TabsTrigger>
          <TabsTrigger value="guide"><Rocket className="mr-1.5 h-4 w-4" /> Platform guide</TabsTrigger>
          <TabsTrigger value="tutorials"><PlayCircle className="mr-1.5 h-4 w-4" /> Tutorials</TabsTrigger>
        </TabsList>

        <TabsContent value="faq">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">Frequently asked questions</p>
            <Accordion type="single" collapsible className="mt-4">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl">
            <p className="text-sm font-semibold">Contact support</p>
            <p className="text-xs text-muted-foreground">We typically reply within one business day.</p>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={contact.subject} onChange={(e) => setContact({ ...contact, subject: e.target.value })} placeholder="What can we help with?" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea rows={6} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} placeholder="Describe your question in detail" />
              </div>
              <Button onClick={() => { if (!contact.subject || !contact.message) { toast.error("Fill in both fields"); return; } toast.success("Message sent to support"); setContact({ subject: "", message: "" }); }}>
                <Send className="mr-1.5 h-4 w-4" /> Send
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card className="border-border/60 p-6 shadow-card max-w-2xl">
            <p className="text-sm font-semibold">Report a problem</p>
            <p className="text-xs text-muted-foreground">Bugs, broken uploads, unexpected errors — send details and we'll investigate.</p>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={report.area} onChange={(e) => setReport({ ...report, area: e.target.value })} placeholder="e.g. Course builder, Uploads, Live sessions" />
              </div>
              <div className="space-y-2">
                <Label>What happened?</Label>
                <Textarea rows={6} value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} placeholder="Steps to reproduce, expected result, actual result." />
              </div>
              <Button variant="outline" onClick={() => { if (!report.details) { toast.error("Add details first"); return; } toast.success("Report submitted — thank you!"); setReport({ area: "", details: "" }); }}>
                <ShieldAlert className="mr-1.5 h-4 w-4" /> Submit report
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">Documentation</p>
            <p className="text-xs text-muted-foreground">Reference material for every teacher workflow.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { t: "Course structure", d: "Modules, lessons, prerequisites and grading rules." },
                { t: "Uploads & media", d: "Supported formats, size limits and best practices." },
                { t: "Assessments API", d: "How quizzes and assignments feed grade books." },
                { t: "Notifications", d: "How students are notified of catalog changes." },
              ].map((d) => (
                <div key={d.t} className="rounded-lg border border-border/60 p-4">
                  <p className="text-sm font-semibold">{d.t}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{d.d}</p>
                  <Badge variant="outline" className="mt-3">Read more</Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">Platform guide</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guides.map((g) => (
                <div key={g.title} className="rounded-lg border border-border/60 p-4">
                  <div className="flex items-center gap-2 text-primary"><g.icon className="h-4 w-4" /><p className="text-sm font-semibold">{g.title}</p></div>
                  <p className="mt-2 text-xs text-muted-foreground">{g.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tutorials">
          <Card className="border-border/60 p-6 shadow-card">
            <p className="text-sm font-semibold">Tutorials</p>
            <p className="text-xs text-muted-foreground">Short video walkthroughs of every teacher workflow.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["Publish your first course", "Design a great quiz", "Run a live session", "Grade an assignment", "Analyze course performance", "Grow revenue"].map((t) => (
                <div key={t} className="overflow-hidden rounded-lg border border-border/60">
                  <div className="grid h-32 place-items-center bg-muted/30 text-muted-foreground">
                    <PlayCircle className="h-8 w-8" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{t}</p>
                    <p className="text-xs text-muted-foreground">4–8 min</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-border/60 p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Still stuck?</p>
            <p className="text-xs text-muted-foreground">Chat with a support engineer in real time.</p>
          </div>
          <Button onClick={() => toast.success("A support agent will join shortly")}>
            <MessageSquare className="mr-1.5 h-4 w-4" /> Start live chat
          </Button>
        </div>
      </Card>
    </RoleDashboardLayout>
  );
}
