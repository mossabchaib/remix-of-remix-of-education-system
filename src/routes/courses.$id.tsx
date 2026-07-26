import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, BookOpen, Check, Clock, Globe, GraduationCap,
  Heart, PlayCircle, Star, Users, Award,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { courses } from "@/lib/mock-data";
import {
  addOrder, generateInvoice, generateOrderId, generateTxId,
  getEnrollments, getWishlist, setEnrollments, toggleWishlist,
} from "@/lib/lms-storage";


export const Route = createFileRoute("/courses/$id")({
  loader: ({ params }) => {
    const course = courses.find((c) => c.id === params.id);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.course.title} — Lumen` },
          { name: "description", content: loaderData.course.description },
          { property: "og:title", content: loaderData.course.title },
          { property: "og:description", content: loaderData.course.description },
        ]
      : [{ title: "Course not found — Lumen" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Course not found</h1>
        <p className="mt-2 text-muted-foreground">The course you're looking for doesn't exist.</p>
        <Button asChild className="mt-6"><Link to="/courses">Back to courses</Link></Button>
      </div>
    </SiteLayout>
  ),
  component: CourseDetail,
});

function CourseDetail() {
  const { course } = Route.useLoaderData();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState(() =>
    typeof window !== "undefined" && getEnrollments().includes(course.id),
  );
  const [wished, setWished] = useState(() =>
    typeof window !== "undefined" && getWishlist().includes(course.id),
  );

  const modules = Array.from({ length: 6 }, (_, i) => ({
    title: `Module ${i + 1}: ${["Foundations","Core concepts","Patterns in practice","Advanced techniques","Real-world project","Wrap-up & next steps"][i]}`,
    lessons: 4 + (i % 3),
  }));

  function onEnroll() {
    if (enrolled) {
      navigate({ to: "/dashboard/student/courses/$id", params: { id: course.id } });
      return;
    }
    if (course.price === 0) {
      const id = generateOrderId();
      addOrder({
        id,
        invoice: generateInvoice(),
        courseId: course.id,
        courseTitle: course.title,
        teacher: course.teacher,
        amount: 0,
        status: "paid",
        method: "Free enrollment",
        txId: generateTxId(),
        date: new Date().toISOString().slice(0, 10),
        buyerName: "Learner",
        buyerEmail: "learner@example.com",
      });
      const cur = getEnrollments();
      if (!cur.includes(course.id)) setEnrollments([...cur, course.id]);
      setEnrolled(true);
      toast.success("Enrolled — welcome aboard!");
      navigate({ to: "/orders/$id/confirmation", params: { id } });
    } else {
      navigate({ to: "/checkout/$courseId", params: { courseId: course.id } });
    }
  }

  function onWishlist() {
    const next = toggleWishlist(course.id);
    const inList = next.includes(course.id);
    setWished(inList);
    toast.success(inList ? "Added to wishlist" : "Removed from wishlist");
  }


  return (
    <SiteLayout>
      <section className="relative">
        <div className="h-56 sm:h-72 w-full" style={{ backgroundImage: course.cover }} />
        <div className="mx-auto -mt-24 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="border-border/60 p-6 sm:p-8 shadow-elegant">
              <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
                <Link to="/courses"><ArrowLeft className="mr-1.5 h-4 w-4" /> All courses</Link>
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge variant="outline">{course.level}</Badge>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
              <p className="mt-3 text-muted-foreground">{course.description}</p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-primary text-primary" /> <b className="text-foreground">{course.rating.toFixed(1)}</b> ({course.students.toLocaleString()} learners)</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {course.hours}h total</span>
                <span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4" /> {course.lessons} lessons</span>
                <span className="inline-flex items-center gap-1"><Globe className="h-4 w-4" /> English</span>
              </div>

              <Tabs defaultValue="overview" className="mt-8">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                  <TabsTrigger value="instructor">Instructor</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">What you'll learn</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      "Ship production-grade projects with confidence",
                      "Build a strong mental model of the fundamentals",
                      "Apply patterns used at leading companies",
                      "Communicate technical trade-offs with clarity",
                      "Optimize for performance and DX",
                      "Extend your work with a professional portfolio piece",
                    ].map((t) => (
                      <div key={t} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary-soft text-primary"><Check className="h-3 w-3" /></span>
                        {t}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="curriculum" className="mt-6 space-y-3">
                  {modules.map((m, i) => (
                    <Card key={i} className="border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.lessons} lessons · {m.lessons * 12} min</p>
                        </div>
                        <PlayCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="instructor" className="mt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {course.teacher.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{course.teacher}</p>
                      <p className="text-sm text-muted-foreground">Senior instructor · 12 courses</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    A practitioner with a decade of industry experience, dedicated to teaching that meets learners where they are.
                  </p>
                </TabsContent>
              </Tabs>
            </Card>

            <div className="space-y-4">
              <Card className="border-border/60 p-6 shadow-card">
                <p className="text-3xl font-semibold">{course.price === 0 ? "Free" : `$${course.price}`}</p>
                <p className="text-xs text-muted-foreground">One-time purchase · Lifetime access</p>
                <Button className="mt-5 w-full" size="lg" onClick={onEnroll}>
                  {enrolled ? "Go to my course" : course.price === 0 ? "Enroll for free" : "Buy course"}
                </Button>
                <Button variant="outline" className="mt-2 w-full" size="lg" onClick={onWishlist}>
                  <Heart className={"mr-1.5 h-4 w-4 " + (wished ? "fill-primary text-primary" : "")} />
                  {wished ? "In wishlist" : "Add to wishlist"}
                </Button>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    { icon: Clock, t: `${course.hours} hours on-demand` },
                    { icon: BookOpen, t: `${course.lessons} lessons` },
                    { icon: Award, t: "Certificate of completion" },
                    { icon: Users, t: "Access to student community" },
                    { icon: GraduationCap, t: "Learn at your own pace" },
                  ].map((r) => (
                    <li key={r.t} className="flex items-center gap-2 text-muted-foreground">
                      <r.icon className="h-4 w-4" /> {r.t}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <div className="h-24" />
    </SiteLayout>
  );
}
