import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { courses } from "@/lib/mock-data";
import { setCheckout } from "@/lib/lms-storage";

export const Route = createFileRoute("/checkout/$courseId")({
  loader: ({ params }) => {
    const course = courses.find((c) => c.id === params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: () => ({
    meta: [
      { title: "Checkout — Lumen" },
      { name: "description", content: "Review your order and continue to payment." },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Course not found</h1>
        <Button asChild className="mt-6"><Link to="/courses">Back to courses</Link></Button>
      </div>
    </SiteLayout>
  ),
  component: Checkout,
});

function Checkout() {
  const { course } = Route.useLoaderData();
  const navigate = useNavigate();
  const tax = Math.round(course.price * 0.08 * 100) / 100;
  const total = course.price + tax;

  function next() {
    setCheckout({ courseId: course.id, method: "Card" });
    navigate({ to: "/payment/$courseId", params: { courseId: course.id } });
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/courses/$id" params={{ id: course.id }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to course
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-muted-foreground">Review your order before continuing to payment.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="border-border/60 p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order items</h2>
            <div className="mt-4 flex items-start gap-4 border-b border-border/60 pb-4">
              <div className="h-16 w-24 shrink-0 rounded-md" style={{ backgroundImage: course.cover }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{course.category}</Badge>
                  <Badge variant="outline">{course.level}</Badge>
                </div>
                <p className="mt-1 font-semibold">{course.title}</p>
                <p className="text-xs text-muted-foreground">By {course.teacher}</p>
              </div>
              <p className="font-semibold">${course.price.toFixed(2)}</p>
            </div>
            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> 30-day refund guarantee · Lifetime access
            </p>
          </Card>

          <Card className="border-border/60 p-6 shadow-card h-fit">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={`$${course.price.toFixed(2)}`} />
              <Row label="Tax (8%)" value={`$${tax.toFixed(2)}`} />
              <div className="border-t border-border/60 pt-3 flex items-center justify-between text-base font-semibold">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </dl>
            <Button className="mt-5 w-full" size="lg" onClick={next}>Continue to payment</Button>
          </Card>
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-muted-foreground"><dt>{label}</dt><dd>{value}</dd></div>;
}
